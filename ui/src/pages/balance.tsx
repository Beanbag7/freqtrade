import { useMemo } from "react";
import { useBalance } from "@/lib/api/hooks";
import { formatNumber, formatPrice } from "@/lib/utils";
import { PageHeader } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert, PageSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * 余额页(freqUI parity:/balance 独立页)。
 * 交易模式端点;webserver 模式下 /balance 503 → ErrorAlert 设计内降级。
 * 注:freqtrade 无钱包历史端点,故无历史曲线(工作单据边界记录)。
 */
export default function BalancePage() {
  const { data, isLoading, isError, error, refetch } = useBalance({ refetchInterval: 15_000 });

  const rows = useMemo(() => {
    if (!data?.currencies) return [];
    return [...data.currencies].sort((a, b) => (b.est_stake ?? 0) - (a.est_stake ?? 0));
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader title="余额" description="交易所账户资产明细(每 15 秒自动刷新)" />
      {isLoading && <PageSkeleton />}
      {isError && <ErrorAlert title="余额加载失败" error={error} onRetry={() => refetch()} />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  总估值({data.stake})
                </CardTitle>
              </CardHeader>
              <CardContent className="tnum text-2xl font-semibold">
                {formatNumber(data.total, 2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  机器人管理({data.stake})
                </CardTitle>
              </CardHeader>
              <CardContent className="tnum text-2xl font-semibold">
                {formatNumber(data.total_bot, 2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  起始资金({data.stake})
                </CardTitle>
              </CardHeader>
              <CardContent className="tnum text-2xl font-semibold">
                {formatNumber(data.starting_capital, 2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">币种数</CardTitle>
              </CardHeader>
              <CardContent className="tnum text-2xl font-semibold">{rows.length}</CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <EmptyState title="账户为空" description="交易所账户当前没有任何资产。" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-medium text-muted-foreground">
                          币种
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">
                          可用
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">
                          冻结
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">
                          总量
                        </TableHead>
                        <TableHead className="text-xs font-medium text-muted-foreground text-right">
                          估值({data.stake})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((c) => (
                        <TableRow key={`${c.currency}-${c.side}`}>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              {c.currency}
                              {c.is_position && (
                                <Badge variant="outline" className="text-xs">
                                  持仓
                                </Badge>
                              )}
                              {c.is_bot_managed && (
                                <Badge variant="secondary" className="text-xs">
                                  机器人
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="tnum text-right">{formatPrice(c.free)}</TableCell>
                          <TableCell className="tnum text-right">{formatPrice(c.used)}</TableCell>
                          <TableCell className="tnum text-right">{formatPrice(c.balance)}</TableCell>
                          <TableCell className="tnum text-right">
                            {formatNumber(c.est_stake, 2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          {data.note && <p className="text-xs text-muted-foreground">{data.note}</p>}
        </>
      )}
    </div>
  );
}
