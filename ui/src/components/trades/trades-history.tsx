import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trade, TradeResponse } from "@/lib/api/types";
import { formatDuration, formatPct, formatPrice, formatTimestamp } from "@/lib/utils";
import { ProfitText } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TradeDetailSheet } from "@/components/trades/trade-detail-sheet";

export const TRADES_PAGE_SIZE = 50;

const NUMERIC_HEAD = "text-xs text-muted-foreground font-medium text-right";
const HEAD = "text-xs text-muted-foreground font-medium";

function DirectionBadge({ isShort }: { isShort: boolean }) {
  return (
    <Badge
      variant="outline"
      className={isShort ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary"}
    >
      {isShort ? "空" : "多"}
    </Badge>
  );
}

function TradeTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className={NUMERIC_HEAD}>ID</TableHead>
        <TableHead className={HEAD}>交易对</TableHead>
        <TableHead className={HEAD}>开仓时间</TableHead>
        <TableHead className={NUMERIC_HEAD}>开仓价</TableHead>
        <TableHead className={NUMERIC_HEAD}>平仓价</TableHead>
        <TableHead className={HEAD}>平仓时间</TableHead>
        <TableHead className={NUMERIC_HEAD}>盈亏金额</TableHead>
        <TableHead className={NUMERIC_HEAD}>盈亏%</TableHead>
        <TableHead className={HEAD}>出场原因</TableHead>
        <TableHead className={NUMERIC_HEAD}>时长</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function SkeletonRows() {
  return (
    <TableBody>
      {Array.from({ length: 8 }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: 10 }).map((__, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

function TradeRows({
  trades,
  onSelect,
}: {
  trades: Trade[];
  onSelect: (trade: Trade) => void;
}) {
  const activate = (trade: Trade) => () => onSelect(trade);
  const onKey = (trade: Trade) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(trade);
    }
  };

  return (
    <TableBody>
      {trades.map((t) => {
        const duration =
          t.close_timestamp && t.open_timestamp
            ? formatDuration(t.close_timestamp - t.open_timestamp)
            : "—";
        return (
          <TableRow
            key={t.trade_id}
            tabIndex={0}
            aria-label={`查看交易 ${t.trade_id} 详情`}
            className="cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
            onClick={activate(t)}
            onKeyDown={onKey(t)}
          >
            <TableCell className="tnum text-right">{t.trade_id}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.pair}</span>
                <DirectionBadge isShort={t.is_short} />
              </div>
            </TableCell>
            <TableCell className="tnum">{formatTimestamp(t.open_timestamp)}</TableCell>
            <TableCell className="tnum text-right">{formatPrice(t.open_rate)}</TableCell>
            <TableCell className="tnum text-right">
              {t.close_rate === undefined ? "—" : formatPrice(t.close_rate)}
            </TableCell>
            <TableCell className="tnum">{formatTimestamp(t.close_timestamp)}</TableCell>
            <TableCell className="text-right">
              <ProfitText value={t.profit_abs} />
            </TableCell>
            <TableCell className="tnum text-right">{formatPct(t.profit_pct)}</TableCell>
            <TableCell>
              {t.exit_reason ? <Badge variant="outline">{t.exit_reason}</Badge> : "—"}
            </TableCell>
            <TableCell className="tnum text-right">{duration}</TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
}

export function TradesHistory({
  query,
  page,
  onPageChange,
}: {
  query: UseQueryResult<TradeResponse, Error>;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Trade | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const data = query.data;
  const total = data?.total_trades ?? 0;
  const offset = page * TRADES_PAGE_SIZE;
  const canPrev = page > 0;
  const canNext = offset + TRADES_PAGE_SIZE < total;

  const rows = useMemo(() => {
    const list = data?.trades ?? [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((t) => t.pair.toLowerCase().includes(q)) : list;
  }, [data, search]);

  const openDetail = (trade: Trade) => {
    setSelected(trade);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">共 {total} 笔</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="按交易对筛选…"
            aria-label="按交易对筛选"
            className="w-56"
          />
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
            <ChevronLeft className="size-3.5" />
            上一页
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
            下一页
            <ChevronRight className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">第 {page + 1} 页</span>
        </div>
      </div>

      {query.isLoading ? (
        <div className="overflow-x-auto">
          <Table>
            <TradeTableHead />
            <SkeletonRows />
          </Table>
        </div>
      ) : query.isError ? (
        <ErrorAlert
          title="交易记录加载失败"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="没有交易记录"
          description={search ? "没有匹配该交易对的记录,请调整筛选条件。" : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TradeTableHead />
            <TradeRows trades={rows} onSelect={openDetail} />
          </Table>
        </div>
      )}

      <TradeDetailSheet trade={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
