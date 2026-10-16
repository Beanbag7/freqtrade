import { Play, Square, Pause } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { usePauseBot, useStartBot, useStopBot } from "@/lib/api/hooks";

/** Start / pause / stop buttons shown in the app header. */
export function BotControlButtons({ state }: { state?: string }) {
  const start = useStartBot();
  const stop = useStopBot();
  const pause = usePauseBot();
  const busy = start.isPending || stop.isPending || pause.isPending;

  if (state === "running") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-label="暂停开仓"
          onClick={() =>
            pause.mutate(undefined, {
              onSuccess: () => toast.success("已暂停开新仓"),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          <Pause className="size-3.5" />
          <span className="hidden sm:inline">暂停开仓</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy} aria-label="停止">
              <Square className="size-3.5" />
              <span className="hidden sm:inline">停止</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>停止机器人?</AlertDialogTitle>
              <AlertDialogDescription>
                停止后机器人不再处理新信号,持仓中的交易将保留。此操作可随时通过“启动”恢复。
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
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={busy}
      aria-label="启动"
      onClick={() =>
        start.mutate(undefined, {
          onSuccess: () => toast.success("机器人已启动"),
          onError: (e) => toast.error(e.message),
        })
      }
    >
      <Play className="size-3.5" />
      <span className="hidden sm:inline">启动</span>
    </Button>
  );
}
