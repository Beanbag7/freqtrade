import type { ReactNode } from "react";
import { Landmark, Layers, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/blocks";
import { ErrorAlert } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance, useCount, useProfit, useShowConfig } from "@/lib/api/hooks";
import { formatNumber, formatRatioAsPct } from "@/lib/utils";

/** Wraps a single metric with its own loading / error state (spec §7). */
function MetricSlot({
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return <Skeleton className="h-24 rounded-lg" aria-busy="true" />;
  }
  if (isError) {
    return <ErrorAlert title="指标加载失败" error={error} onRetry={onRetry} />;
  }
  return <>{children}</>;
}

/** Unit label rendered at body scale beside a core figure (spec §3.2). */
function Unit({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <span className="ml-1 text-sm font-normal text-muted-foreground">{children}</span>;
}

/** First row: total profit, win rate, open positions, account balance. */
export function StatsRow() {
  const { data: config } = useShowConfig();
  const stake = config?.stake_currency ?? "";

  const profit = useProfit();
  const count = useCount();
  const balance = useBalance();

  const allProfit = profit.data?.profit_all_coin ?? 0;
  const profitTone = allProfit > 0 ? "profit" : allProfit < 0 ? "loss" : "neutral";

  const maxCount = count.data?.max ?? -1;
  const maxLabel = maxCount < 0 ? "∞" : maxCount;

  const startCapital = balance.data?.starting_capital ?? 0;
  const startPct = balance.data?.starting_capital_pct ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricSlot
        isLoading={profit.isLoading}
        isError={profit.isError}
        error={profit.error}
        onRetry={profit.refetch}
      >
        <StatCard
          label="总利润"
          icon={<TrendingUp className="size-4" />}
          tone={profitTone}
          value={
            <>
              {allProfit != null && allProfit > 0 ? "+" : ""}
              {formatNumber(allProfit)}
              <Unit>{stake}</Unit>
            </>
          }
          sub={<>已实现 {formatNumber(profit.data?.profit_closed_coin ?? 0)}</>}
        />
      </MetricSlot>

      <MetricSlot
        isLoading={profit.isLoading}
        isError={profit.isError}
        error={profit.error}
        onRetry={profit.refetch}
      >
        <StatCard
          label="胜率"
          icon={<Target className="size-4" />}
          value={formatRatioAsPct(profit.data?.winrate)}
          sub={
            <>
              {profit.data?.winning_trades ?? 0} 胜 / {profit.data?.losing_trades ?? 0} 负
            </>
          }
        />
      </MetricSlot>

      <MetricSlot
        isLoading={count.isLoading}
        isError={count.isError}
        error={count.error}
        onRetry={count.refetch}
      >
        <StatCard
          label="持仓"
          icon={<Layers className="size-4" />}
          value={
            <>
              {count.data?.current ?? 0} / {maxLabel}
            </>
          }
          sub={
            <>
              投入 {formatNumber(count.data?.total_stake ?? 0)}
              <Unit>{stake}</Unit>
            </>
          }
        />
      </MetricSlot>

      <MetricSlot
        isLoading={balance.isLoading}
        isError={balance.isError}
        error={balance.error}
        onRetry={balance.refetch}
      >
        <StatCard
          label="账户余额"
          icon={<Landmark className="size-4" />}
          value={
            <>
              {formatNumber(balance.data?.total ?? 0)}
              <Unit>{stake}</Unit>
            </>
          }
          sub={
            <>
              启动资金 {formatNumber(startCapital)} ({startPct >= 0 ? "+" : ""}
              {startPct.toFixed(2)}%)
            </>
          }
        />
      </MetricSlot>
    </div>
  );
}
