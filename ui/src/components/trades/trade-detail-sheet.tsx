import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import type { CustomDataEntry, Order, Trade } from "@/lib/api/types";
import {
  useCancelOpenOrder,
  useDeleteTrade,
  useForceExit,
  useReloadTrade,
  useTradeCustomData,
} from "@/lib/api/hooks";
import { formatNumber, formatPct, formatPrice, formatTimestamp } from "@/lib/utils";
import { ProfitText } from "@/components/shared/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

/** One label/value pair inside a grouped section. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum text-sm break-words">{children}</dd>
    </div>
  );
}

/** Grouped detail block: heading + separator + two-column definition grid. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <Separator />
      {children}
    </section>
  );
}

function OrderSideBadge({ side }: { side: string }) {
  const isBuy = side === "buy";
  return (
    <Badge
      variant="outline"
      className={isBuy ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"}
    >
      {isBuy ? "买" : "卖"}
    </Badge>
  );
}

function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs text-muted-foreground font-medium">时间</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">方向</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">类型</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium">状态</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-right">数量</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-right">已成交</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-right">价格</TableHead>
            <TableHead className="text-xs text-muted-foreground font-medium text-right">费用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={`${o.order_id}-${o.order_timestamp ?? 0}`}>
              <TableCell className="tnum text-xs">{formatTimestamp(o.order_timestamp)}</TableCell>
              <TableCell>
                <OrderSideBadge side={o.ft_order_side} />
              </TableCell>
              <TableCell className="text-xs">{o.order_type}</TableCell>
              <TableCell className="text-xs">{o.status}</TableCell>
              <TableCell className="tnum text-right">{formatNumber(o.amount)}</TableCell>
              <TableCell className="tnum text-right">{formatNumber(o.filled)}</TableCell>
              <TableCell className="tnum text-right">{formatPrice(o.safe_price)}</TableCell>
              <TableCell className="tnum text-right">
                {o.ft_fee_base === undefined ? "—" : formatNumber(o.ft_fee_base)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Confirmation-wrapped action. Keeps the dialog open while the mutation runs. */
