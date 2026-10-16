import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useEntries, useExits, useStats, useTrades } from "@/lib/api/hooks";
import { PageHeader } from "@/components/shared/blocks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRADES_PAGE_SIZE, TradesHistory } from "@/components/trades/trades-history";
import { TradeStats } from "@/components/trades/trade-stats";

type TabValue = "history" | "stats";

export default function TradesPage() {
  const [tab, setTab] = useState<TabValue>("history");
  const [page, setPage] = useState(0);

  const trades = useTrades(TRADES_PAGE_SIZE, page * TRADES_PAGE_SIZE);
  const stats = useStats();
  const exits = useExits();
  const entries = useEntries();

  const refresh = () => {
    if (tab === "history") {
      void trades.refetch();
    } else {
      void Promise.all([stats.refetch(), exits.refetch(), entries.refetch()]);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="交易记录"
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5" />
            刷新
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="history">历史交易</TabsTrigger>
          <TabsTrigger value="stats">盈亏统计</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <TradesHistory query={trades} page={page} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="stats">
          <TradeStats stats={stats} exits={exits} entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
