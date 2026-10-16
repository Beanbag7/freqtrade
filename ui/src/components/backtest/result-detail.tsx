import { FlaskConical } from "lucide-react";
import { useBacktestResultFile } from "@/lib/api/hooks";
import {
  formatDate,
  formatNumber,
  formatPct,
  formatRatioAsPct,
} from "@/lib/utils";
import { BacktestResultChart } from "@/components/backtest/result-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { ProfitText, StatCard } from "@/components/shared/blocks";

export type LooseRecord = Record<string, unknown>;

/* ----------------------- 宽松字段访问(后端字段可能缺失) ----------------------- */

export function looseNum(obj: unknown, key: string): number | null {
  if (obj && typeof obj === "object") {
    const v = (obj as LooseRecord)[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export function looseStr(obj: unknown, key: string): string | null {
  if (obj && typeof obj === "object") {
    const v = (obj as LooseRecord)[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export function looseArr(obj: unknown, key: string): unknown[] {
  if (obj && typeof obj === "object") {
    const v = (obj as LooseRecord)[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** 数据优先取 strategy_comparison[0],否则回退到 strategy 字典的第一个明细。 */
function extractSummary(backtestResult: unknown): LooseRecord | null {
  if (!backtestResult || typeof backtestResult !== "object") return null;
  const br = backtestResult as LooseRecord;
  const comparison = br.strategy_comparison;
  if (
    Array.isArray(comparison) &&
    comparison.length > 0 &&
    comparison[0] !== null &&
    typeof comparison[0] === "object"
  ) {
    return comparison[0] as LooseRecord;
  }
  const stratMap = br.strategy;
  if (stratMap && typeof stratMap === "object") {
    const keys = Object.keys(stratMap as LooseRecord);
    const first = keys.length > 0 ? (stratMap as LooseRecord)[keys[0]] : null;
    if (first && typeof first === "object") return first as LooseRecord;
  }
  return null;
}

/** 胜率启发式:0-1 当作比率,>1 当作百分数。 */
function formatWinrate(value: number | null): string {
  if (value === null) return "—";
  return value > 1 ? formatPct(value) : formatRatioAsPct(value);
}

function toneFor(value: number | null): "neutral" | "profit" | "loss" {
  if (value === null) return "neutral";
  if (value > 0) return "profit";
  if (value < 0) return "loss";
  return "neutral";
}

/* --------------------------------- 明细内容 --------------------------------- */

function ResultBody({ backtestResult, file }: { backtestResult: LooseRecord; file: string }) {
  const summary = extractSummary(backtestResult);
  const comparison = looseArr(backtestResult, "strategy_comparison");

  const totalTrades = summary ? (looseNum(summary, "total_trades") ?? looseNum(summary, "trades")) : null;
  const profitTotalAbs = summary ? looseNum(summary, "profit_total_abs") : null;
  const winrate = summary ? looseNum(summary, "winrate") : null;
  const maxDrawdownAbs = summary ? looseNum(summary, "max_drawdown_abs") : null;

  const compareRows = comparison
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      strategy: looseStr(row, "strategy") ?? "—",
      totalTrades: looseNum(row, "total_trades") ?? looseNum(row, "trades"),
      profitTotalAbs: looseNum(row, "profit_total_abs"),
      profitTotal: looseNum(row, "profit_total"),
      winrate: looseNum(row, "winrate"),
      sharpe: looseNum(row, "sharpe"),
      sortino: looseNum(row, "sortino"),
      maxDrawdownAbs: looseNum(row, "max_drawdown_abs"),
    }));

  const pairs = (summary ? looseArr(summary, "results_per_pair") : [])
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      key: looseStr(p, "key") ?? "—",
      trades: looseNum(p, "trades"),
      profitAbs: looseNum(p, "profit_abs"),
      profitTotal: looseNum(p, "profit_total"),
    }))
    .sort((a, b) => Math.abs(b.profitAbs ?? 0) - Math.abs(a.profitAbs ?? 0));

  const startTs = looseNum(backtestResult, "backtest_start_ts");
  const endTs = looseNum(backtestResult, "backtest_end_ts");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="总交易数" value={totalTrades === null ? "—" : formatNumber(totalTrades, 0)} />
        <StatCard
          label="总利润"
          value={<ProfitText value={profitTotalAbs} />}
          tone={toneFor(profitTotalAbs)}
        />
        <StatCard label="胜率" value={formatWinrate(winrate)} />
        <StatCard
          label="最大回撤"
          value={maxDrawdownAbs === null ? "—" : formatNumber(maxDrawdownAbs, 2)}
        />
      </div>

      {compareRows.length > 1 && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">策略对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium text-muted-foreground">策略</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">交易数</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">总利润</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">盈利率</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">胜率</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Sharpe</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Sortino</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">最大回撤</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareRows.map((row) => (
                    <TableRow key={row.strategy}>
                      <TableCell className="text-control font-medium">{row.strategy}</TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {row.totalTrades === null ? "—" : formatNumber(row.totalTrades, 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <ProfitText value={row.profitTotalAbs} />
                      </TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {row.profitTotal === null ? "—" : formatRatioAsPct(row.profitTotal)}
                      </TableCell>
                      <TableCell className="tnum text-right text-sm">{formatWinrate(row.winrate)}</TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {row.sharpe === null ? "—" : formatNumber(row.sharpe, 2)}
                      </TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {row.sortino === null ? "—" : formatNumber(row.sortino, 2)}
                      </TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {row.maxDrawdownAbs === null ? "—" : formatNumber(row.maxDrawdownAbs, 2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <BacktestResultChart backtestResult={backtestResult} />

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">按交易对</CardTitle>
        </CardHeader>
        <CardContent>
          {pairs.length === 0 ? (
            <EmptyState title="没有按交易对的明细数据" icon={<FlaskConical className="size-5" />} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium text-muted-foreground">交易对</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">笔数</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">总盈亏</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">盈利率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairs.map((pair) => (
                    <TableRow key={pair.key}>
                      <TableCell className="font-medium">{pair.key}</TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {pair.trades === null ? "—" : formatNumber(pair.trades, 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <ProfitText value={pair.profitAbs} />
                      </TableCell>
                      <TableCell className="tnum text-right text-sm">
                        {pair.profitTotal === null ? "—" : formatRatioAsPct(pair.profitTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        回测时段:
        <span className="tnum">{formatDate(startTs)}</span>
        {" ~ "}
        <span className="tnum">{formatDate(endTs)}</span>
        {" · "}
        <span className="break-all font-mono">{file}</span>
      </p>
    </div>
  );
}

export function BacktestResultDetail({
  selectedFile,
  strategy,
}: {
  selectedFile: string | null;
  strategy: string | null;
}) {
  if (!selectedFile || !strategy) {
    return <EmptyState title="从左侧选择一个回测结果" description="选择后可查看汇总、策略对比与按交易对明细" />;
  }
  return <ResultFileDetail file={selectedFile} strategy={strategy} />;
}

function ResultFileDetail({ file, strategy }: { file: string; strategy: string }) {
  const result = useBacktestResultFile(file, strategy);
  const backtestResult = result.data?.backtest_result ?? null;
  const status = result.data?.status;

  if (result.isError) {
    return <ErrorAlert title="回测结果加载失败" error={result.error} onRetry={() => result.refetch()} />;
  }

  // 结果尚未生成且任务未结束 → 加载中
  if (!backtestResult && status !== "ended") {
    return (
      <Card className="shadow-xs">
        <CardContent className="space-y-3" aria-busy="true">
          <p className="text-sm text-muted-foreground">结果加载中…</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!backtestResult || typeof backtestResult !== "object") {
    return <EmptyState title="此回测没有可用的结果数据" />;
  }

  return <ResultBody backtestResult={backtestResult} file={file} />;
}
