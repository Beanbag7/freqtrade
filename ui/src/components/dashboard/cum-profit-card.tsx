import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { useShowConfig, useTimeunitProfit } from "@/lib/api/hooks";
import type { DailyRecord } from "@/lib/api/types";
import { cn, formatProfit } from "@/lib/utils";
import { ProfitText } from "@/components/shared/blocks";

const W = 600;
const H = 180;
const PAD = { l: 6, r: 6, t: 14, b: 8 };

interface CumPoint {
  date: string;
  cum: number;
  dayProfit: number;
}

/** 近 30 日累计已实现盈亏曲线(对齐旧 freqUI 仪表盘的 CumProfit 图)。 */
function CumProfitArea({ points, stake }: { points: CumPoint[]; stake: string }) {
  const min = Math.min(0, ...points.map((p) => p.cum));
  const max = Math.max(0, ...points.map((p) => p.cum));
  const span = max - min || 1;
  const x = (i: number) =>
    PAD.l + (i / Math.max(points.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / span) * (H - PAD.t - PAD.b);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`)
    .join(" ");
  const zeroY = y(0);
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;
  const last = points[points.length - 1];
  const positive = last.cum >= 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        role="img"
        aria-label="累计收益曲线"
        preserveAspectRatio="none"
      >
        {/* 零轴 */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={zeroY}
          y2={zeroY}
          className="stroke-border"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={areaPath}
          className={positive ? "fill-primary/10" : "fill-destructive/10"}
        />
        <path
          d={linePath}
          fill="none"
          className={positive ? "stroke-primary" : "stroke-destructive"}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={p.date} className="group">
            {/* 不可见的大热区:小圆点 r=2.5 难以命中(N7) */}
            <circle cx={x(i)} cy={y(p.cum)} r={8} className="fill-transparent">
              <title>
                {`${p.date}\n累计 ${formatProfit(p.cum)} ${stake}\n当日 ${formatProfit(p.dayProfit)} ${stake}`}
              </title>
            </circle>
            <circle
              cx={x(i)}
              cy={y(p.cum)}
              r={2.5}
              pointerEvents="none"
              className={cn(
                "opacity-0 transition-opacity group-hover:opacity-100",
                positive ? "fill-primary" : "fill-destructive",
              )}
            />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground tnum">
        <span>{points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}

export function CumProfitCard() {
  const { data: config } = useShowConfig();
  const { data, isLoading, isError, error, refetch } = useTimeunitProfit("daily", 30);

  const stake = data?.stake_currency ?? config?.stake_currency ?? "";
  const records: DailyRecord[] = data?.data ?? [];

  const points = useMemo(() => {
    let acc = 0;
    return records.map((r) => {
      acc += r.abs_profit;
      return { date: r.date, cum: acc, dayProfit: r.abs_profit };
    });
  }, [records]);

  const total = points.length > 0 ? points[points.length - 1].cum : null;

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle className="text-base font-semibold">累计收益</CardTitle>
        {total !== null && (
          <span className="text-sm text-muted-foreground">
            近 30 日累计 <ProfitText value={total} suffix={stake ? ` ${stake}` : undefined} />
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-lg" aria-busy="true" />
        ) : isError ? (
          <ErrorAlert title="盈亏数据加载失败" error={error} onRetry={refetch} />
        ) : points.length === 0 ? (
          <EmptyState title="暂无盈亏数据" description="最近 30 日没有已平仓的盈亏记录。" />
        ) : (
          <CumProfitArea points={points} stake={stake} />
        )}
      </CardContent>
    </Card>
  );
}
