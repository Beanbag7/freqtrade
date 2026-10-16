import { useMemo, useState } from "react";
import { Check, ChartCandlestick, ChevronsUpDown, Plus, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type StrategyPlot,
} from "@/components/chart/candle-chart";
import { cssVar, mapPairHistory } from "@/lib/chart/pair-history";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;

const INDICATOR_LABELS: Record<keyof IndicatorToggles, string> = {
  ma: "MA 均线",
  ema: "EMA 指数均线",
  boll: "BOLL 布林线",
  vol: "VOL 成交量",
  macd: "MACD",
  rsi: "RSI",
};

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

/**
 * Heikin Ashi transform (freqUI chart parity). Timestamps/volume untouched, so
 * trade markers and signals still align — note they keep real prices while the
 * candles show smoothed values.
 */
function toHeikinAshi(bars: KLineData[]): KLineData[] {
  const out: KLineData[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = i === 0 ? (b.open + b.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({
      ...b,
      open: haOpen,
      close: haClose,
      high: Math.max(b.high, haOpen, haClose),
      low: Math.min(b.low, haOpen, haClose),
    });
  }
  return out;
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
  // PlotConfigurator(freqUI parity):自定义绘图——把策略 dataframe 任意列指派到主图/副图
  const [plotMode, setPlotMode] = useState<"strategy" | "custom">("strategy");
  const [customRows, setCustomRows] = useState<
    { column: string; pane: "main" | "sub"; color: string }[]
  >([]);
  const [heikinAshi, setHeikinAshi] = useState(false);
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
  const displayBars = useMemo(
    () => (heikinAshi ? toHeikinAshi(bars) : bars),
    [bars, heikinAshi],
  );

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

  /** 可绘图列:dataframe 列剔除保留字段与进出信号列(0/1 信号由 markers 表达)。 */
  const plottableColumns = useMemo(() => {
    if (!history) return [];
    const reserved = new Set(["date", "__date_ts", "open", "high", "low", "close", "volume"]);
    return history.columns.filter(
      (c) => !reserved.has(c) && !c.startsWith("enter_") && !c.startsWith("exit_"),
    );
  }, [history]);

  // 自定义绘图 → 与 strategyPlot 同形,复用同一渲染管道
  const customPlot = useMemo<StrategyPlot | undefined>(() => {
    if (plotMode !== "custom" || !history) return undefined;
    const available = new Set(history.columns);
    const rows = customRows.filter((r) => r.column && available.has(r.column));
    const main = rows
      .filter((r) => r.pane === "main")
      .map((r, i) => ({ column: r.column, color: r.color || plotPalette(i) }));
    const subLines = rows
      .filter((r) => r.pane === "sub")
      .map((r, i) => ({ column: r.column, color: r.color || plotPalette(i + 2) }));
    const subs = subLines.length > 0 ? [{ title: "自定义", lines: subLines }] : [];
    if (main.length === 0 && subs.length === 0) return undefined;
    return { main, subs };
  }, [plotMode, customRows, history]);

  const effectivePlot = plotMode === "custom" ? customPlot : strategyPlot;

  // timestamp → value maps for the referenced plot columns.
  const plotColumns = useMemo(() => {
    if (!effectivePlot || !history) return undefined;
    const iTs = history.columns.indexOf("__date_ts");
    if (iTs < 0) return undefined;
    const needed = new Set<string>();
    effectivePlot.main.forEach((l) => needed.add(l.column));
    effectivePlot.subs.forEach((s) => s.lines.forEach((l) => needed.add(l.column)));
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
  }, [effectivePlot, history]);

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
              {plotMode === "strategy" && strategyPlot && (
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

          {/* PlotConfigurator(freqUI parity):策略 plot_config 之外的自定义绘图 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={plotMode === "custom" ? "default" : "outline"}
                size="sm"
                aria-label="绘图配置"
              >
                <ChartCandlestick className="size-3.5" />
                绘图{plotMode === "custom" ? "·自定义" : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 space-y-3">
              <div className="flex gap-1.5">
                {(
                  [
                    { v: "strategy", label: "策略配置" },
                    { v: "custom", label: "自定义" },
                  ] as const
                ).map((m) => (
                  <Button
                    key={m.v}
                    type="button"
                    size="sm"
                    variant={plotMode === m.v ? "default" : "outline"}
                    aria-pressed={plotMode === m.v}
                    onClick={() => setPlotMode(m.v)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
              {plotMode === "custom" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    把当前策略 dataframe 的任意列绘到主图/副图。
                  </p>
                  <div className="space-y-2">
                    {customRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Select
                          value={row.column}
                          onValueChange={(v) =>
                            setCustomRows((prev) =>
                              prev.map((r, j) => (j === i ? { ...r, column: v } : r)),
                            )
                          }
                        >
                          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs" aria-label="数据列">
                            <SelectValue placeholder="选择列" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {plottableColumns.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={row.pane}
                          onValueChange={(v) =>
                            setCustomRows((prev) =>
                              prev.map((r, j) =>
                                j === i ? { ...r, pane: v as "main" | "sub" } : r,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-20 text-xs" aria-label="窗格">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main" className="text-xs">
                              主图
                            </SelectItem>
                            <SelectItem value="sub" className="text-xs">
                              副图
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <input
                          type="color"
                          value={row.color || plotPalette(i)}
                          onChange={(e) =>
                            setCustomRows((prev) =>
                              prev.map((r, j) => (j === i ? { ...r, color: e.target.value } : r)),
                            )
                          }
                          className="h-8 w-8 shrink-0 cursor-pointer rounded border"
                          aria-label="颜色"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          aria-label="删除该行"
                          onClick={() => setCustomRows((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1"
                    disabled={plottableColumns.length === 0}
                    onClick={() =>
                      setCustomRows((prev) => [
                        ...prev,
                        {
                          column: plottableColumns[0] ?? "",
                          pane: "sub",
                          // 添加时即固定调色(而非渲染期按过滤后索引分配),
                          // 保证色样与实际渲染色一致
                          color: plotPalette(prev.length),
                        },
                      ])
                    }
                  >
                    <Plus className="size-3.5" />
                    添加指标行
                  </Button>
                  {plottableColumns.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      当前数据没有可绘制的指标列——先选择交易对加载行情。
                    </p>
                  )}
                  {customRows.some((r) => r.column && !plottableColumns.includes(r.column)) && (
                    <p className="text-xs text-warning">
                      部分行引用的列不在当前数据中(换交易对/粒度后失效),已自动跳过。
                    </p>
                  )}
                </>
              )}
              {plotMode === "strategy" && (
                <p className="text-xs text-muted-foreground">
                  按策略 plot_config 绘制指标;切到「自定义」可自由组合 dataframe 列。
                </p>
              )}
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="heikin-ashi"
                checked={heikinAshi}
                onCheckedChange={setHeikinAshi}
                aria-label="平均K线(Heikin Ashi)"
              />
              <Label htmlFor="heikin-ashi" className="text-xs text-muted-foreground">
                HA
              </Label>
            </div>
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
              bars={displayBars}
              markers={markers}
              dataEpoch={heikinAshi ? "ha" : "raw"}
              signals={signals}
              indicators={indicators}
              strategyPlot={effectivePlot}
              plotColumns={plotColumns}
              showStrategyPlot={plotMode === "custom" ? true : showStrategyPlot}
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
