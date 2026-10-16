import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useAddBlacklist, useBlacklist, useRemoveBlacklist } from "@/lib/api/hooks";
import { ErrorAlert, EmptyState } from "@/components/shared/states";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** 按空格/逗号拆分、去重并转大写。 */
function parsePairs(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

/** 黑名单 tab:添加表单 + 原始规则说明 + expanded 列表。 */
export function BlacklistTab() {
  const { data, isLoading, isError, error, refetch } = useBlacklist();
  const addBlacklist = useAddBlacklist();
  const removeBlacklist = useRemoveBlacklist();
  const [input, setInput] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pairs = parsePairs(input);
    if (pairs.length === 0) {
      toast.error("请输入至少一个交易对");
      return;
    }
    addBlacklist.mutate(pairs, {
      onSuccess: () => {
        toast.success("已加入黑名单");
        setInput("");
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const busy = addBlacklist.isPending || removeBlacklist.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">黑名单</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 添加表单 */}
        <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
          <Input
            className="min-w-0 flex-1"
            placeholder="输入交易对,可用空格或逗号分隔,如 BTC/USDT ETH/USDT"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            加入黑名单
          </Button>
        </form>

        {data && Object.keys(data.errors).length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>部分黑名单规则解析失败</AlertTitle>
            <AlertDescription className="break-all font-mono text-xs">
              {JSON.stringify(data.errors)}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        )}
        {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}

        {data && data.blacklist_expanded.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              原始规则:{data.blacklist.length > 0 ? data.blacklist.join(" / ") : "—"}
              {data.method.length > 0 && ` · 来源:${data.method.join(" / ")}`}
            </p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs text-muted-foreground font-medium">交易对</TableHead>
                    <TableHead className="w-20 text-xs text-muted-foreground font-medium">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.blacklist_expanded.map((pair) => (
                    <TableRow key={pair}>
                      <TableCell>{pair}</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={busy}>
                              <X className="size-3.5" />
                              移除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>移除 {pair}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                从黑名单中移除该交易对,机器人会重新按白名单规则评估是否交易该品种。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  removeBlacklist.mutate([pair], {
                                    onSuccess: () => toast.success("已移出黑名单"),
                                    onError: (e) => toast.error(e.message),
                                  })
                                }
                              >
                                确认移除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {data && data.blacklist_expanded.length === 0 && (
          <EmptyState
            title="黑名单为空"
            description="当前没有任何黑名单规则,所有交易对都可能在白名单中出现。"
            icon={<X className="size-5" />}
          />
        )}
      </CardContent>
    </Card>
  );
}
