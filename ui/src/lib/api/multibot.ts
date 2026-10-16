import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 多机器人面板(freqUI multi-bot parity 的取舍实现):
 * - 机器人注册表持久化在浏览器 localStorage(与 freqUI 同款安全模型);
 * - 主 UI 仍由机器人自身伺服、单会话;本模块只服务 /bots 对比监控,
 *   不做全局机器人切换器(架构不匹配,见工作单据边界);
 * - 跨源访问要求目标机器人配置 api_server.CORS_origins 包含本页面源。
 */

export interface BotDescriptor {
  id: string;
  name: string;
  /** 如 http://127.0.0.1:8081(不带尾斜杠) */
  apiUrl: string;
  username: string;
  password: string;
}

interface BotRegistryState {
  bots: BotDescriptor[];
  addBot: (b: BotDescriptor) => void;
  updateBot: (b: BotDescriptor) => void;
  removeBot: (id: string) => void;
}

export const useBotRegistry = create<BotRegistryState>()(
  persist(
    (set) => ({
      bots: [],
      addBot: (b) => set((s) => ({ bots: [...s.bots.filter((x) => x.id !== b.id), b] })),
      updateBot: (b) => {
        // 凭据可能变化,旧 token 一并作废
        tokenCache.delete(b.id);
        return set((s) => ({ bots: s.bots.map((x) => (x.id === b.id ? b : x)) }));
      },
      removeBot: (id) => {
        tokenCache.delete(id);
        return set((s) => ({ bots: s.bots.filter((x) => x.id !== id) }));
      },
    }),
    { name: "freqtrade-ui-bots" },
  ),
);

/* ------------------------- 跨源客户端 ------------------------- */

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 令牌缓存仅驻留内存(密码已持久化,令牌没必要再落盘)。 */
const tokenCache = new Map<string, TokenPair>();

/** 登录请求 in-flight 去重:冷启动 4 个端点并发时只登录一次。 */
const loginInflight = new Map<string, Promise<TokenPair>>();

/** 非安全上下文(http://局域网IP)没有 crypto.randomUUID,用 getRandomValues 兜底。 */
export function genId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class BotApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const normalizeUrl = (apiUrl: string) => {
  // 剥离可能误粘进地址的 userinfo(http://user:pass@host),避免凭据被持久化/渲染
  try {
    const u = new URL(apiUrl);
    u.username = "";
    u.password = "";
    return u.origin + u.pathname.replace(/\/+$/, "");
  } catch {
    return apiUrl.replace(/\/+$/, "");
  }
};

/** freqtrade Basic 以 ASCII 解码;非 ASCII 凭证在浏览器侧先拦下,给出正确提示。 */
function assertAsciiCredentials(username: string, password: string) {
  const nonAscii = [...`${username}:${password}`].some((c) => (c.codePointAt(0) ?? 0) > 0x7f);
  if (nonAscii) {
    throw new BotApiError("freqtrade 的 HTTP Basic 认证仅支持 ASCII 字符,用户名/密码含非 ASCII 字符。");
  }
}

/** 网络层失败(CORS 拦截/断网/目标离线)统一翻译成可操作提示。 */
function wrapNetworkError(e: unknown): never {
  if (e instanceof BotApiError) throw e;
  throw new BotApiError(
    "无法连接——确认目标机器人在线,且其配置 api_server.CORS_origins 已包含本页面源(跨源浏览器请求会被 CORS 拦截)。",
  );
}

async function botLogin(bot: BotDescriptor): Promise<TokenPair> {
  assertAsciiCredentials(bot.username, bot.password);
  const inflight = loginInflight.get(bot.id);
  if (inflight) return inflight;
  const p = (async () => {
    let res: Response;
    try {
      res = await fetch(`${normalizeUrl(bot.apiUrl)}/api/v1/token/login`, {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${bot.username}:${bot.password}`)}` },
      });
    } catch (e) {
      wrapNetworkError(e);
    }
    if (!res!.ok) {
      throw new BotApiError(`登录失败 (HTTP ${res!.status})——检查用户名密码`, res!.status);
    }
    const data = (await res!.json()) as { access_token: string; refresh_token: string };
    const tokens = { accessToken: data.access_token, refreshToken: data.refresh_token };
    tokenCache.set(bot.id, tokens);
    return tokens;
  })();
  loginInflight.set(bot.id, p);
  try {
    return await p;
  } finally {
    loginInflight.delete(bot.id);
  }
}

