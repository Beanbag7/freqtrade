import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ListChecks, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorAlert } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useBlacklist,
  useEvaluatePairlists,
  usePairlistEvalResult,
  usePairlistsAvailable,
  useShowConfig,
} from "@/lib/api/hooks";
import type { PairListParamSpec, PairListResponse } from "@/lib/api/types";

/** 链上的一步:method + 参数覆盖值。 */
interface ChainStep {
  method: string;
  params: Record<string, unknown>;
}

function defaultParams(spec: PairListResponse): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, p] of Object.entries(spec.params ?? {})) {
    if (p.default !== undefined && p.default !== null) out[key] = p.default;
  }
  return out;
}

/** 单个参数输入:按 schema 类型渲染 number / option / boolean / list(只读) / text。 */
function ParamField({
  name,
  spec,
  value,
  onChange,
  idPrefix = "",
}: {
  name: string;
  spec: PairListParamSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  /** 链步骤序号前缀,避免多个处理器同名参数产生重复 DOM id(N3)。 */
  idPrefix?: string;
}) {
  const id = `pl-param-${idPrefix}${name}`;
  const label = spec.description || name;
  if (spec.type === "list") {
    // list 参数(如 MarketCapPairList 的列表项)编辑后以 string 提交会导致后端类型错误;
    // 未编辑器透传默认数组无妨,因此此处只读展示(N2)。
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <Input
          id={id}
          className="tnum h-8 text-sm"
          value={Array.isArray(value ?? spec.default) ? JSON.stringify(value ?? spec.default) : ""}
          disabled
          title="列表参数请在配置文件中编辑"
        />
      </div>
    );
  }
  if (spec.type === "option" && spec.options?.length) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <Select
          value={typeof value === "string" ? value : String(spec.default ?? "")}
          onValueChange={onChange}
        >
          <SelectTrigger id={id} className="h-8 w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spec.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (spec.type === "boolean" || typeof spec.default === "boolean") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <Switch
          id={id}
          checked={Boolean(value ?? spec.default ?? false)}
          onCheckedChange={onChange}
          aria-label={label}
        />
      </div>
    );
  }
  if (spec.type === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <Input
          id={id}
          type="number"
          className="tnum h-8 text-sm"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={spec.default === null || spec.default === undefined ? "" : String(spec.default)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(undefined);
              return;
            }
            const n = Number(raw);
            onChange(Number.isNaN(n) ? undefined : n);
          }}
        />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        className="h-8 text-sm"
        value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
        placeholder={spec.default === null || spec.default === undefined ? "" : String(spec.default)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      />
    </div>
  );
}

/**
 * 交易对配置器(对齐旧 freqUI 的 pairlist_config 页):
 * 组装 pairlist 链 → 后台评估 → 展示评估出的白名单。仅网页服务器模式可用。
 */
