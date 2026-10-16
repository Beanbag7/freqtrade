import { useMemo, type ReactNode } from "react";
import { formatPct, formatRatioAsPct } from "@/lib/utils";
import { ProfitText } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
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
import type { Entry, Exit, SellReason, Stats } from "@/lib/api/types";

const HEAD = "text-xs text-muted-foreground font-medium";
const NUMERIC_HEAD = "text-xs text-muted-foreground font-medium text-right";

function StatsCard({
  title,
  children,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
}: {
  title: string;
  children: ReactNode;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyTitle: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <ErrorAlert title={`${title}加载失败`} error={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

const EMPTY_SELL_REASON: SellReason = { wins: 0, losses: 0, draws: 0 };

function ExitReasonCard({ stats }: { stats: Stats | undefined }) {
  const rows = useMemo(() => {
    const reasons = stats?.exit_reasons ?? {};
    return Object.entries(reasons)
      .map(([reason, s = EMPTY_SELL_REASON]) => ({
        reason,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        total: s.wins + s.losses + s.draws,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stats]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={HEAD}>出场原因</TableHead>
            <TableHead className={NUMERIC_HEAD}>胜</TableHead>
            <TableHead className={NUMERIC_HEAD}>负</TableHead>
            <TableHead className={NUMERIC_HEAD}>平</TableHead>
            <TableHead className={NUMERIC_HEAD}>合计</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.reason}>
              <TableCell>{r.reason}</TableCell>
              <TableCell className="tnum text-right text-success">{r.wins}</TableCell>
              <TableCell className="tnum text-right text-destructive">{r.losses}</TableCell>
              <TableCell className="tnum text-right text-muted-foreground">{r.draws}</TableCell>
              <TableCell className="tnum text-right font-medium">{r.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface TagRow {
  label: string;
  count: number;
  profit_abs: number;
  profit_pct: number;
  profit_ratio: number;
}

function TagProfitTable({ keyLabel, rows }: { keyLabel: string; rows: TagRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={HEAD}>{keyLabel}</TableHead>
            <TableHead className={NUMERIC_HEAD}>笔数</TableHead>
            <TableHead className={NUMERIC_HEAD}>总盈亏</TableHead>
            <TableHead className={NUMERIC_HEAD}>盈亏%</TableHead>
            <TableHead className={NUMERIC_HEAD}>平均每笔比率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell className="tnum text-right">{r.count}</TableCell>
              <TableCell className="text-right">
                <ProfitText value={r.profit_abs} />
              </TableCell>
              <TableCell className="tnum text-right">{formatPct(r.profit_pct)}</TableCell>
              <TableCell className="tnum text-right">{formatRatioAsPct(r.profit_ratio)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function toTagRow(
  label: string,
  s: { count: number; profit_abs: number; profit_pct: number; profit_ratio: number },
): TagRow {
  return {
    label,
    count: s.count,
    profit_abs: s.profit_abs,
    profit_pct: s.profit_pct,
    profit_ratio: s.profit_ratio,
  };
}

export function TradeStats({
  stats,
  exits,
  entries,
}: {
  stats: { data?: Stats; isLoading: boolean; error: Error | null; refetch: () => void };
  exits: { data?: Exit[]; isLoading: boolean; error: Error | null; refetch: () => void };
  entries: { data?: Entry[]; isLoading: boolean; error: Error | null; refetch: () => void };
}) {
  const exitRows = useMemo<TagRow[]>(
    () => (exits.data ?? []).map((e) => toTagRow(e.exit_reason, e)),
    [exits.data],
  );
  const entryRows = useMemo<TagRow[]>(
    () => (entries.data ?? []).map((e) => toTagRow(e.enter_tag, e)),
    [entries.data],
  );

  const exitReasons = stats.data?.exit_reasons ?? {};
  const hasExitReasons = Object.keys(exitReasons).length > 0;

  return (
    <div className="space-y-4">
      <StatsCard
        title="出场原因统计"
        isLoading={stats.isLoading}
        error={stats.error}
        onRetry={stats.refetch}
        isEmpty={!hasExitReasons}
        emptyTitle="暂无出场原因统计"
      >
        <ExitReasonCard stats={stats.data} />
      </StatsCard>

      <StatsCard
        title="按出场原因盈亏"
        isLoading={exits.isLoading}
        error={exits.error}
        onRetry={exits.refetch}
        isEmpty={exitRows.length === 0}
        emptyTitle="暂无出场原因盈亏数据"
      >
        <TagProfitTable keyLabel="出场原因" rows={exitRows} />
      </StatsCard>

      <StatsCard
        title="按进场标签盈亏"
        isLoading={entries.isLoading}
        error={entries.error}
        onRetry={entries.refetch}
        isEmpty={entryRows.length === 0}
        emptyTitle="暂无进场标签盈亏数据"
      >
        <TagProfitTable keyLabel="进场标签" rows={entryRows} />
      </StatsCard>
    </div>
  );
}
