import { useEffect, useRef } from "react";
import { dispose, init, type Chart, type KLineData } from "klinecharts";
import {
  registerTradeOverlays,
  SIGNAL_OVERLAY,
  TRADE_OVERLAY,
  type TradeMarkerKind,
} from "@/lib/chart/overlays";
import { FT_LINE_INDICATOR, registerColumnLineIndicator } from "@/lib/chart/indicators";

export interface ChartMarker {
  timestamp: number;
  /** y position: entry → bar low, exit → bar high */
  value: number;
  kind: TradeMarkerKind;
  label: string;
  color: string;
}

export interface SignalMarker {
  timestamp: number;
  value: number;
  kind: TradeMarkerKind;
  color: string;
}

export interface IndicatorToggles {
  ma: boolean;
  ema: boolean;
  boll: boolean;
  vol: boolean;
  macd: boolean;
  rsi: boolean;
}

/** One strategy indicator line (from /plot_config) with resolved theme color. */
export interface PlotLine {
  column: string;
  color: string;
}

/** A subplot pane: several columns sharing one indicator pane. */
export interface PlotSubplot {
  title: string;
  lines: PlotLine[];
}

export interface StrategyPlot {
  main: PlotLine[];
  subs: PlotSubplot[];
}

const MARKER_GROUP = "ft-trade-markers";
const SIGNAL_GROUP = "ft-signal-markers";

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function chartStyles() {
  const up = cssVar("--chart-up", "#245b47");
  const down = cssVar("--chart-down", "#b96359");
  const muted = cssVar("--muted-foreground", "#52645a");
  const border = cssVar("--border", "#dee5de");
  return {
    grid: {
      horizontal: { color: border, size: 1, style: "dashed" as const },
      vertical: { color: border, size: 1, style: "dashed" as const },
    },
    candle: {
      bar: {
        upColor: up,
        downColor: down,
        noChangeColor: muted,
        upBorderColor: up,
        downBorderColor: down,
        noChangeBorderColor: muted,
        upWickColor: up,
        downWickColor: down,
        noChangeWickColor: muted,
      },
      priceMark: {
        high: { color: muted },
        low: { color: muted },
        last: {
          upColor: up,
          downColor: down,
          noChangeColor: muted,
          text: { color: "#fcfdfc" },
        },
      },
    },
    indicator: {
      lastValueMark: { show: false },
      tooltip: { title: { showName: true, showParams: false } },
    },
    xAxis: {
      axisLine: { color: border },
      tickLine: { color: border },
      tickText: { color: muted },
    },
    yAxis: {
      axisLine: { color: border },
      tickLine: { color: border },
      tickText: { color: muted },
    },
    crosshair: {
      horizontal: { line: { color: muted }, text: { color: "#fcfdfc", backgroundColor: muted } },
      vertical: { line: { color: muted }, text: { color: "#fcfdfc", backgroundColor: muted } },
    },
    separator: { color: border },
  };
}

/**
 * Theme-aware per-indicator style overrides: keep every line/bar inside the
 * mist-white/ink-green low-saturation family instead of klinecharts' default
 * bright palette (spec §1/§2).
 */
function indicatorStyles(name: string) {
  const up = cssVar("--chart-up", "#245b47");
  const down = cssVar("--chart-down", "#b96359");
  const amber = cssVar("--warning", "#96662c");
  const slate = cssVar("--info", "#4e6e7b");
  const muted = cssVar("--muted-foreground", "#52645a");
  const ohlc = {
    compareRule: "current_open" as const,
    upColor: up,
    downColor: down,
    noChangeColor: muted,
  };
  switch (name) {
    case "MA":
      return { lines: [{ color: amber }, { color: slate }, { color: down }, { color: muted }] };
    case "EMA":
      return { lines: [{ color: up }, { color: down }] };
    case "BOLL":
      return { lines: [{ color: amber }, { color: muted }, { color: slate }] };
    case "VOL":
      return { ohlc, lines: [{ color: amber }, { color: slate }] };
    case "MACD":
      return { ohlc, lines: [{ color: up }, { color: amber }] };
    case "RSI":
      return { lines: [{ color: up }, { color: amber }, { color: slate }] };
    default:
      return undefined;
  }
}