function ConfirmAction({
  label,
  title,
  description,
  confirmLabel = "确认",
  variant = "outline",
  disabled = false,
  pending = false,
  children,
  run,
}: {
  label: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "outline" | "destructive";
  disabled?: boolean;
  pending?: boolean;
  /** Optional extra form controls inside the dialog (e.g. partial amount). */
  children?: ReactNode;
  run: (done: () => void) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm" disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel size="sm" disabled={pending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              run(() => setOpen(false));
            }}
          >
            {pending && <LoaderCircle className="size-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TradeDetailSheet({
  trade,
  open,
  onOpenChange,
}: {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const customData = useTradeCustomData(trade?.trade_id ?? 0, { enabled: open && Boolean(trade) });
  const reloadTrade = useReloadTrade();
  const cancelOpenOrder = useCancelOpenOrder();
  const forceExit = useForceExit();
  const deleteTrade = useDeleteTrade();
  const [exitAmount, setExitAmount] = useState("");

  const entries = customData.data?.[0]?.custom_data ?? [];

  // Reset the partial-exit input whenever another trade is shown.
  const tradeId = trade?.trade_id;
  useEffect(() => {
    setExitAmount("");
  }, [tradeId]);

  const finish = (message: string, done: () => void) => {
    toast.success(message);
    done();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {trade && (
          <>
            <SheetHeader>
              <SheetTitle>
                交易 #{trade.trade_id} · {trade.pair}
              </SheetTitle>
              <SheetDescription>
                策略 {trade.strategy} · 进场标签 {trade.enter_tag ?? "—"}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4">
              {/* a. 基本信息 */}
              <Section title="基本信息">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="策略">{trade.strategy}</Field>
                  <Field label="进场标签">{trade.enter_tag ?? "—"}</Field>
                  <Field label="周期">{trade.timeframe} 分钟</Field>
                  <Field label="交易所">{trade.exchange}</Field>
                  <Field label="交易模式">{trade.trading_mode ?? "—"}</Field>
                  <Field label="杠杆">{trade.leverage ? `${trade.leverage}x` : "—"}</Field>
                  <Field label="方向">
                    <Badge
                      variant="outline"
                      className={
                        trade.is_short
                          ? "border-destructive/40 text-destructive"
                          : "border-primary/40 text-primary"
                      }
                    >
                      {trade.is_short ? "空" : "多"}
                    </Badge>
                  </Field>
                  <Field label="状态">
                    {trade.is_open ? (
                      <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                        持仓中
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
                        已平仓
                      </Badge>
                    )}
                  </Field>
                </dl>
              </Section>

              {/* b. 价格 */}
              <Section title="价格">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="开仓价">{formatPrice(trade.open_rate)}</Field>
                  <Field label="平仓价">{trade.close_rate === undefined ? "—" : formatPrice(trade.close_rate)}</Field>
                  <Field label="开仓价值">{formatPrice(trade.open_trade_value)}</Field>
                  <Field label="投入金额">{formatPrice(trade.stake_amount)}</Field>
                  {trade.max_stake_amount !== undefined && (
                    <Field label="最大投入金额">{formatPrice(trade.max_stake_amount)}</Field>
                  )}
                </dl>
              </Section>

              {/* c. 盈亏 */}
              <Section title="盈亏">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="盈亏金额">
                    <ProfitText value={trade.profit_abs} />
                  </Field>
                  <Field label="盈亏比例">{formatPct(trade.profit_pct)}</Field>
                  <Field label="已实现盈亏">
                    <ProfitText value={trade.realized_profit} />
                  </Field>
                  {trade.close_profit_abs !== undefined && (
                    <Field label="平仓盈亏">
                      <ProfitText value={trade.close_profit_abs} />
                    </Field>
                  )}
                  {trade.fee_open_cost !== undefined && (
                    <Field label="开仓手续费">{formatNumber(trade.fee_open_cost)}</Field>
                  )}
                  {trade.fee_close_cost !== undefined && (
                    <Field label="平仓手续费">{formatNumber(trade.fee_close_cost)}</Field>
                  )}
                </dl>
              </Section>

              {/* d. 止损 */}
              <Section title="止损">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="初始止损">
                    {trade.initial_stop_loss_abs === undefined
                      ? "—"
                      : `${formatPrice(trade.initial_stop_loss_abs)} (${formatPct(trade.initial_stop_loss_pct)})`}
                  </Field>
                  <Field label="当前止损">
                    {trade.stop_loss_abs === undefined
                      ? "—"
                      : `${formatPrice(trade.stop_loss_abs)} (${formatPct(trade.stop_loss_pct)})`}
                  </Field>
                  <Field label="止损最后更新">{formatTimestamp(trade.stoploss_last_update_timestamp)}</Field>
                </dl>
              </Section>

              {/* e. 订单 */}
              <Section title="订单">
                {trade.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无订单</p>
                ) : (
                  <OrderTable orders={trade.orders} />
                )}
              </Section>

              {/* f. 自定义数据 */}
              {entries.length > 0 && (
                <Section title="自定义数据">
                  <dl className="space-y-2">
                    {entries.map((entry: CustomDataEntry) => (
                      <div key={entry.key} className="grid grid-cols-2 gap-x-4">
                        <dt className="text-xs text-muted-foreground break-words">{entry.key}</dt>
                        <dd className="tnum text-sm break-words">{JSON.stringify(entry.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}
            </div>

            <SheetFooter className="flex-row flex-wrap gap-2 border-t">
              <ConfirmAction
                label="从交易所重载"
                title="从交易所重载交易?"
                description="将重新从交易所同步该交易的订单与成交状态。"
                pending={reloadTrade.isPending}
                run={(done) =>
                  reloadTrade.mutate(trade.trade_id, {
                    onSuccess: () => finish("已重载交易数据", done),
                    onError: (e) => {
                      toast.error(e.message);
                      done();
                    },
                  })
                }
              />
              <ConfirmAction
                label="取消未成交单"
                title="取消未成交订单?"
                description="将撤销该交易在交易所上尚未成交的订单。"
                disabled={!trade.has_open_orders}
                pending={cancelOpenOrder.isPending}
                run={(done) =>
                  cancelOpenOrder.mutate(trade.trade_id, {
                    onSuccess: () => finish("已取消未成交订单", done),
                    onError: (e) => {
                      toast.error(e.message);
                      done();
                    },
                  })
                }
              />
              {trade.is_open && (
                <ConfirmAction
                  label="强制平仓"
                  title="强制平仓?"
                  description="将立即以市价平仓,操作不可撤销。留空数量则平掉全部持仓。"
                  confirmLabel="确认平仓"
                  pending={forceExit.isPending}
                  run={(done) => {
                    const trimmed = exitAmount.trim();
                    const amount = Number(trimmed);
                    // 非法数量曾静默落到「平全部」——资金操作必须拦下并明示
                    if (trimmed !== "" && (!Number.isFinite(amount) || amount <= 0)) {
                      toast.error("平仓数量必须为正数;留空则平掉全部持仓。");
                      done();
                      return;
                    }
                    forceExit.mutate(
                      {
                        tradeid: trade.trade_id,
                        ...(trimmed !== "" ? { amount } : {}),
                      },
                      {
                        onSuccess: () => finish("已发起强制平仓", done),
                        onError: (e) => {
                          toast.error(e.message);
                          done();
                        },
                      },
                    );
                  }}
                >
                  <div className="space-y-1.5 px-1">
                    <Label htmlFor="exit-amount" className="text-xs text-muted-foreground">
                      平仓数量(可选,留空为全部 {trade.amount})
                    </Label>
                    <Input
                      id="exit-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={exitAmount}
                      onChange={(e) => setExitAmount(e.target.value)}
                      placeholder={String(trade.amount)}
                      className="tnum"
                    />
                  </div>
                </ConfirmAction>
              )}
              <ConfirmAction
                label="删除交易"
                title="删除交易?"
                description="该交易记录将从数据库永久删除,不可恢复。"
                confirmLabel="确认删除"
                variant="destructive"
                pending={deleteTrade.isPending}
                run={(done) =>
                  deleteTrade.mutate(trade.trade_id, {
                    onSuccess: () => finish("交易已删除", done),
                    onError: (e) => {
                      toast.error(e.message);
                      done();
                    },
                  })
                }
              />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
