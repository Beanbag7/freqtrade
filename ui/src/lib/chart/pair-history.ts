/**
 * Shared mapping from freqtrade PairHistory responses (strategy-analyzed
 * candles, GET /pair_candles or POST /pair_history) to klinecharts bars plus
 * strategy entry/exit signal markers.
 */
import type { KLineData } from "klinecharts";
import type { PairHistory } from "@/lib/api/types";
import type { SignalMarker } from "@/components/chart/candle-chart";
import type { TradeMarkerKind } from "@/lib/chart/overlays";

export interface MappedCandles {
  bars: KLineData[];
  signals: SignalMarker[];
}

export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Map freqtrade PairHistory rows to klinecharts bars + strategy signal markers. */
export function mapPairHistory(history: PairHistory | undefined): MappedCandles {
  if (!history) return { bars: [], signals: [] };
  const cols = history.columns;
  const idx = (name: string) => cols.indexOf(name);
  const iTs = idx("__date_ts");
  const iOpen = idx("open");
  const iHigh = idx("high");
  const iLow = idx("low");
  const iClose = idx("close");
  const iVol = idx("volume");
  if (iTs < 0 || iOpen < 0 || iClose < 0) return { bars: [], signals: [] };

  const up = cssVar("--chart-up", "#245b47");
  const down = cssVar("--chart-down", "#b96359");
  const muted = cssVar("--muted-foreground", "#52645a");

  const bars: KLineData[] = [];
  const signals: SignalMarker[] = [];
  const signalCols: { i: number; kind: TradeMarkerKind; color: string }[] = [
    { i: idx("_enter_long_signal_close"), kind: "open-long", color: up },
    { i: idx("_exit_long_signal_close"), kind: "close-long", color: down },
    { i: idx("_enter_short_signal_close"), kind: "open-short", color: down },
    { i: idx("_exit_short_signal_close"), kind: "close-short", color: muted },
  ];

  for (const row of history.data) {
    const ts = Number(row[iTs]);
    const open = Number(row[iOpen]);
    const high = Number(row[iHigh]);
    const low = Number(row[iLow]);
    const close = Number(row[iClose]);
    if (!ts || Number.isNaN(open) || Number.isNaN(close) || Number.isNaN(high) || Number.isNaN(low)) {
      continue;
    }
    bars.push({ timestamp: ts, open, high, low, close, volume: Number(row[iVol]) || 0 });
    for (const s of signalCols) {
      if (s.i < 0) continue;
      const v = row[s.i];
      if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
        signals.push({ timestamp: ts, value: Number(v), kind: s.kind, color: s.color });
      }
    }
  }
  return { bars, signals };
}

/**
 * Parse a backtest-export datetime into epoch ms. Backtest JSON stores naive
 * UTC datetimes ("2025-01-01T00:05:00"), which Date.parse would misread as
 * local time — so a missing timezone suffix is treated as UTC.
 */
export function parseUtcMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === "string" && value.length > 0) {
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
    const t = Date.parse(hasZone ? value : `${value}Z`);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}