export function PairlistConfigTab() {
  const available = usePairlistsAvailable();
  const showConfig = useShowConfig();
  // 交易模式机器人上 /blacklist 会 503,此处仅用于预填,失败则留空
  const blacklistQuery = useBlacklist({ retry: 1 });

  const [chain, setChain] = useState<ChainStep[]>([]);
  const [addName, setAddName] = useState("");
  const [blacklistText, setBlacklistText] = useState("");
  const [blacklistTouched, setBlacklistTouched] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const evaluate = useEvaluatePairlists();
  const evalResult = usePairlistEvalResult(jobId);

  // 黑名单接口可用时预填一次(用户改过后不再覆盖)
  useEffect(() => {
    if (!blacklistTouched && blacklistQuery.data?.blacklist) {
      setBlacklistText(blacklistQuery.data.blacklist.join("\n"));
    }
  }, [blacklistQuery.data, blacklistTouched]);

  const specsByName = useMemo(() => {
    const map = new Map<string, PairListResponse>();
    for (const p of available.data?.pairlists ?? []) map.set(p.name, p);
    return map;
  }, [available.data]);

  const addStep = () => {
    const spec = specsByName.get(addName);
    if (!spec) return;
    setChain((prev) => [...prev, { method: spec.name, params: defaultParams(spec) }]);
    setAddName("");
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setChain((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateParam = (idx: number, key: string, value: unknown) => {
    setChain((prev) =>
      prev.map((step, i) =>
        i === idx ? { ...step, params: { ...step.params, [key]: value } } : step,
      ),
    );
  };

  // 提交后到首轮轮询返回前也算进行中(B1+N6:首轮前 data 为 undefined)
  const running = Boolean(
    jobId &&
      (evalResult.data
        ? evalResult.data.status !== "success" && !evalResult.data.error
        : evalResult.isFetching),
  );

  const runEvaluate = () => {
    if (chain.length === 0) {
      toast.error("请先添加至少一个 pairlist");
      return;
    }
    const stakeCurrency = showConfig.data?.stake_currency;
    if (!stakeCurrency) {
      toast.error("无法读取 stake_currency");
      return;
    }
    const blacklist = blacklistText
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setJobId(null);
    evaluate.mutate(
      {
        pairlists: chain.map((step) => {
          const params: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(step.params)) {
            if (v !== undefined) params[k] = v;
          }
          return { method: step.method, ...params };
        }),
        blacklist,
        stake_currency: stakeCurrency,
      },
      {
        onSuccess: (data) => {
          setJobId(data.job_id);
          toast.success("评估已在后台开始");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  if (available.isPending) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="加载中">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }
  if (available.isError) {
    return (
      <div className="space-y-2">
        <ErrorAlert title="无法加载 pairlist 列表" error={available.error} />
        <p className="text-sm text-muted-foreground">
          交易对配置器仅在网页服务器模式(webserver)下可用。
        </p>
      </div>
    );
  }

  const result = evalResult.data?.result;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 左:链路编辑 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Pairlist 链</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">添加处理器</Label>
              <Select value={addName} onValueChange={setAddName}>
                <SelectTrigger className="h-9 w-full text-sm" aria-label="选择 pairlist">
                  <SelectValue placeholder="选择要添加的 pairlist…" />
                </SelectTrigger>
                <SelectContent>
                  {(available.data?.pairlists ?? []).map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        {p.is_pairlist_generator && (
                          <Badge variant="outline" className="px-1 text-[10px]">
                            生成器
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={addStep}
              disabled={!addName}
            >
              <Plus className="size-3.5" />
              添加
            </Button>
          </div>

          {chain.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
              链为空 — 从上方添加 pairlist(第一个通常应为生成器,如 StaticPairList / VolumePairList)
            </p>
          ) : (
            <ol className="space-y-2">
              {chain.map((step, idx) => {
                const spec = specsByName.get(step.method);
                return (
                  <li
                    key={`${step.method}-${idx}`}
                    className="rounded-md border border-border/70 bg-card px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="tnum text-xs text-muted-foreground">{idx + 1}.</span>
                      <span className="text-sm font-medium">{step.method}</span>
                      {spec?.is_pairlist_generator && (
                        <Badge variant="outline" className="px-1 text-[10px]">
                          生成器
                        </Badge>
                      )}
                      <span className="ml-auto flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="上移"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="下移"
                          disabled={idx === chain.length - 1}
                          onClick={() => moveStep(idx, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="移除"
                          onClick={() => setChain((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </span>
                    </div>
                    {spec && Object.keys(spec.params ?? {}).length > 0 && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {Object.entries(spec.params).map(([key, p]) => (
                          <ParamField
                            key={key}
                            name={key}
                            spec={p}
                            value={step.params[key]}
                            onChange={(v) => updateParam(idx, key, v)}
                            idPrefix={`${idx}-`}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pl-blacklist" className="text-xs text-muted-foreground">
              评估用黑名单(每行一个交易对)
            </Label>
            <Textarea
              id="pl-blacklist"
              rows={3}
              className="tnum text-sm"
              value={blacklistText}
              onChange={(e) => {
                setBlacklistText(e.target.value);
                setBlacklistTouched(true);
              }}
              placeholder="留空则不使用黑名单"
            />
          </div>

          <Button
            type="button"
            className="gap-1.5"
            onClick={runEvaluate}
            disabled={evaluate.isPending || running || chain.length === 0}
          >
            <Play className="size-3.5" />
            {running ? "评估中…" : "评估"}
          </Button>
        </CardContent>
      </Card>

      {/* 右:评估结果 */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" />
            评估结果
            {result && (
              <Badge variant="outline" className="tnum px-1.5 text-xs">
                {result.length} 个交易对
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evalResult.isError && <ErrorAlert title="评估失败" error={evalResult.error} />}
          {evalResult.data?.error && (
            <ErrorAlert title="评估任务失败" error={new Error(evalResult.data.error)} />
          )}
          {running && (
            <p className="text-sm text-muted-foreground">正在后台评估,请稍候…</p>
          )}
          {!jobId && !evalResult.isError && (
            <p className="text-sm text-muted-foreground">
              配置好左侧的链之后点击「评估」,这里会显示产出的白名单。
            </p>
          )}
          {result && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                方法链:{result.method.join(" → ")}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {result.whitelist.map((pair) => (
                  <li key={pair}>
                    <Badge variant="secondary" className="tnum px-2 py-0.5 text-xs">
                      {pair}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
