import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfitText } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { TradeDetailSheet } from "@/components/trades/trade-detail-sheet";
import { useForceExit, useOpenTrades } from "@/lib/api/hooks";
import type { OpenTrade } from "@/lib/api/types";
import { formatDuration, formatPrice } from "@/lib/utils";

/** Trimmed decimal display for base-asset amounts (no forced trailing zeros). */
function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/** Long/short badge: color + explicit text label (spec §2 / brief rule 2). */
function SideBadge({ isShort }: { isShort: boolean }) {
  return isShort ? (
    <Badge variant="outline" className="border-destructive/40 text-destructive">
      空
    </Badge>
  ) : (
    <Badge variant="outline" className="border-primary/40 text-primary">
      多
    </Badge>
  );
}

/** Force-exit action with destructive two-step confirmation (brief rule 8). */
function ForceExitButton({ trade }: { trade: OpenTrade }) {
  const [open, setOpen] = useState(false);
  const forceExit = useForceExit();

  const handleConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    forceExit.mutate(
      { tradeid: trade.trade_id },
      {
        onSuccess: () => {
          toast.success(`已强平 ${trade.pair}`);
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          强平
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>确认强平</AlertDialogTitle>
          <AlertDialogDescription>
            将以市价平掉 {trade.pair} 的持仓,该操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm" disabled={forceExit.isPending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            size="sm"
            disabled={forceExit.isPending}
            onClick={handleConfirm}
          >
            {forceExit.isPending ? "强平中…" : "确认强平"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const HEAD_CLASS = "text-xs font-medium text-muted-foreground";

/** Open positions table; rows open the trade-detail sheet (freqUI parity). */
export function OpenTradesCard() {
  const { data, isLoading, isError, error, refetch } = useOpenTrades();
  const trades = data ?? [];
  const [selected, setSelected] = useState<OpenTrade | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onSelect = (trade: OpenTrade) => {
    setSelected(trade);
    setSheetOpen(true);
  };
  const activate = (trade: OpenTrade) => () => onSelect(trade);
  const onKey = (trade: OpenTrade) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(trade);
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold">持仓中的交易</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorAlert title="持仓加载失败" error={error} onRetry={refetch} />
        ) : trades.length === 0 ? (
          <EmptyState title="当前没有持仓" description="机器人暂无进行中的交易。" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={HEAD_CLASS}>交易对</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>数量</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>开仓价</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>现价</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>盈亏</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>时长</TableHead>
                <TableHead className={`${HEAD_CLASS} text-right`}>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((t) => {
                const profitPct = t.profit_ratio === undefined ? undefined : t.profit_ratio * 100;
                return (
                  <TableRow
                    key={t.trade_id}
                    tabIndex={0}
                    aria-label={`查看交易 ${t.trade_id} 详情`}
                    className="cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                    onClick={activate(t)}
                    onKeyDown={onKey(t)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-control font-medium">{t.pair}</span>
                        <SideBadge isShort={t.is_short} />
                      </div>
                    </TableCell>
                    <TableCell className="tnum text-right">{formatAmount(t.amount)}</TableCell>
                    <TableCell className="tnum text-right">{formatPrice(t.open_rate)}</TableCell>
                    <TableCell className="tnum text-right">{formatPrice(t.current_rate)}</TableCell>
                    <TableCell className="text-right">
                      <ProfitText value={profitPct} suffix="%" withIcon />
                    </TableCell>
                    <TableCell className="tnum text-right text-muted-foreground">
                      {formatDuration(Date.now() - t.open_timestamp)}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <ForceExitButton trade={t} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <TradeDetailSheet trade={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
      </CardContent>
    </Card>
  );
}
