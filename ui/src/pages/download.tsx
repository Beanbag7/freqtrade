import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Download, ListPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useBackgroundTasks,
  useDownloadData,
  useMarkets,
  useShowConfig,
  useWhitelist,
} from "@/lib/api/hooks";
import { PageHeader } from "@/components/shared/blocks";
import { ErrorAlert } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const TIMEFRAME_CHOICES = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d"];

type RangeMode = "days" | "timerange";

/**
 * Download/backtest jobs report per-subtask progress in `progress_tasks`
 * (top-level `progress` stays null) — aggregate those for the bar and list
 * each subtask's description underneath.
 */
function renderTaskProgress(task: {
  progress?: number;
  progress_tasks?: Record<string, { description?: string; progress?: number; total?: number }>;
}) {
  const subtasks = Object.values(task.progress_tasks ?? {});
  let pct: number | null = null;
  if (typeof task.progress === "number") {
    pct = Math.round(task.progress * 100);
  } else if (subtasks.length > 0) {
    const done = subtasks.reduce((s, t) => s + (t.progress ?? 0), 0);
    const total = subtasks.reduce((s, t) => s + (t.total ?? 0), 0);
    if (total > 0) pct = Math.round((done / total) * 100);
  }
  if (pct === null && subtasks.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {pct !== null && (
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tnum">{pct}%</span>
        </div>
      )}
      {subtasks.slice(0, 4).map((t, i) => (
        <p key={t.description ?? i} className="truncate text-xs text-muted-foreground">
          {t.description ?? "子任务"}
          {t.total ? (
            <span className="tnum"> {Math.round(((t.progress ?? 0) / t.total) * 100)}%</span>
          ) : null}
        </p>
      ))}
      {subtasks.length > 4 && (
        <p className="text-xs text-muted-foreground">…另有 {subtasks.length - 4} 个子任务</p>
      )}
    </div>
  );
}

