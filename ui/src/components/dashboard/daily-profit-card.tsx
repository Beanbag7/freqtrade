import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { useShowConfig, useTimeunitProfit } from "@/lib/api/hooks";
import type { DailyRecord } from "@/lib/api/types";
import { cn, formatProfit } from "@/lib/utils";

/** Pure-CSS bar chart: bar height normalised to the max |abs_profit|. */
function DailyBars({ records, stake }: { records: DailyRecord[]; stake: string }) {
  const maxAbs = Math.max(...records.map((r) => Math.abs(r.abs_profit)), 0);

  return (
    <div className="flex items-end gap-2">
      {records.map((r) => {
        const abs = Math.abs(r.abs_profit);
        const pct = maxAbs > 0 ? (abs / maxAbs) * 100 : 0;
        const zero = r.abs_profit === 0;
        const positive = r.abs_profit > 0;
        return (
          <div key={r.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-32 w-full items-end justify-center pt-5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative w-full"
                    style={{ height: zero ? "1px" : `${Math.max(pct, 1)}%` }}
                  >
                    <div
                      className={cn(
                        "h-full w-full rounded-sm",
                        zero ? "bg-border" : positive ? "bg-success" : "bg-destructive",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute inset-x-0 -top-5 text-center text-xs tnum",
                        zero ? "text-muted-foreground" : positive ? "text-success" : "text-destructive",
                      )}
                    >
                      {formatProfit(r.abs_profit)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-left">
                  <div className="tnum font-medium">{r.date}</div>
                  <div className="tnum">
                    {formatProfit(r.abs_profit)}
                    {stake ? ` ${stake}` : ""}
                  </div>
                  <div className="tnum">{r.trade_count} 笔</div>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs text-muted-foreground tnum">{r.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Right column: last 7 days of realised profit as bars. */
export function DailyProfitCard() {
  const { data: config } = useShowConfig();
  const { data, isLoading, isError, error, refetch } = useTimeunitProfit("daily", 7);

  const stake = data?.stake_currency ?? config?.stake_currency ?? "";
  const records = data?.data ?? [];

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold">近 7 日盈亏</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-44 w-full rounded-lg" aria-busy="true" />
        ) : isError ? (
          <ErrorAlert title="盈亏数据加载失败" error={error} onRetry={refetch} />
        ) : records.length === 0 ? (
          <EmptyState title="暂无盈亏数据" description="最近 7 日没有已平仓的盈亏记录。" />
        ) : (
          <DailyBars records={records} stake={stake} />
        )}
      </CardContent>
    </Card>
  );
}