async function botRefresh(bot: BotDescriptor, refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${normalizeUrl(bot.apiUrl)}/api/v1/token/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    const tokens = { accessToken: data.access_token, refreshToken };
    tokenCache.set(bot.id, tokens);
    return tokens;
  } catch {
    return null;
  }
}

/** 对目标机器人发一次已认证 GET;401 时刷新/重登后重试一次。 */
export async function botApi<T>(bot: BotDescriptor, path: string): Promise<T> {
  let tokens = tokenCache.get(bot.id) ?? (await botLogin(bot));
  const call = async (accessToken: string) => {
    try {
      return await fetch(`${normalizeUrl(bot.apiUrl)}/api/v1${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      wrapNetworkError(e);
    }
  };
  let res = await call(tokens.accessToken);
  if (res!.status === 401) {
    const refreshed = await botRefresh(bot, tokens.refreshToken);
    tokens = refreshed ?? (await botLogin(bot));
    res = await call(tokens.accessToken);
  }
  if (!res!.ok) {
    const body = await res!.text().catch(() => "");
    let detail = body;
    try {
      detail = JSON.parse(body).detail ?? body;
    } catch {
      /* 非 JSON */
    }
    throw new BotApiError(`${path} 请求失败 (HTTP ${res!.status})${detail ? `:${detail}` : ""}`, res!.status);
  }
  return (await res!.json()) as T;
}

/** 新增机器人前的连通性测试(登录 + 一次轻量读)。 */
export async function testBotConnection(bot: BotDescriptor): Promise<string> {
  await botLogin(bot);
  const version = await botApi<{ version: string }>(bot, "/version");
  return version.version;
}

/** 对比行所需的汇总数据;webserver 模式的机器人多数交易端点 503,字段降级为 null。 */
export interface BotSummary {
  botName: string;
  state: string;
  dryRun: boolean;
  openTrades: number | null;
  closedProfit: number | null;
  allProfit: number | null;
  tradeCount: number | null;
  balanceTotal: number | null;
  stake: string;
}

export async function fetchBotSummary(bot: BotDescriptor): Promise<BotSummary> {
  // webserver 模式的机器人只有 show_config/version 等只读端点可用,
  // trading 端点( status/profit/balance )503——逐字段降级,不整行报错
  const [configR, statusR, profitR, balanceR] = await Promise.allSettled([
    botApi<{ bot_name?: string; state: string; dry_run: boolean }>(bot, "/show_config"),
    botApi<unknown[]>(bot, "/status"),
    botApi<{ profit_closed_coin: number; profit_all_coin: number; trade_count: number }>(
      bot,
      "/profit",
    ),
    botApi<{ total: number; stake: string }>(bot, "/balance"),
  ]);
  // 四个全挂才视为连接失败(行级错误)
  if (configR.status === "rejected" && profitR.status === "rejected") {
    throw configR.reason instanceof Error ? configR.reason : new Error(String(configR.reason));
  }
  const config = configR.status === "fulfilled" ? configR.value : null;
  const status = statusR.status === "fulfilled" ? statusR.value : null;
  const profit = profitR.status === "fulfilled" ? profitR.value : null;
  const balance = balanceR.status === "fulfilled" ? balanceR.value : null;
  return {
    botName: config?.bot_name ?? bot.name,
    // webserver 模式 show_config.state 为空串——空串落「未知」(muted)而非红色「已停止」
    state: config?.state || "unknown",
    dryRun: config?.dry_run ?? false,
    openTrades: Array.isArray(status) ? status.length : null,
    closedProfit: profit?.profit_closed_coin ?? null,
    allProfit: profit?.profit_all_coin ?? null,
    tradeCount: profit?.trade_count ?? null,
    balanceTotal: balance?.total ?? null,
    stake: balance?.stake ?? "",
  };
}
