import { toast } from "sonner";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { usePauseBot, useReloadConfig, useShowConfig, useStartBot, useStopBot } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { ErrorAlert } from "@/components/shared/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StateLine({ state }: { state: string | undefined }) {
  const running = state === "running";
  const paused = state === "paused";
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "size-2.5 rounded-full",
          running ? "bg-success" : paused ? "bg-warning" : "bg-muted-foreground",
        )}
        aria-hidden
      />
      <span className="text-base font-semibold">
        {running ? "运行中" : paused ? "已暂停开新仓" : state === "stopped" ? "已停止" : state || "未知"}
      </span>
    </div>
  );
}

/** 运行状态卡:状态、机器人信息与启停控制(完整版)。 */
export function RunStateCard() {
  const { data: config, isLoading, isError, error, refetch } = useShowConfig();
  const start = useStartBot();
  const pause = usePauseBot();
  const stop = useStopBot();
  const reload = useReloadConfig();

  const busy = start.isPending || pause.isPending || stop.isPending || reload.isPending;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">运行状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
        {isLoading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-9 w-full max-w-sm" />
          </div>
        )}
        {config && (
          <>
            <StateLine state={config.state} />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{config.bot_name}</span>
              <span aria-hidden>·</span>
              <span className="tnum">v{config.version}</span>
              <span aria-hidden>·</span>
              <span>{config.exchange}</span>
              <span aria-hidden>·</span>
              <span>{config.trading_mode}</span>
              {config.dry_run && (
                <Badge variant="outline" className="border-info/40 text-info">
                  模拟盘
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {config.state !== "running" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    start.mutate(undefined, {
                      onSuccess: () => toast.success("机器人已启动"),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <Play className="size-3.5" />
                  启动
                </Button>
              )}
              {config.state === "running" && (
                <>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      pause.mutate(undefined, {
                        onSuccess: () => toast.success("已暂停开新仓"),
                        onError: (e) => toast.error(e.message),
                      })
                    }
                  >
                    <Pause className="size-3.5" />
                    暂停开仓
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={busy}>
                        <Square className="size-3.5" />
                        停止
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>停止机器人?</AlertDialogTitle>
                        <AlertDialogDescription>
                          停止后机器人不再处理信号,已持仓的交易保留,可随时通过「启动」恢复。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            stop.mutate(undefined, {
                              onSuccess: () => toast.success("机器人已停止"),
                              onError: (e) => toast.error(e.message),
                            })
                          }
                        >
                          确认停止
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={busy}>
                    <RotateCcw className="size-3.5" />
                    重载配置
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>重载配置?</AlertDialogTitle>
                    <AlertDialogDescription>
                      从磁盘重新加载配置与策略,已持仓的交易不会受影响。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        reload.mutate(undefined, {
                          onSuccess: () => toast.success("配置已重载"),
                          onError: (e) => toast.error(e.message),
                        })
                      }
                    >
                      确认重载
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
