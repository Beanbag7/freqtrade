/**
 * Backtest result review chart: replays one pair's candles over the backtest
 * timerange (POST /pair_history with the original strategy, so strategy
 * signals are recomputed) and overlays each backtested trade's entry/exit
 * markers — the freqUI "backtest result visualization" equivalent.
 */
import { useMemo, useState } from "react";
import { ChartCandlestick } from "lucide-react";
import { usePairHistory, type PairHistoryParams } from "@/lib/api/hooks";
import { cssVar, mapPairHistory, parseUtcMs } from "@/lib/chart/pair-history";
import { CandleChart, type ChartMarker } from "@/components/chart/candle-chart";
import {
  looseArr,
  looseNum,
  looseStr,
  type LooseRecord,
} from "@/components/backtest/result-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REVIEW_INDICATORS = { ma: false, ema: false, boll: false, vol: true, macd: false, rsi: false };

/** yyyymmdd from epoch seconds (UTC). */
function fmtDay(epochSec: number): string {
  return new Date(epochSec * 1000).toISOString().slice(0, 10).replaceAll("-", "");
}

function profitLabel(profitRatio: number | null): string {
  if (profitRatio === null) return "";
  const pct = profitRatio * 100;
  return ` ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function BacktestResultChart({ backtestResult }: { backtestResult: LooseRecord }) {
  const strategyName = useMemo(() => {
    const stratMap = backtestResult.strategy;
    if (stratMap && typeof stratMap === "object") {
      const keys = Object.keys(stratMap as LooseRecord);
      return keys[0] ?? null;
    }
    return null;
  }, [backtestResult]);

  const meta = useMemo(() => {
    const md = backtestResult.metadata;
    if (strategyName && md && typeof md === "object") {
      const entry = (md as LooseRecord)[strategyName];
      if (entry && typeof entry === "object") return entry as LooseRecord;
    }
    return null;
  }, [backtestResult, strategyName]);

  const trades = useMemo(() => {
    if (!strategyName) return [] as unknown[];
    const stratMap = backtestResult.strategy as LooseRecord;
    return looseArr(stratMap[strategyName], "trades");
  }, [backtestResult, strategyName]);

  const pairs = useMemo(() => {
    const seen = new Set<string>();
    for (const t of trades) {
      const p = looseStr(t, "pair");
      if (p) seen.add(p);
    }
    return [...seen];
  }, [trades]);

  const [pair, setPair] = useState("");
  const effectivePair = pair || pairs[0] || "";

  const timeframe = meta ? looseStr(meta, "timeframe") : null;
  const startTs = meta ? looseNum(meta, "backtest_start_ts") : null;
  const endTs = meta ? looseNum(meta, "backtest_end_ts") : null;
  const timerange =
    startTs !== null && endTs !== null ? `${fmtDay(startTs)}-${fmtDay(endTs)}` : null;

  const params: PairHistoryParams | null =
    strategyName && effectivePair && timeframe && timerange
      ? { strategy: strategyName, pair: effectivePair, timeframe, timerange }
      : null;

  const history = usePairHistory(params);
  const { bars, signals } = useMemo(() => mapPairHistory(history.data), [history.data]);

  const markers = useMemo<ChartMarker[]>(() => {
    if (!effectivePair || bars.length === 0) return [];
    const up = cssVar("--chart-up", "#245b47");
    const down = cssVar("--chart-down", "#b96359");
    const firstTs = bars[0].timestamp;
    const lastTs = bars[bars.length - 1].timestamp;
    const result: ChartMarker[] = [];
    for (const t of trades) {
      if (looseStr(t, "pair") !== effectivePair) continue;
      const isShort = (t as LooseRecord).is_short === true;
      const openMs = parseUtcMs((t as LooseRecord).open_date);
      const closeMs = parseUtcMs((t as LooseRecord).close_date);
      const openRate = looseNum(t, "open_rate");
      const closeRate = looseNum(t, "close_rate");
      const profitRatio = looseNum(t, "profit_ratio");
      if (openMs && openMs >= firstTs && openMs <= lastTs && openRate !== null) {
        result.push({
          timestamp: openMs,
          value: openRate,
          kind: isShort ? "open-short" : "open-long",
          label: isShort ? "开空" : "开多",
          color: isShort ? down : up,
        });
      }
      if (closeMs && closeMs >= firstTs && closeMs <= lastTs && closeRate !== null) {
        const win = (profitRatio ?? 0) >= 0;
        result.push({
          timestamp: closeMs,
          value: closeRate,
          kind: isShort ? "close-short" : "close-long",
          label: `${isShort ? "平空" : "平多"}${profitLabel(profitRatio)}`,
          color: win ? up : down,
        });
      }
    }
    return result;
  }, [trades, effectivePair, bars]);

  // Scroll the chart to the first entry marker of the selected pair.
  const focusTimestamp = useMemo(() => {
    const opens = markers.filter((m) => m.kind.startsWith("open"));
    return opens.length > 0 ? Math.min(...opens.map((m) => m.timestamp)) : null;
  }, [markers]);

  if (!strategyName || !meta || !timeframe || !timerange || pairs.length === 0) {
    return null; // 结果缺少可视化所需字段时整体隐藏
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">K 线复盘</CardTitle>
        <Select value={effectivePair} onValueChange={setPair}>
          <SelectTrigger className="w-44" aria-label="选择复盘交易对">
            <SelectValue placeholder="选择交易对" />
          </SelectTrigger>
          <SelectContent>
            {pairs.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {history.isError ? (
          <ErrorAlert title="K 线加载失败" error={history.error} onRetry={() => history.refetch()} />
        ) : history.isPending ? (
          <Skeleton className="h-[480px] rounded-lg" aria-busy="true" />
        ) : bars.length === 0 ? (
          <EmptyState
            title="该时段没有 K 线数据"
            description="本地缺少对应历史数据,可先在数据下载页下载。"
            icon={<ChartCandlestick className="size-5" />}
          />
        ) : (
          <CandleChart
            pair={effectivePair}
            timeframe={timeframe}
            bars={bars}
            markers={markers}
            signals={signals}
            indicators={REVIEW_INDICATORS}
            focusTimestamp={focusTimestamp}
            height={480}
          />
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          策略 {strategyName} · 周期 {timeframe} · 时段{" "}
          <span className="tnum">{timerange}</span> · 共{" "}
          {/* 每笔来回两条标记;首尾越界时可能只有单侧,取整避免“3.5 笔” */}
          <span className="tnum">{Math.round(markers.length / 2)}</span> 笔交易标记
        </p>
      </CardContent>
    </Card>
  );
}
