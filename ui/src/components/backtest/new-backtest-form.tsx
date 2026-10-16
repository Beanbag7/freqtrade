import { useState, type FormEvent } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useStartBacktest, useStrategies } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
}

/** Run-parameters form, collapsed by default; strategy uses Select with manual Input fallback. */
export function NewBacktestForm() {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState("");
  const [timerange, setTimerange] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [maxOpenTrades, setMaxOpenTrades] = useState("");
  const [protections, setProtections] = useState(false);

  const strategiesQuery = useStrategies();
  const startBacktest = useStartBacktest();

  const strategies = strategiesQuery.data?.strategies ?? [];
  // 列表加载失败或为空时,降级为手输
  const manualStrategy = strategiesQuery.isError || (strategiesQuery.isSuccess && strategies.length === 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const payload: Record<string, unknown> = {
      strategy: strategy.trim(),
      enable_protections: protections,
    };

    const range = timerange.trim();
    if (range) payload.timerange = range;

    const stake = parseOptionalNumber(stakeAmount);
    if (stake !== null) {
      if (Number.isNaN(stake)) {
        toast.error("单笔投入必须是有效的数字");
        return;
      }
      payload.stake_amount = stake;
    }

    const maxOpen = parseOptionalNumber(maxOpenTrades);
    if (maxOpen !== null) {
      if (Number.isNaN(maxOpen)) {
        toast.error("最大持仓必须是有效的数字");
        return;
      }
      payload.max_open_trades = maxOpen;
    }

    startBacktest.mutate(payload, {
      onSuccess: () => {
        toast.success("回测已开始");
        setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Card className="shadow-xs">
      <CardContent>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="text-base font-semibold">新建回测</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bt-strategy">策略 *</Label>
                {manualStrategy ? (
                  <Input
                    id="bt-strategy"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    placeholder="输入策略名称"
                    required
                  />
                ) : (
                  <Select value={strategy} onValueChange={setStrategy}>
                    <SelectTrigger id="bt-strategy" className="w-full">
                      <SelectValue placeholder={strategiesQuery.isLoading ? "加载中…" : "选择策略"} />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-timerange">时间范围</Label>
                <Input
                  id="bt-timerange"
                  value={timerange}
                  onChange={(e) => setTimerange(e.target.value)}
                  placeholder="20250901-20251001"
                  className="tnum"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-stake">单笔投入</Label>
                <Input
                  id="bt-stake"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="可留空"
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-max-open">最大持仓</Label>
                <Input
                  id="bt-max-open"
                  type="number"
                  value={maxOpenTrades}
                  onChange={(e) => setMaxOpenTrades(e.target.value)}
                  placeholder="可留空"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-2.5 self-end pb-1">
                <Switch id="bt-protections" checked={protections} onCheckedChange={setProtections} />
                <Label htmlFor="bt-protections">启用保护</Label>
              </div>
              <div className="flex items-center justify-end pt-1 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={startBacktest.isPending || !strategy.trim()}>
                  {startBacktest.isPending && <LoaderCircle className="size-4 animate-spin" />}
                  开始回测
                </Button>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