/** "5m" → { span: 5, type: "minute" } */
export function parseTimeframe(tf: string): { span: number; type: "minute" | "hour" | "day" | "week" } {
  const m = /^(\d+)([mhdw])$/.exec(tf);
  if (!m) return { span: 5, type: "minute" };
  const span = Number(m[1]);
  const unit = m[2];
  if (unit === "m") return { span, type: "minute" };
  if (unit === "h") return { span, type: "hour" };
  if (unit === "d") return { span, type: "day" };
  return { span, type: "week" };
}

export function pricePrecisionOf(bars: KLineData[]): number {
  const last = bars[bars.length - 1];
  const price = last?.close ?? 1;
  const abs = Math.abs(price);
  if (abs === 0) return 2;
  if (abs < 0.001) return 8;
  if (abs < 0.1) return 6;
  if (abs < 1) return 5;
  if (abs < 100) return 4;
  return 2;
}

interface CandleChartProps {
  pair: string;
  timeframe: string;
  bars: KLineData[];
  markers: ChartMarker[];
  signals: SignalMarker[];
  indicators: IndicatorToggles;
  /** Strategy plot_config lines/panes (already color-resolved). */
  strategyPlot?: StrategyPlot;
  /** column name → (timestamp → value) maps for strategyPlot columns. */
  plotColumns?: Record<string, Record<number, number>>;
  showStrategyPlot?: boolean;
  /** When set (and bars loaded), scroll so this timestamp sits with context. */
  focusTimestamp?: number | null;
  height?: number;
}

/**
 * klinecharts v10 wrapper. Data flows through setDataLoader; incremental
 * updates go through the subscription callback so the user's scroll/zoom
 * position stays stable across refreshes (spec §7).
 */
