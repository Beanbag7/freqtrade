import { useState, type FormEvent } from "react";
import { LoaderCircle, Play, ScanSearch, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLookaheadResult,
  useRecursiveResult,
  useStartLookahead,
  useStartRecursive,
  useStrategies,
} from "@/lib/api/hooks";
import type {
  LookaheadAnalysisResult,
  RecursiveAnalysisResult,
} from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

/** 策略选择:列表可用时用下拉,否则降级为手输(与回测表单一致)。 */
function StrategyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const strategiesQuery = useStrategies({ retry: 1 });
  const strategies = strategiesQuery.data?.strategies ?? [];
  const manual =
    strategiesQuery.isError ||
    (strategiesQuery.isSuccess && strategies.length === 0);

  if (manual) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="策略名,如 SampleStrategy"
        aria-label="策略"
      />
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label="策略">
        <SelectValue placeholder="选择策略…" />
      </SelectTrigger>
      <SelectContent>
        {strategies.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RunState({ running, statusMsg }: { running: boolean; statusMsg?: string }) {
  if (!running) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {statusMsg || "分析运行中,可能需要数分钟…"}
    </p>
  );
}

/* ------------------------------ 前瞻偏差分析 ------------------------------ */

function LookaheadResultCard({ result }: { result: LookaheadAnalysisResult }) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          分析结果:{result.strategy}
          {result.has_bias ? (
            <Badge variant="destructive">检测到前瞻偏差</Badge>
          ) : (
            <Badge variant="outline" className="border-success/40 text-success">
              未发现偏差
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">信号总数</div>
            <div className="tnum text-lg font-semibold">{formatNumber(result.total_signals, 0)}</div>
          </div>
          <div className="rounded-md border border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">有偏差的进场信号</div>
            <div className="tnum text-lg font-semibold">{formatNumber(result.biased_entry_signals, 0)}</div>
          </div>
          <div className="rounded-md border border-border/60 px-3 py-2">
            <div className="text-xs text-muted-foreground">有偏差的出场信号</div>
            <div className="tnum text-lg font-semibold">{formatNumber(result.biased_exit_signals, 0)}</div>
          </div>
        </div>
        {result.biased_indicators.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">有偏差的指标</div>
            <ul className="flex flex-wrap gap-1.5">
              {result.biased_indicators.map((ind) => (
                <li key={ind}>
                  <Badge variant="destructive" className="px-2 py-0.5 text-xs">
                    {ind}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LookaheadTab() {
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [timerange, setTimerange] = useState("");
  const [minTrades, setMinTrades] = useState("10");
  const [targetTrades, setTargetTrades] = useState("20");
  const [allowLimitOrders, setAllowLimitOrders] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const start = useStartLookahead();
  const result = useLookaheadResult(jobId);

  const running = Boolean(jobId && (result.data ? result.data.running : result.isFetching));
  const failed = Boolean(result.data && !result.data.running && result.data.status === "error");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!strategy.trim()) {
      toast.error("请选择策略");
      return;
    }
    // N5:`|| 10` 会把合法的 0 吞掉,显式校验
    const min = minTrades.trim() === "" ? 10 : Number(minTrades);
    const target = targetTrades.trim() === "" ? 20 : Number(targetTrades);
    if (!Number.isFinite(min) || !Number.isFinite(target)) {
      toast.error("交易数必须是有效数字");
      return;
    }
    const payload: Record<string, unknown> = {
      strategy: strategy.trim(),
      minimum_trade_amount: min,
      targeted_trade_amount: target,
      lookahead_allow_limit_orders: allowLimitOrders,
    };
    if (timeframe.trim()) payload.timeframe = timeframe.trim();
    if (timerange.trim()) payload.timerange = timerange.trim();
    setJobId(null);
    start.mutate(payload, {
      onSuccess: (d) => {
        setJobId(d.job_id);
        toast.success("前瞻偏差分析已开始");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardContent className="pt-6">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">策略</Label>
              <StrategyField value={strategy} onChange={setStrategy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="la-tf" className="text-xs text-muted-foreground">
                时间框架(可选)
              </Label>
              <Input
                id="la-tf"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="如 5m"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="la-tr" className="text-xs text-muted-foreground">
                回测区间(可选)
              </Label>
              <Input
                id="la-tr"
                value={timerange}
                onChange={(e) => setTimerange(e.target.value)}
                placeholder="如 20250901-20251001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="la-min" className="text-xs text-muted-foreground">
                最少交易数
              </Label>
              <Input
                id="la-min"
                type="number"
                className="tnum"
                value={minTrades}
                onChange={(e) => setMinTrades(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="la-target" className="text-xs text-muted-foreground">
                目标交易数
              </Label>
              <Input
                id="la-target"
                type="number"
                className="tnum"
                value={targetTrades}
                onChange={(e) => setTargetTrades(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 pb-1.5">
              <Switch
                id="la-limit"
                checked={allowLimitOrders}
                onCheckedChange={setAllowLimitOrders}
                aria-label="允许限价单"
              />
              <Label htmlFor="la-limit" className="text-xs text-muted-foreground">
                允许限价单
              </Label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" className="gap-1.5" disabled={start.isPending || running}>
                <Play className="size-3.5" />
                {running ? "分析中…" : "开始分析"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.isError && <ErrorAlert title="分析状态获取失败" error={result.error} />}
      {failed && (
        <ErrorAlert title="分析失败" error={new Error(result.data?.status_msg ?? "未知错误")} />
      )}
      <RunState running={running} statusMsg={result.data?.status_msg} />
      {result.data?.result && <LookaheadResultCard result={result.data.result} />}
      {!jobId && !result.isError && (
        <EmptyState
          title="检查策略是否使用了未来数据"
          description="前瞻偏差分析会截断信号后的数据再跑一次回测,对比信号是否变化。仅在网页服务器模式下可用。"
        />
      )}
    </div>
  );
}

/* ------------------------------ 递归分析 ------------------------------ */

function RecursiveResultCard({ result }: { result: RecursiveAnalysisResult }) {
  const indicators = Object.keys(result.results ?? {}).sort();
  const candles = result.startup_candles ?? [];
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          分析结果:{result.strategy}
          {result.strategy_scc !== null && (
            <Badge variant="outline" className="tnum px-1.5 text-xs">
              策略声明 startup_candle_count = {result.strategy_scc}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {indicators.length === 0 ? (
          <EmptyState title="没有指标数据" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground">指标</TableHead>
                  {candles.map((c) => (
                    <TableHead
                      key={c}
                      className="text-right text-xs font-medium text-muted-foreground"
                    >
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((ind) => (
                  <TableRow key={ind}>
                    <TableCell className="font-medium">{ind}</TableCell>
                    {candles.map((c) => {
                      const v = result.results[ind]?.[String(c)];
                      const valid = typeof v === "number" && Number.isFinite(v);
                      return (
                        <TableCell key={c} className="tnum text-right text-sm">
                          {valid ? formatNumber(v, 6) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          数值为指标在不同启动 K 线数下的方差;非零表示指标对启动 K 线数敏感(存在递归依赖)。
        </p>
      </CardContent>
    </Card>
  );
}

function RecursiveTab() {
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [timerange, setTimerange] = useState("");
  const [startupCandles, setStartupCandles] = useState("199, 399, 499");
  const [jobId, setJobId] = useState<string | null>(null);

  const start = useStartRecursive();
  const result = useRecursiveResult(jobId);

  const running = Boolean(jobId && (result.data ? result.data.running : result.isFetching));
  const failed = Boolean(result.data && !result.data.running && result.data.status === "error");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!strategy.trim()) {
      toast.error("请选择策略");
      return;
    }
    // 后端强制要求 timerange(recursive_helpers.py 缺省直接报错),前端先拦住
    if (!timerange.trim()) {
      toast.error("递归分析必须填写回测区间");
      return;
    }
    const candles = startupCandles
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    const payload: Record<string, unknown> = { strategy: strategy.trim(), timerange: timerange.trim() };
    if (timeframe.trim()) payload.timeframe = timeframe.trim();
    if (candles.length > 0) payload.startup_candle = candles;
    setJobId(null);
    start.mutate(payload, {
      onSuccess: (d) => {
        setJobId(d.job_id);
        toast.success("递归分析已开始");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardContent className="pt-6">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">策略</Label>
              <StrategyField value={strategy} onChange={setStrategy} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-tf" className="text-xs text-muted-foreground">
                时间框架(可选)
              </Label>
              <Input
                id="ra-tf"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="如 5m"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-tr" className="text-xs text-muted-foreground">
                回测区间(必填)
              </Label>
              <Input
                id="ra-tr"
                value={timerange}
                onChange={(e) => setTimerange(e.target.value)}
                placeholder="如 20250901-20251001"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ra-sc" className="text-xs text-muted-foreground">
                启动 K 线数(逗号分隔)
              </Label>
              <Input
                id="ra-sc"
                className="tnum"
                value={startupCandles}
                onChange={(e) => setStartupCandles(e.target.value)}
                placeholder="如 199, 399, 499"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="gap-1.5" disabled={start.isPending || running}>
                <Play className="size-3.5" />
                {running ? "分析中…" : "开始分析"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.isError && (
        <div className="space-y-1.5">
          <ErrorAlert title="分析状态获取失败" error={result.error} />
          {result.error.message.includes("500") && (
            <p className="text-xs text-muted-foreground">
              若结果含非数值(NaN)方差,后端会返回 500——属已知后端限制,换更短的区间或更少启动
              K 线数重试。
            </p>
          )}
        </div>
      )}
      {failed && (
        <ErrorAlert title="分析失败" error={new Error(result.data?.status_msg ?? "未知错误")} />
      )}
      <RunState running={running} statusMsg={result.data?.status_msg} />
      {result.data?.result && <RecursiveResultCard result={result.data.result} />}
      {!jobId && !result.isError && (
        <EmptyState
          title="检查指标对启动 K 线数的敏感度"
          description="递归分析用不同的 startup_candle_count 多次运行,对比指标值的方差。仅在网页服务器模式下可用。"
        />
      )}
    </div>
  );
}

/** 策略分析工具(对齐旧 freqUI 的 lookahead_analysis / recursive_analysis 页)。 */
export default function AnalysisPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="策略分析"
        description="前瞻偏差与递归启动 K 线敏感度检查(仅网页服务器模式)"
      />
      <Tabs defaultValue="lookahead" className="gap-4">
        <TabsList>
          <TabsTrigger value="lookahead" className="gap-1.5 px-3">
            <ScanSearch className="size-3.5" />
            前瞻偏差
          </TabsTrigger>
          <TabsTrigger value="recursive" className="gap-1.5 px-3">
            <Shuffle className="size-3.5" />
            递归分析
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lookahead">
          <LookaheadTab />
        </TabsContent>
        <TabsContent value="recursive">
          <RecursiveTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
