import { PageHeader } from "@/components/shared/blocks";
import { useShowConfig } from "@/lib/api/hooks";
import { DailyProfitCard } from "@/components/dashboard/daily-profit-card";
import { OpenTradesCard } from "@/components/dashboard/open-trades-card";
import { PairPerformanceCard } from "@/components/dashboard/pair-performance-card";
import { StatsRow } from "@/components/dashboard/stats-row";

/**
 * Overview dashboard: header, core metrics, open positions + 7-day profit,
 * and per-pair performance.
 */
export default function DashboardPage() {
  const { data: config } = useShowConfig();
  const description = config
    ? [config.bot_name, config.strategy, config.exchange].filter(Boolean).join(" · ")
    : undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="概览" description={description} />

      <StatsRow />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <OpenTradesCard />
        </div>
        <DailyProfitCard />
      </div>

      <PairPerformanceCard />
    </div>
  );
}
