import { PageHeader } from "@/components/shared/blocks";
import { ConfigSummaryCard } from "@/components/control/config-summary-card";
import { ForceEnterCard } from "@/components/control/force-enter-card";
import { RunStateCard } from "@/components/control/run-state-card";
import { StrategyCard } from "@/components/control/strategy-card";
import { SystemStatusCard } from "@/components/control/system-status-card";

export default function ControlPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="机器人控制" />
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <RunStateCard />
          <ForceEnterCard />
        </div>
        <ConfigSummaryCard />
        <StrategyCard />
        <SystemStatusCard />
      </div>
    </div>
  );
}
