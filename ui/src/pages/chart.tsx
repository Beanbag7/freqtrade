import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { KLineData } from "klinecharts";
import { PageHeader } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatPct, formatPrice } from "@/lib/utils";
import {
  useOpenTrades,
  usePairCandles,
  usePlotConfig,
  useShowConfig,
  useTrades,
  useWhitelist,
} from "@/lib/api/hooks";
import type { PairHistory } from "@/lib/api/types";
import {
  CandleChart,
  type ChartMarker,
  type IndicatorToggles,
  type SignalMarker,
  type StrategyPlot,
} from "@/components/chart/candle-chart";
import type { TradeMarkerKind } from "@/lib/chart/overlays";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

const INDICATOR_LABELS: Record<keyof IndicatorToggles, string> = {
  ma: "MA 均线",
  ema: "EMA 指数均线",
  boll: "BOLL 布林线",
  vol: "VOL 成交量",
  macd: "MACD",
  rsi: "RSI",
};

interface MappedCandles {
  bars: KLineData[];
  signals: SignalMarker[];
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Palette rotation for strategy plot_config lines (theme family). */
function plotPalette(i: number): string {
  const colors = [
    cssVar("--chart-up", "#245b47"),
    cssVar("--chart-down", "#b96359"),
    cssVar("--warning", "#96662c"),
    cssVar("--info", "#4e6e7b"),
    cssVar("--muted-foreground", "#52645a"),
  ];
  return colors[i % colors.length];
}

const INVISIBLE_COLORS = new Set([
  "white", "snow", "ivory", "whitesmoke", "seashell", "beige", "linen",
  "yellow", "lightyellow", "lemonchiffon", "cyan", "aqua", "aquamarine",
  "lime", "magenta", "fuchsia", "gainsboro", "lightgray", "lightgrey",
]);

/** Strategy-specified colors win, except ones invisible on the mist-white bg. */
function resolvePlotColor(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const c = raw.trim().toLowerCase();
  if (INVISIBLE_COLORS.has(c)) return fallback;
  if (/^#(?:fff|ffff|ffffff|f[0-9a-f]{5})/i.test(c)) return fallback;
  return raw;
}

/** Map freqtrade PairHistory rows to klinecharts bars + strategy signal markers. */
function mapPairHistory(history: PairHistory | undefined): MappedCandles {
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

export default function ChartPage() {
  const { data: config } = useShowConfig();
  const { data: whitelist } = useWhitelist();
  const { data: openTrades } = useOpenTrades();
  const [pair, setPair] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [pairOpen, setPairOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showStrategyPlot, setShowStrategyPlot] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorToggles>({
    ma: true,
    ema: false,
    boll: false,
    vol: true,
    macd: false,
    rsi: false,
  });

  const effectiveTimeframe = timeframe || config?.timeframe || "5m";

  // Pair candidates: whitelist first, then pairs with open trades.
  const pairOptions = useMemo(() => {
    const list = new Set<string>();
    whitelist?.whitelist.forEach((p) => list.add(p));
    openTrades?.forEach((t) => list.add(t.pair));
    return [...list];
  }, [whitelist, openTrades]);

  const effectivePair = pair || pairOptions[0] || "";

  const {
    data: history,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePairCandles(effectivePair, effectiveTimeframe, 500, {
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  // Recent closed trades for entry/exit markers.
  const { data: tradeHistory } = useTrades(200, 0);

  // Strategy plot_config (indicator columns defined by the active strategy).
  const { data: plotConfigRaw } = usePlotConfig({ retry: 1 });

  const { bars, signals } = useMemo(() => mapPairHistory(history), [history]);

  // Resolve plot_config into theme-colored main/subplot line definitions,
  // keeping only columns actually present in the dataframe response.
  const strategyPlot = useMemo<StrategyPlot | undefined>(() => {
    if (!plotConfigRaw || !history) return undefined;
    const cfg = plotConfigRaw as {
      main_plot?: Record<string, { color?: string }>;
      subplots?: Record<string, Record<string, { color?: string }>>;
    };
    const available = new Set(history.columns);
    const main = Object.entries(cfg.main_plot ?? {})
      .filter(([col]) => available.has(col))
      .map(([column, meta], i) => ({
        column,
        color: resolvePlotColor(meta?.color, plotPalette(i)),
      }));
    const subs = Object.entries(cfg.subplots ?? {})
      .map(([title, lines]) => ({
        title,
        lines: Object.entries(lines)
          .filter(([col]) => available.has(col))
          .map(([column, meta], i) => ({
            column,
            color: resolvePlotColor(meta?.color, plotPalette(i + 2)),
          })),
      }))
      .filter((s) => s.lines.length > 0);
    if (main.length === 0 && subs.length === 0) return undefined;
    return { main, subs };
  }, [plotConfigRaw, history]);

  // timestamp → value maps for the referenced plot columns.
  const plotColumns = useMemo(() => {
    if (!strategyPlot || !history) return undefined;
    const iTs = history.columns.indexOf("__date_ts");
    if (iTs < 0) return undefined;
    const needed = new Set<string>();
    strategyPlot.main.forEach((l) => needed.add(l.column));
    strategyPlot.subs.forEach((s) => s.lines.forEach((l) => needed.add(l.column)));
    const maps: Record<string, Record<number, number>> = {};
    for (const col of needed) {
      const idx = history.columns.indexOf(col);
      if (idx < 0) continue;
      const map: Record<number, number> = {};
      for (const row of history.data) {
        const ts = Number(row[iTs]);
        const v = Number(row[idx]);
        if (ts && Number.isFinite(v)) map[ts] = v;
      }
      maps[col] = map;
    }
    return maps;
  }, [strategyPlot, history]);

  const markers = useMemo<ChartMarker[]>(() => {
    if (!effectivePair || bars.length === 0) return [];
    const firstTs = bars[0].timestamp;
    const up = cssVar("--chart-up", "#245b47");
    const down = cssVar("--chart-down", "#b96359");
    const result: ChartMarker[] = [];
    const inRange = (ts?: number | null) => Boolean(ts && ts >= firstTs);

    openTrades
      ?.filter((t) => t.pair === effectivePair)
      .forEach((t) => {
        if (inRange(t.open_timestamp)) {
          result.push({
            timestamp: t.open_timestamp,
            value: t.open_rate,
            kind: t.is_short ? "open-short" : "open-long",
            label: t.is_short ? "开空" : "开多",
            color: t.is_short ? down : up,
          });
        }
      });

    tradeHistory?.trades
      .filter((t) => t.pair === effectivePair && !t.is_open)
      .forEach((t) => {
        if (inRange(t.open_timestamp)) {
          result.push({
            timestamp: t.open_timestamp,
            value: t.open_rate,
            kind: t.is_short ? "open-short" : "open-long",
            label: t.is_short ? "开空" : "开多",
            color: t.is_short ? down : up,
          });
        }
        if (inRange(t.close_timestamp) && t.close_rate) {
          result.push({
            timestamp: t.close_timestamp!,
            value: t.close_rate,
            kind: t.is_short ? "close-short" : "close-long",
            label: t.is_short ? "平空" : "平多",
            color: t.is_short ? up : down,
          });
        }
      });
    return result;
  }, [effectivePair, bars, openTrades, tradeHistory]);

  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  const changePct =
    lastBar && prevBar && prevBar.close !== 0
      ? ((lastBar.close - prevBar.close) / prevBar.close) * 100
      : null;

  return (
    <div className="space-y-4">
      <PageHeader title="K 线图" description="实时行情、策略信号与持仓标记" />

      {/* Controls */}
      <Card className="shadow-xs">
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          {/* Pair combobox */}
          <Popover open={pairOpen} onOpenChange={setPairOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pairOpen}
                aria-label="选择交易对"
                className="w-52 justify-between font-medium"
              >
                <span className="truncate">{effectivePair || "选择交易对"}</span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="搜索交易对…" />
                <CommandList>
                  <CommandEmpty>没有匹配的交易对</CommandEmpty>
                  <CommandGroup>
                    {pairOptions.map((p) => (
                      <CommandItem
                        key={p}
                        value={p}
                        onSelect={(value) => {
                          setPair(value);
                          setPairOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            effectivePair === p ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {p}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Timeframe group */}
          <div className="flex items-center rounded-md border" role="group" aria-label="时间周期">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                aria-pressed={effectiveTimeframe === tf}
                className={cn(
                  "h-8 px-2.5 text-control font-medium text-muted-foreground transition-colors first:rounded-l-md last:rounded-r-md",
                  "hover:bg-accent/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                  effectiveTimeframe === tf && "bg-accent text-primary",
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="指标设置">
                <SlidersHorizontal className="size-3.5" />
                指标
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>技术指标</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(INDICATOR_LABELS) as (keyof IndicatorToggles)[]).map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={indicators[key]}
                  onCheckedChange={(checked) =>
                    setIndicators((prev) => ({ ...prev, [key]: checked === true }))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {INDICATOR_LABELS[key]}
                </DropdownMenuCheckboxItem>
              ))}
              {strategyPlot && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>策略</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={showStrategyPlot}
                    onCheckedChange={(checked) => setShowStrategyPlot(checked === true)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    策略指标 (plot_config)
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                aria-label="自动刷新"
              />
              <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground">
                自动刷新
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="刷新行情"
            >
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="shadow-xs">
        <CardContent className="space-y-2 py-4">
          {/* OHLC strip */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-control font-semibold text-foreground">
              {effectivePair || "—"}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {effectiveTimeframe}
              </span>
            </span>
            {lastBar && (
              <>
                <span>
                  开 <span className="tnum text-foreground">{formatPrice(lastBar.open)}</span>
                </span>
                <span>
                  高 <span className="tnum text-foreground">{formatPrice(lastBar.high)}</span>
                </span>
                <span>
                  低 <span className="tnum text-foreground">{formatPrice(lastBar.low)}</span>
                </span>
                <span>
                  收{" "}
                  <span
                    className={cn(
                      "tnum font-medium",
                      changePct !== null && changePct > 0 && "text-success",
                      changePct !== null && changePct < 0 && "text-destructive",
                    )}
                  >
                    {formatPrice(lastBar.close)}
                  </span>
                </span>
                {changePct !== null && (
                  <span
                    className={cn(
                      "tnum",
                      changePct > 0 && "text-success",
                      changePct < 0 && "text-destructive",
                    )}
                  >
                    {changePct > 0 ? "▲" : changePct < 0 ? "▼" : "—"}{" "}
                    {formatPct(Math.abs(changePct))}
                  </span>
                )}
                <span>
                  量 <span className="tnum text-foreground">{(lastBar.volume ?? 0).toFixed(2)}</span>
                </span>
              </>
            )}
            <span className="ml-auto">
              信号 多{history?.enter_long_signals ?? 0} / 空{history?.enter_short_signals ?? 0}
            </span>
          </div>

          {isError ? (
            <ErrorAlert
              title="行情加载失败"
              error={error}
              onRetry={() => refetch()}
            />
          ) : isLoading || bars.length === 0 ? (
            isLoading ? (
              <Skeleton className="h-[560px] w-full rounded-md" />
            ) : (
              <EmptyState
                title="没有行情数据"
                description={effectivePair ? "该交易对暂无 K 线数据" : "请先在上方选择一个交易对"}
              />
            )
          ) : (
            <CandleChart
              pair={effectivePair}
              timeframe={effectiveTimeframe}
              bars={bars}
              markers={markers}
              signals={signals}
              indicators={indicators}
              strategyPlot={strategyPlot}
              plotColumns={plotColumns}
              showStrategyPlot={showStrategyPlot}
              height={560}
            />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="text-success">▲</span> 开多 / 平空
            </span>
            <span>
              <span className="text-destructive">▼</span> 平多 / 开空
            </span>
            <span>大标记为实际成交,小标记为策略信号</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
