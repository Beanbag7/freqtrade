import { useState } from "react";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { useAbortBacktest, useBacktestStatus } from "@/lib/api/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

/** Top-of-page card: progress while running, sticky dismissible error on failure. */
export function BacktestRunningCard() {
  const { data } = useBacktestStatus();
  const abortBacktest = useAbortBacktest();
  // 以 status_msg 为身份:新一轮回测报错(文案不同)会再次弹出
  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null);

  if (!data?.running) {
    if (data?.status === "error" && data.status_msg && dismissedMsg !== data.status_msg) {
      return (
        <Alert variant="destructive" className="border-destructive/40 bg-card">
          <XCircle className="size-4" />
          <AlertTitle>回测失败</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">{data.status_msg}</span>
            <Button variant="outline" size="sm" onClick={() => setDismissedMsg(data.status_msg ?? null)}>
              知道了
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const progress = Math.min(Math.max((data.progress ?? 0) * 100, 0), 100);

  const handleAbort = () => {
    abortBacktest.mutate(undefined, {
      onSuccess: () => toast.success("回测已中止"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-base font-semibold">回测进行中</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                中止回测
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>中止当前回测?</AlertDialogTitle>
                <AlertDialogDescription>
                  将终止正在运行的回测任务,已跑完的部分可能无法保留,此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleAbort} disabled={abortBacktest.isPending}>
                  中止回测
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>当前阶段:{data.step || "—"}</span>
          <span className="tnum">已产生交易:{data.trade_count ?? 0} 笔</span>
        </div>
        <Progress value={progress} aria-label="回测进度" />
      </CardContent>
    </Card>
  );
}
