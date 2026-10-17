import { useWhitelist } from "@/lib/api/hooks";
import { ErrorAlert, EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 白名单 tab:来源说明 + Badge 列表。 */
export function WhitelistTab() {
  const { data, isLoading, isError, error, refetch } = useWhitelist();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">白名单</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
        )}
        {isError && <ErrorAlert error={error} onRetry={() => refetch()} />}
        {data && data.whitelist?.length === 0 && <EmptyState title="白名单为空" />}
        {data && data.whitelist?.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              来源:{data.method?.length > 0 ? data.method.join(" / ") : "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              {(data.whitelist ?? []).map((pair) => (
                <Badge key={pair} variant="outline" className="text-sm">
                  {pair}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
