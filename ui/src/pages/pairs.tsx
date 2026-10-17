import { useBlacklist, useLocks, useWhitelist } from "@/lib/api/hooks";
import { PageHeader } from "@/components/shared/blocks";
import { BlacklistTab } from "@/components/pairs/blacklist-tab";
import { LocksTab } from "@/components/pairs/locks-tab";
import { PairlistConfigTab } from "@/components/pairs/pairlist-config-tab";
import { WhitelistTab } from "@/components/pairs/whitelist-tab";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CountBadge({ count }: { count: number | undefined }) {
  return (
    <Badge variant="outline" className="tnum border-border/70 px-1.5 text-xs text-muted-foreground">
      {count ?? "—"}
    </Badge>
  );
}

export default function PairsPage() {
  // 页面级取数,供页签计数 Badge 使用(与各 tab 组件共享同一 queryKey 缓存)
  const { data: whitelist } = useWhitelist();
  const { data: blacklist } = useBlacklist();
  const { data: locks } = useLocks();

  return (
    <div className="space-y-4">
      <PageHeader title="交易对管理" description="白名单、黑名单与锁定管理" />
      <Tabs defaultValue="whitelist" className="gap-4">
        <TabsList>
          <TabsTrigger value="whitelist" className="gap-1.5 px-3">
            白名单
            <CountBadge count={whitelist?.whitelist?.length} />
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="gap-1.5 px-3">
            黑名单
            <CountBadge count={blacklist?.blacklist_expanded?.length} />
          </TabsTrigger>
          <TabsTrigger value="locks" className="gap-1.5 px-3">
            锁定
            <CountBadge count={locks?.lock_count} />
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 px-3">
            配置器
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whitelist">
          <WhitelistTab />
        </TabsContent>
        <TabsContent value="blacklist">
          <BlacklistTab />
        </TabsContent>
        <TabsContent value="locks">
          <LocksTab />
        </TabsContent>
        <TabsContent value="config">
          <PairlistConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