export default function DownloadPage() {
  const { data: config } = useShowConfig();
  const { data: whitelist } = useWhitelist();
  const { data: markets } = useMarkets(config?.stake_currency);
  const { data: tasks } = useBackgroundTasks();
  const download = useDownloadData();

  const [pairs, setPairs] = useState<string[]>([]);
  const [timeframes, setTimeframes] = useState<string[]>([]);
  const [rangeMode, setRangeMode] = useState<RangeMode>("days");
  const [days, setDays] = useState("30");
  const [timerange, setTimerange] = useState("");
  const [erase, setErase] = useState(false);
  const [downloadTrades, setDownloadTrades] = useState(false);
  const [pairPickerOpen, setPairPickerOpen] = useState(false);

  const effectiveTimeframes = timeframes.length > 0 ? timeframes : config?.timeframe ? [config.timeframe] : [];
  const marketPairs = useMemo(() => Object.keys(markets?.markets ?? {}).sort(), [markets]);

  const addPair = (pair: string) => {
    setPairs((prev) => (prev.includes(pair) ? prev : [...prev, pair]));
  };
  const removePair = (pair: string) => {
    setPairs((prev) => prev.filter((p) => p !== pair));
  };
  const toggleTimeframe = (tf: string) => {
    setTimeframes((prev) => (prev.includes(tf) ? prev.filter((t) => t !== tf) : [...prev, tf]));
  };

  const daysNum = Number(days);
  const timerangeValid = /^\d{8}-\d{8}$/.test(timerange.trim());
  const canSubmit =
    pairs.length > 0 &&
    effectiveTimeframes.length > 0 &&
    (rangeMode === "days" ? Number.isFinite(daysNum) && daysNum > 0 : timerangeValid) &&
    !download.isPending;

  const submit = () => {
    download.mutate(
      {
        pairs,
        timeframes: effectiveTimeframes,
        ...(rangeMode === "days" ? { days: daysNum } : { timerange: timerange.trim() }),
        erase,
        download_trades: downloadTrades,
      },
      {
        onSuccess: (res) => toast.success(`下载任务已启动 (${res.job_id})`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const activeTasks = (tasks ?? []).filter((t) => t.job_category !== "backtest");

  return (
    <div className="space-y-4">
      <PageHeader
        title="数据下载"
        description="从交易所下载历史 K 线 / 逐笔成交数据,供回测与分析使用;数据保存到 user_data/data,不影响实盘交易。"
      />

      {download.isError && <ErrorAlert error={download.error} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------ Form ------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>新建下载任务</CardTitle>
            <CardDescription>选择交易对与时间范围,任务在机器人后台执行。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pairs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>交易对</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setPairs(whitelist?.whitelist ?? [])}
                  disabled={!whitelist?.whitelist.length}
                >
                  <ListPlus className="size-3.5" aria-hidden />
                  使用白名单 ({whitelist?.whitelist.length ?? 0})
                </Button>
              </div>
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-card p-2">
                {pairs.length === 0 && (
                  <span className="text-xs text-muted-foreground">尚未选择交易对</span>
                )}
                {pairs.map((pair) => (
                  <Badge key={pair} variant="secondary" className="gap-1">
                    {pair}
                    <button
                      type="button"
                      aria-label={`移除 ${pair}`}
                      className="rounded-sm hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => removePair(pair)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
              <Popover open={pairPickerOpen} onOpenChange={setPairPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between font-normal">
                    添加交易对({config?.stake_currency ?? "…"} 计价)
                    <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索交易对…" />
                    <CommandList>
                      <CommandEmpty>无匹配市场</CommandEmpty>
                      <CommandGroup>
                        {marketPairs.slice(0, 200).map((pair) => (
                          <CommandItem
                            key={pair}
                            value={pair}
                            onSelect={() => {
                              addPair(pair);
                              setPairPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                pairs.includes(pair) ? "opacity-100" : "opacity-0",
                              )}
                              aria-hidden
                            />
                            {pair}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Timeframes */}
            <div className="space-y-2">
              <Label>
                时间粒度
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {timeframes.length === 0 ? `未选则用当前周期 ${config?.timeframe ?? "…"}` : ""}
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAME_CHOICES.map((tf) => (
                  <Button
                    key={tf}
                    variant={timeframes.includes(tf) ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs tnum"
                    onClick={() => toggleTimeframe(tf)}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>

            {/* Range */}
            <div className="space-y-2">
              <Label>时间范围</Label>
              <div className="flex gap-1.5">
                <Button
                  variant={rangeMode === "days" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRangeMode("days")}
                >
                  最近 N 天
                </Button>
                <Button
                  variant={rangeMode === "timerange" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRangeMode("timerange")}
                >
                  起止日期
                </Button>
              </div>
              {rangeMode === "days" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-28 tnum"
                    aria-label="天数"
                  />
                  <span className="text-xs text-muted-foreground">天(1-3650)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    value={timerange}
                    onChange={(e) => setTimerange(e.target.value)}
                    placeholder="20250101-20250201"
                    className="w-52 tnum"
                    aria-label="起止日期"
                  />
                  <p className={cn("text-xs", timerange && !timerangeValid ? "text-destructive" : "text-muted-foreground")}>
                    格式 YYYYMMDD-YYYYMMDD
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="dl-trades" className="text-control">下载逐笔成交</Label>
                  <p className="text-xs text-muted-foreground">下载 trades 数据而非 K 线(数据量大,较慢)</p>
                </div>
                <Switch id="dl-trades" checked={downloadTrades} onCheckedChange={setDownloadTrades} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="dl-erase" className="text-control">清空后重新下载</Label>
                  <p className="text-xs text-muted-foreground">删除所选交易对的已有数据文件再下载</p>
                </div>
                <Switch id="dl-erase" checked={erase} onCheckedChange={setErase} />
              </div>
            </div>

            <Button className="w-full gap-1.5" disabled={!canSubmit} onClick={submit}>
              <Download className="size-4" aria-hidden />
              {download.isPending ? "正在提交…" : `开始下载 (${pairs.length} 对 × ${effectiveTimeframes.length} 粒度)`}
            </Button>
          </CardContent>
        </Card>

        {/* --------------------------- Background jobs --------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>后台任务</CardTitle>
            <CardDescription>下载与数据处理任务的实时进度。</CardDescription>
          </CardHeader>
          <CardContent>
            {activeTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无后台任务</p>
            ) : (
              <ul className="space-y-4">
                {activeTasks.map((task) => (
                  <li key={task.job_id} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{task.job_category}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          task.error
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : task.running
                              ? "border-info/40 bg-info/10 text-info"
                              : "border-success/40 bg-success/10 text-success",
                        )}
                      >
                        {task.error ? "失败" : task.running ? "运行中" : task.status || "已完成"}
                      </Badge>
                    </div>
                    {renderTaskProgress(task)}
                    {task.error && <p className="text-xs text-destructive">{task.error}</p>}
                    <p className="text-xs text-muted-foreground tnum">{task.job_id}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
