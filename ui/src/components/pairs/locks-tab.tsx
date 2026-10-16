import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { useAddLocks, useDeleteLock, useLocks } from "@/lib/api/hooks";
import type { LockModel } from "@/lib/api/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimestamp } from "@/lib/utils";

const SIDE_OPTIONS = [
  { value: "*", label: "全部" },
  { value: "long", label: "多" },
  { value: "short", label: "空" },
] as const;

function SideText({ side }: { side: string }) {
  if (side === "*") return "全部";
  if (side === "long") return "多";
  if (side === "short") return "空";
  return side;
}

function LockRow({ lock }: { lock: LockModel }) {
  const deleteLock = useDeleteLock();
  return (
    <TableRow>
      <TableCell>{lock.pair}</TableCell>
      <TableCell>
        <Badge variant="outline">
          <SideText side={lock.side} />
        </Badge>
      </TableCell>
      <TableCell className="max-w-48 truncate" title={lock.reason}>
        {lock.reason ?? "—"}
      </TableCell>
      <TableCell className="tnum">{formatTimestamp(lock.lock_timestamp)}</TableCell>
      <TableCell className="tnum">{formatTimestamp(lock.lock_end_timestamp)}</TableCell>
      <TableCell>
        {lock.active ? (
          <Badge variant="outline" className="border-success/40 text-success">
            生效中
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            已结束
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={deleteLock.isPending}>
              <Trash2 className="size-3.5" aria-hidden />
              删除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除锁定?</AlertDialogTitle>
              <AlertDialogDescription>
                {lock.pair} 的{lock.active ? "生效中" : "已结束"}锁定将被删除,该交易对会立即恢复可交易资格。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteLock.mutate(
                    { lockid: lock.id },
                    {
                      onSuccess: () => toast.success(`已删除 ${lock.pair} 的锁定`),
                      onError: (e) => toast.error(e.message),
                    },
                  )
                }
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/** 锁定 tab:添加锁定表单 + 锁定列表。 */
export function LocksTab() {
  const { data, isLoading, isError, error, refetch } = useLocks();
  const addLocks = useAddLocks();

  const [pair, setPair] = useState("");
  const [side, setSide] = useState<string>("*");
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pair.trim() || !until) {
      toast.error("请填写交易对与锁定截止时间");
      return;
    }
    const untilDate = new Date(until);
    if (Number.isNaN(untilDate.getTime())) {
      toast.error("锁定截止时间格式不正确");
      return;
    }
    addLocks.mutate(
      [
        {
          pair: pair.trim().toUpperCase(),
          side,
          until: untilDate.toISOString(),
          reason: reason.trim() || undefined,
        },
      ],
      {
        onSuccess: () => {
          toast.success("锁定已添加");
          setPair("");
          setSide("*");
          setUntil("");
          setReason("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const locks = data?.locks ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">锁定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 添加锁定表单 */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="lock-pair">交易对</Label>
              <Input
                id="lock-pair"
                placeholder="BTC/USDT"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-side">方向</Label>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger id="lock-side" name="lock-side" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIDE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-until">锁定至</Label>
              <Input
                id="lock-until"
                type="datetime-local"
                className="tnum"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-reason">原因</Label>
              <Input
                id="lock-reason"
                placeholder="可选"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={addLocks.isPending}>
              <Lock className="size-3.5" aria-hidden />
              添加锁定
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}

        {locks.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs text-muted-foreground font-medium">交易对</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">方向</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">原因</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">锁定时间</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">解锁时间</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">状态</TableHead>
                <TableHead className="w-24 text-xs text-muted-foreground font-medium">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locks.map((lock) => (
                <LockRow key={lock.id} lock={lock} />
              ))}
            </TableBody>
          </Table>
        )}
        {data && locks.length === 0 && <EmptyState title="当前没有锁定" icon={<Lock className="size-5" />} />}
      </CardContent>
    </Card>
  );
}