export function CandleChart({
  pair,
  timeframe,
  bars,
  markers,
  signals,
  indicators,
  strategyPlot,
  plotColumns,
  showStrategyPlot = true,
  focusTimestamp = null,
  height = 560,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const barsRef = useRef<KLineData[]>([]);
  const subscribeRef = useRef<((bar: KLineData) => void) | null>(null);
  const indicatorPanesRef = useRef<{ paneId: string; name: string }[]>([]);
  const plotPanesRef = useRef<string[]>([]);
  const focusFiredRef = useRef<number | null>(null);

  // Keep barsRef current so getBars always serves the freshest dataset.
  barsRef.current = bars;

  // Mount: init chart once.
  useEffect(() => {
    registerTradeOverlays();
    registerColumnLineIndicator();
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, {
      locale: "zh-CN",
      styles: chartStyles(),
    });
    if (!chart) return;
    chartRef.current = chart;
    // Debug handle for live inspection (harmless in production).
    (window as unknown as { __ftChart?: Chart }).__ftChart = chart;
    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(barsRef.current, { forward: false, backward: false });
      },
      subscribeBar: ({ callback }) => {
        subscribeRef.current = callback;
      },
      unsubscribeBar: () => {
        subscribeRef.current = null;
      },
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(container);
    return () => {
      ro.disconnect();
      dispose(container);
      chartRef.current = null;
      subscribeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Symbol / period switching triggers an automatic reload through getBars.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !pair) return;
    chart.setSymbol({
      ticker: pair,
      pricePrecision: pricePrecisionOf(barsRef.current),
      volumePrecision: 2,
    });
    chart.setPeriod(parseTimeframe(timeframe));
  }, [pair, timeframe]);

  // Data updates: full reset on pair/tf change; incremental otherwise.
  const prevKeyRef = useRef("");
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || bars.length === 0) return;
    const key = `${pair}|${timeframe}`;
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      chart.resetData();
      return;
    }
    // Same dataset family: push incremental updates without touching scroll.
    const sub = subscribeRef.current;
    if (sub) sub(bars[bars.length - 1]);
  }, [bars, pair, timeframe]);

  // Trade + signal markers.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: MARKER_GROUP });
    chart.removeOverlay({ groupId: SIGNAL_GROUP });
    for (const s of signals) {
      chart.createOverlay({
        name: SIGNAL_OVERLAY,
        groupId: SIGNAL_GROUP,
        points: [{ timestamp: s.timestamp, value: s.value }],
        extendData: { kind: s.kind, label: "", color: s.color },
      });
    }
    for (const m of markers) {
      chart.createOverlay({
        name: TRADE_OVERLAY,
        groupId: MARKER_GROUP,
        points: [{ timestamp: m.timestamp, value: m.value }],
        extendData: { kind: m.kind, label: m.label, color: m.color },
      });
    }
  }, [markers, signals, bars]);

  // Focus scroll: jump to a timestamp once per value change (backtest review
  // uses it to land on the first trade instead of the range tail).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !focusTimestamp || bars.length < 2) return;
    if (focusFiredRef.current === focusTimestamp) return;
    focusFiredRef.current = focusTimestamp;
    const step = bars[1].timestamp - bars[0].timestamp;
    chart.scrollToTimestamp(focusTimestamp - 30 * step, 0);
  }, [focusTimestamp, bars]);

  // Indicator panes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const { paneId, name } of indicatorPanesRef.current) {
      chart.removeIndicator({ paneId, name });
    }
    indicatorPanesRef.current = [];
    const add = (name: string, main: boolean, params?: Record<string, unknown>) => {
      const paneId = chart.createIndicator(
        {
          name,
          ...params,
          ...(indicatorStyles(name) ? { styles: indicatorStyles(name)! } : {}),
          ...(main ? { paneId: "candle_pane" } : {}),
        },
        main,
      );
      if (typeof paneId === "string") {
        indicatorPanesRef.current.push({ paneId, name });
      }
    };
    if (indicators.ma) add("MA", true);
    if (indicators.ema) add("EMA", true);
    if (indicators.boll) add("BOLL", true);
    if (indicators.vol) add("VOL", false);
    if (indicators.macd) add("MACD", false);
    if (indicators.rsi) add("RSI", false);
  }, [indicators, pair, timeframe, bars.length]);

  // Strategy plot_config indicators: main-plot lines stacked on the candle
  // pane; each subplot group gets its own pane (first line creates it).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // Main-plot lines: remove only our column-line instances, keep MA/EMA/BOLL.
    chart.removeIndicator({ paneId: "candle_pane", name: FT_LINE_INDICATOR });
    for (const paneId of plotPanesRef.current) {
      chart.removeIndicator({ paneId });
    }
    plotPanesRef.current = [];
    if (!showStrategyPlot || !strategyPlot || !plotColumns) return;

    const addLine = (line: PlotLine, paneId: string | null, stack: boolean, shortName = "") => {
      const map = plotColumns[line.column];
      if (!map) return null;
      const id = chart.createIndicator(
        {
          name: FT_LINE_INDICATOR,
          shortName,
          figures: [{ key: "value", title: `${line.column}: `, type: "line" }],
          styles: { lines: [{ color: line.color }] },
          extendData: { map },
          ...(paneId ? { paneId } : {}),
        },
        stack,
      );
      return typeof id === "string" ? id : null;
    };

    for (const line of strategyPlot.main) {
      addLine(line, "candle_pane", true);
    }
    for (const sub of strategyPlot.subs) {
      let paneId: string | null = null;
      sub.lines.forEach((line, i) => {
        const id = addLine(line, paneId, i > 0, i === 0 ? sub.title : "");
        if (i === 0 && id) {
          // createIndicator returns the indicator id, not the pane id —
          // resolve the actual pane so the following lines can stack onto it.
          const pane = chart.getIndicators().find((ind) => ind.id === id)?.paneId;
          if (pane) {
            paneId = pane;
            plotPanesRef.current.push(pane);
          }
        }
      });
    }
  }, [strategyPlot, plotColumns, showStrategyPlot, pair, timeframe, bars.length]);

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0"
      style={{ height }}
      role="img"
      aria-label={`${pair} ${timeframe} K 线图`}
    />
  );
}
