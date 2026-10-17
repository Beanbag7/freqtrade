import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Info, Zap, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForceEnter, useShowConfig, useWhitelist } from "@/lib/api/hooks";
import type { ForceEnterPayload } from "@/lib/api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/** 交易对选择:Popover + Command,白名单选项 + 任意手输值。 */
function PairCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="fe-pair"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="交易对"
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "选择或输入交易对"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="搜索或直接输入,如 BTC/USDT"
            value={value}
            onValueChange={(v) => onChange(v.toUpperCase())}
          />
          <CommandList>
            <CommandEmpty>暂无匹配的白名单交易对,可直接保留输入值</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value.toUpperCase() === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** 手动开仓卡:force_entry_enable=false 时整卡降级为 Alert。 */
export function ForceEnterCard() {
  const { data: config, isLoading } = useShowConfig();
  const { data: whitelist } = useWhitelist();
  const forceEnter = useForceEnter();

  const [pair, setPair] = useState("");
  const [side, setSide] = useState<"long" | "short">("long");
  const [ordertype, setOrdertype] = useState<"limit" | "market">("limit");
  const [stakeamount, setStakeamount] = useState("");
  const [price, setPrice] = useState("");
  const [leverage, setLeverage] = useState("");
  const [entryTag, setEntryTag] = useState("");
  const [confirmPayload, setConfirmPayload] = useState<ForceEnterPayload | null>(null);

  if (isLoading) {
    return (
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">手动开仓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 配置未加载完成或先后顺序问题时的兜底(不渲染表单,避免误提交)
  if (!config) return null;

  if (!config.force_entry_enable) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle>手动开仓已禁用</AlertTitle>
        <AlertDescription>
          当前配置禁用了手动开仓(force_entry_enable=false)。
        </AlertDescription>
      </Alert>
    );
  }

  const isLimit = ordertype === "limit";
  const isFutures = config.trading_mode === "futures";

  const buildPayload = (): ForceEnterPayload | null => {
    const p = pair.trim().toUpperCase();
    if (!p) {
      toast.error("请输入交易对");
      return null;
    }
    const payload: ForceEnterPayload = { pair: p, side, ordertype };
    const stake = Number(stakeamount);
    if (stakeamount.trim() !== "" && Number.isFinite(stake) && stake > 0) payload.stakeamount = stake;
    if (isLimit) {
      const pr = Number(price);
      if (price.trim() !== "" && Number.isFinite(pr) && pr > 0) payload.price = pr;
    }
    if (isFutures) {
      const lev = Number(leverage);
      if (leverage.trim() !== "" && Number.isFinite(lev) && lev >= 1) payload.leverage = lev;
    }
    const tag = entryTag.trim();
    if (tag) payload.entry_tag = tag;
    return payload;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (payload) setConfirmPayload(payload);
  };

  const confirmText = confirmPayload
    ? [
        `交易对:${confirmPayload.pair}`,
        `方向:${confirmPayload.side === "long" ? "多" : "空"}`,
        confirmPayload.stakeamount !== undefined && confirmPayload.stakeamount !== null
          ? `投入金额:${confirmPayload.stakeamount}`
          : `投入金额:${config.stake_amount}(未填,按默认投入)`,
        `订单类型:${confirmPayload.ordertype === "limit" ? "限价" : "市价"}`,
      ].join("\n")
    : "";

  const handleConfirmed = () => {
    if (!confirmPayload) return;
    forceEnter.mutate(confirmPayload, {
      onSuccess: (res) => {
        const r = res as { trade_id?: number; status?: string } | undefined;
        if (r && typeof r.trade_id === "number") toast.success(`已开仓 #${r.trade_id}`);
        else toast.error(r?.status ?? "开仓失败");
        setConfirmPayload(null);
      },
      onError: (e) => {
        toast.error(e.message);
        setConfirmPayload(null);
      },
    });
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">手动开仓</CardTitle>
        <CardDescription>绕过策略信号,按当前配置立即开仓</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fe-pair">交易对</Label>
            <PairCombobox value={pair} onChange={setPair} options={whitelist?.whitelist ?? []} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fe-side">方向</Label>
            <Select value={side} onValueChange={(v) => setSide(v as "long" | "short")}>
              <SelectTrigger id="fe-side" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">多 (long)</SelectItem>
                {config.short_allowed && <SelectItem value="short">空 (short)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fe-ordertype">订单类型</Label>
            <Select value={ordertype} onValueChange={(v) => setOrdertype(v as "limit" | "market")}>
              <SelectTrigger id="fe-ordertype" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="limit">限价 (limit)</SelectItem>
                <SelectItem value="market">市价 (market)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fe-stake">投入金额</Label>
            <Input
              id="fe-stake"
              type="number"
              inputMode="decimal"
              min={0}
              className="tnum"
              placeholder={config.stake_amount}
              value={stakeamount}
              onChange={(e) => setStakeamount(e.target.value)}
            />
          </div>
          {isLimit && (
            <div className="space-y-1.5">
              <Label htmlFor="fe-price">价格</Label>
              <Input
                id="fe-price"
                type="number"
                inputMode="decimal"
                min={0}
                className="tnum"
                placeholder="可选,留空用最新价"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}
          {isFutures && (
            <div className="space-y-1.5">
              <Label htmlFor="fe-leverage">杠杆</Label>
              <Input
                id="fe-leverage"
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                className="tnum"
                placeholder="1"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="fe-tag">进场标签</Label>
            <Input
              id="fe-tag"
              placeholder="force_entry"
              value={entryTag}
              onChange={(e) => setEntryTag(e.target.value)}
            />
          </div>
          <div className="flex items-end justify-end sm:col-span-2">
            <Button type="submit" disabled={forceEnter.isPending}>
              开仓
            </Button>
          </div>
        </form>

        {/* 确认弹窗:列出交易对 / 方向 / 金额 */}
        <AlertDialog open={Boolean(confirmPayload)} onOpenChange={(o) => !o && setConfirmPayload(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认手动开仓?</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line" >
                {confirmText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmed} disabled={forceEnter.isPending}>
                <Zap className="size-3.5" aria-hidden />
                确认开仓
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
