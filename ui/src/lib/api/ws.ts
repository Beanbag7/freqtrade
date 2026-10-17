/**
 * WebSocket live updates: connects to /api/v1/message/ws with the JWT access
 * token and turns freqtrade RPC broadcast messages into react-query
 * invalidations, so open trades / balances / whitelist refresh instantly
 * instead of waiting for the next polling tick.
 *
 * Reconnects with capped exponential backoff. The access token expires after
 * 15 minutes, so every (re)connect re-reads the token from the auth store;
 * a policy-violation close (stale token) triggers an explicit token refresh
 * before the next attempt.
 */
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth";
import { refreshOnce } from "@/lib/api/client";
import { useUiSettings } from "@/lib/settings";
import { formatPct, formatPrice } from "@/lib/utils";

const BASE = "/api/v1";

/**
 * freqtrade only forwards message types the channel explicitly subscribed
 * to (channel_broadcaster filters via channel.subscribed_to) — so this list
 * must cover every type we react to, not just the no-echo ones.
 */
const SUBSCRIPTIONS = [
  "new_candle",
  "whitelist",
  "entry",
  "entry_fill",
  "entry_cancel",
  "exit",
  "exit_fill",
  "exit_cancel",
  "protection_trigger",
  "protection_trigger_global",
  "liquidation_warning",
];

/** queryKey prefixes invalidated per broadcast message type。 */
const INVALIDATE_MAP: Record<string, string[]> = {
  entry: ["status", "trades", "count", "balance", "profit", "performance", "entries", "stats"],
  entry_fill: ["status", "trades", "count", "balance", "profit", "performance", "entries", "stats"],
  entry_cancel: ["status", "count"],
  exit: ["status", "trades", "count", "balance", "profit", "performance", "exits", "stats", "locks"],
  exit_fill: ["status", "trades", "count", "balance", "profit", "performance", "exits", "stats", "locks"],
  exit_cancel: ["status", "count"],
  protection_trigger: ["locks", "show_config", "status"],
  protection_trigger_global: ["locks", "show_config", "status"],
  whitelist: ["whitelist"],
  // new_candle 不在这张表里:走 onmessage 里的设置门控(尊重 K 线页「自动刷新」开关)
};

interface WsMessage {
  type?: string;
  data?: Record<string, unknown>;
  /** 交易事件广播为扁平载荷,字段在顶层(entry_fill 等,见 freqtradebot 的 msg 组装)。 */
  [key: string]: unknown;
}

function toastTradeEvent(msg: WsMessage) {
  // 交易事件广播是扁平载荷;白名单等请求-响应式消息才有 data 包裹。两种都兼容。
  const d = (msg.data && typeof msg.data === "object" ? msg.data : msg) as Record<string, unknown>;
  const pair = typeof d.pair === "string" ? d.pair : "?";
  const rate =
    typeof d.close_rate === "number"
      ? d.close_rate
      : typeof d.open_rate === "number"
        ? d.open_rate
        : typeof d.rate === "number"
          ? d.rate
          : null;
  const direction = d.direction === "Short" ? "做空" : "做多";
  switch (msg.type) {
    case "entry":
    case "entry_fill":
      toast.success(`${direction}开仓 ${pair}`, {
        description: rate !== null ? `价格 ${formatPrice(rate)}` : undefined,
      });
      break;
    case "exit":
    case "exit_fill": {
      const profit = typeof d.profit_ratio === "number" ? formatPct(d.profit_ratio * 100) : "";
      toast.info(`平仓 ${pair}`, {
        description: [rate !== null && `成交价 ${formatPrice(rate)}`, profit && `收益 ${profit}`]
          .filter(Boolean)
          .join(" · "),
      });
      break;
    }
    case "liquidation_warning": {
      // 强平预警:安全信号,必须可见(freqUI parity;此前订阅了但没有消费)
      const liq = typeof d.liquidation_price === "number" ? formatPrice(d.liquidation_price) : null;
      toast.warning(`强平预警 ${pair}`, {
        description: liq ? `强平价 ${liq}` : undefined,
      });
      break;
    }
    default:
      break;
  }
}

class LiveSocket {
  private ws: WebSocket | null = null;
  private qc: QueryClient | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private stopped = true;
  private messageCount = 0;

  /** Debug handle (like window.__ftChart) for live verification. */
  private publishDebug() {
    (window as unknown as Record<string, unknown>).__ftWs = {
      state: this.ws?.readyState ?? WebSocket.CLOSED,
      attempts: this.attempts,
      messages: this.messageCount,
    };
  }

  start(qc: QueryClient) {
    this.qc = qc;
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= WebSocket.OPEN) {
      ws.onclose = null;
      ws.close(1000, "logout");
    }
  }

  private connect() {
    if (this.stopped) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}${BASE}/message/ws?token=${token}`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      ws.send(JSON.stringify({ type: "subscribe", data: SUBSCRIPTIONS }));
      // Round-trip request: server answers with the current whitelist right
      // away, which also proves the channel works in both directions.
      ws.send(JSON.stringify({ type: "whitelist" }));
      this.publishDebug();
    };

    ws.onmessage = (event) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(String(event.data)) as WsMessage;
      } catch {
        return;
      }
      if (!msg.type) return;
      this.messageCount += 1;
      this.publishDebug();
      // new_candle 走设置门控:K 线页「自动刷新」关闭时,WS 也不得绕过触发 refetch
      if (msg.type === "new_candle") {
        if (useUiSettings.getState().chartAutoRefresh) {
          this.qc?.invalidateQueries({ queryKey: ["pair_candles"] });
        }
      } else {
        const keys = INVALIDATE_MAP[msg.type];
        if (keys && this.qc) {
          for (const key of keys) this.qc.invalidateQueries({ queryKey: [key] });
        }
      }
      toastTradeEvent(msg);
    };

    ws.onclose = (event) => {
      this.ws = null;
      this.publishDebug();
      if (this.stopped) return;
      // 1008 = policy violation → token rejected;与 REST 401 共用单飞刷新锁
      if (event.code === 1008) void refreshOnce();
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose follows and handles the reconnect.
    };
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    const delay = Math.min(1_000 * 2 ** this.attempts, 30_000);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

const liveSocket = new LiveSocket();

/**
 * Mount once in the app shell: keeps the live-update channel alive for the
 * whole authenticated session.
 */
export function useLiveUpdates() {
  const qc = useQueryClient();
  useEffect(() => {
    liveSocket.start(qc);
    return () => liveSocket.stop();
  }, [qc]);
}
