import { useState } from "react";
import type { BacktestHistoryEntry } from "@/lib/api/types";
import { BacktestHistoryList } from "@/components/backtest/history-list";
import { BacktestResultDetail } from "@/components/backtest/result-detail";
import { BacktestRunningCard } from "@/components/backtest/running-card";
import { NewBacktestForm } from "@/components/backtest/new-backtest-form";
import { PageHeader } from "@/components/shared/blocks";

export default function BacktestPage() {
  const [selected, setSelected] = useState<BacktestHistoryEntry | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader title="回测" description="运行回测并查看历史结果" />
      <BacktestRunningCard />
      <NewBacktestForm />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-1">
          <BacktestHistoryList selectedFile={selected?.filename ?? null} onSelect={setSelected} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <BacktestResultDetail
            selectedFile={selected?.filename ?? null}
            strategy={selected?.strategy ?? null}
          />
        </div>
      </div>
    </div>
  );
}
