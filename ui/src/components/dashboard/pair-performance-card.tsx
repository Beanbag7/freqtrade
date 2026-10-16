import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfitText } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { usePerformance } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Top pairs by |profit_abs| with a horizontal magnitude bar each. */
export function PairPerformanceCard() {
  const { data, isLoading, isError, error, refetch } = usePerformance();

  const rows = [...(data ?? [])]
    .sort((a, b) => Math.abs(b.profit_abs) - Math.abs(a.profit_abs))
    .slice(0, 8);
  const maxAbs = rows.length > 0 ? Math.abs(rows[0].profit_abs) : 0;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold">交易对表现</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorAlert title="交易对表现加载失败" error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState title="暂无交易对数据" description="还没有可用于统计的交易对。" />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const abs = Math.abs(row.profit_abs);
              const pct = maxAbs > 0 ? (abs / maxAbs) * 100 : 0;
              const positive = row.profit_abs >= 0;
              return (
                <div key={row.pair} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <div className="truncate text-control font-medium">{row.pair}</div>
                    <div className="text-xs text-muted-foreground tnum">{row.count} 笔</div>
                  </div>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", positive ? "bg-success" : "bg-destructive")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <ProfitText value={row.profit_abs} className="w-24 shrink-0 justify-end text-control" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
