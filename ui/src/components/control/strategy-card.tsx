import { useState } from "react";
import { useShowConfig, useStrategy, useStrategies } from "@/lib/api/hooks";
import type { StrategyParameter } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ErrorAlert, EmptyState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function paramRange(p: StrategyParameter): string {
  if (p.param_type === "BooleanParameter" || p.param_type === "CategoricalParameter") {
    return Array.isArray(p.opt_range) && p.opt_range.length > 0
      ? p.opt_range.map(String).join(" / ")
      : "—";
  }
  return `${String(p.low ?? "—")} ~ ${String(p.high ?? "—")}`;
}

/** 单个策略详情:timeframe + 参数表 + 代码。 */
export function StrategyDetails({ name }: { name: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useStrategy(name);

  if (!name) {
    return <p className="text-xs text-muted-foreground">未找到策略名称,无法查询详情。</p>;
  }
  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-md" aria-busy="true" />;
  }
  if (isError) {
    return <ErrorAlert title={`策略 ${name} 详情加载失败`} error={error} onRetry={() => refetch()} />;
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      {data.timeframe && (
        <p className="text-xs text-muted-foreground">时间框架:{data.timeframe}</p>
      )}
      {data.params.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs text-muted-foreground font-medium">参数</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">空间</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">类型</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">当前值</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">可选范围</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.params.map((p) => (
                <TableRow key={`${p.space}-${p.name}`}>
                  <TableCell className="font-mono text-xs">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.space}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.param_type}</TableCell>
                  <TableCell className="tnum">{String(p.value)}</TableCell>
                  <TableCell className="tnum">{paramRange(p)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data.code && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">策略代码</p>
          <pre className="font-mono text-xs">
            <ScrollArea className="h-64 rounded-md border bg-muted/40">
              <code className="block w-max min-w-full p-3 leading-relaxed">{data.code}</code>
            </ScrollArea>
          </pre>
        </div>
      )}
    </div>
  );
}

function StrategyItem({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-full justify-between rounded-none text-muted-foreground hover:text-foreground"
        >
          <span className="text-control font-medium text-foreground">{name}</span>
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-4">{open && <StrategyDetails name={name} />}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** 策略卡:策略列表(展开查看详情);列表不可用时降级到当前策略。 */
export function StrategyCard() {
  const { data: list, isLoading, isError } = useStrategies();
  const { data: config } = useShowConfig();

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">策略</CardTitle>
        {config?.strategy && (
          <CardDescription>当前策略:{config.strategy}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-2/3 rounded-md" />
          </div>
        )}

        {isError && (
          <>
            <Alert>
              <AlertTitle>正常运行模式限制</AlertTitle>
              <AlertDescription>
                运行模式仅支持查看当前策略
                {config?.strategy ? `(${config.strategy})` : ""},策略列表接口不可用。
              </AlertDescription>
            </Alert>
            <StrategyDetails name={config?.strategy} />
          </>
        )}

        {list && list.strategies.length > 0 && (
          <div className="divide-y rounded-lg border">
            {list.strategies.map((name) => (
              <StrategyItem key={name} name={name} />
            ))}
          </div>
        )}
        {list && list.strategies.length === 0 && <EmptyState title="暂无可用策略" />}
      </CardContent>
    </Card>
  );
}
