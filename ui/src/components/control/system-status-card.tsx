import { useHealth, useSysinfo } from "@/lib/api/hooks";
import { formatPct, formatTimestamp, timeAgo } from "@/lib/utils";
import { ErrorAlert } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** 左栏:CPU / 内存(独立查询,独立状态)。 */
function CpuPanel() {
  const { data, isLoading, isError, error, refetch } = useSysinfo();

  if (isError) return <ErrorAlert error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">CPU 平均负载</span>
          <span className="tnum text-sm">{formatPct(data.cpu_avg)}</span>
        </div>
        <Progress value={clamp(data.cpu_avg)} aria-label="CPU 平均负载" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">内存占用</span>
          <span className="tnum text-sm">{formatPct(data.ram_pct)}</span>
        </div>
        <Progress value={clamp(data.ram_pct)} aria-label="内存占用" />
      </div>
      <p className="text-xs text-muted-foreground">{data.cpu_count} 核</p>
    </div>
  );
}

/** 右栏:启动时间与心跳。 */
function UptimePanel() {
  const { data, isLoading, isError, error, refetch } = useHealth();

  if (isError) return <ErrorAlert error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-52" />
      </div>
    );
  }

  return (
    <dl className="space-y-4">
      <div className="space-y-0.5">
        <dt className="text-xs text-muted-foreground">启动时间</dt>
        <dd className="tnum text-sm leading-6">
          {formatTimestamp(data.bot_start_ts)}
          <span className="text-xs text-muted-foreground"> · {timeAgo(data.bot_start_ts)}</span>
        </dd>
      </div>
      <div className="space-y-0.5">
        <dt className="text-xs text-muted-foreground">最近心跳</dt>
        <dd className="tnum text-sm leading-6">
          {formatTimestamp(data.last_process_ts)}
          <span className="text-xs text-muted-foreground"> · {timeAgo(data.last_process_ts)}</span>
        </dd>
      </div>
    </dl>
  );
}

/** 系统状态卡:CPU/内存 + 运行时间信息。 */
export function SystemStatusCard() {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">系统状态</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <CpuPanel />
        <UptimePanel />
      </CardContent>
    </Card>
  );
}
