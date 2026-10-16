import type { ReactNode } from "react";
import { useShowConfig } from "@/lib/api/hooks";
import { formatNumber, formatRatioAsPct } from "@/lib/utils";
import { ErrorAlert } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum text-sm leading-6">{children}</dd>
    </div>
  );
}

function FlagBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge variant="outline" className="border-success/40 text-success">
      是
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      否
    </Badge>
  );
}

/** 配置摘要卡:关键配置一览。 */
export function ConfigSummaryCard() {
  const { data: config, isLoading, isError, error, refetch } = useShowConfig();

  const roiEntries = Object.entries(config?.minimal_roi ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-base">配置摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
        {isLoading && (
          <div className="grid gap-y-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full max-w-[14rem]" />
            ))}
          </div>
        )}
        {config && (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Item label="交易所">{config.exchange}</Item>
            <Item label="结算币种">{config.stake_currency}</Item>
            <Item label="单笔投入">{config.stake_amount}</Item>
            <Item label="可用资金">
              {config.available_capital !== undefined ? formatNumber(config.available_capital) : "—"}
            </Item>
            <Item label="最大持仓">
              {config.max_open_trades < 0 ? "不限" : String(config.max_open_trades)}
            </Item>
            <Item label="时间框架">{config.timeframe ?? "—"}</Item>
            <Item label="止损">{formatRatioAsPct(config.stoploss)}</Item>
            <Item label="追踪止损">
              <span className="flex flex-wrap items-center gap-2">
                {config.trailing_stop ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    开
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    关
                  </Badge>
                )}
                {config.trailing_stop_positive !== undefined &&
                  formatRatioAsPct(config.trailing_stop_positive)}
              </span>
            </Item>
            <Item label="最小 ROI">
              {roiEntries.length > 0 ? (
                <ul className="space-y-0.5">
                  {roiEntries.map(([key, value]) => (
                    <li key={key} className="text-xs leading-5">
                      {Number(key)} 分钟 → {formatRatioAsPct(value)}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Item>
            <Item label="交易模式">
              {config.trading_mode}
              {config.margin_mode ? ` / ${config.margin_mode}` : ""}
            </Item>
            <Item label="允许做空">
              <FlagBadge enabled={config.short_allowed} />
            </Item>
            <Item label="仓位调整">
              <FlagBadge enabled={config.position_adjustment_enable} />
            </Item>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
