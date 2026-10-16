import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLogs } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/blocks";
import { EmptyState, ErrorAlert } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LevelFilter = "all" | "INFO" | "WARNING" | "ERROR";

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "INFO", label: "INFO" },
  { value: "WARNING", label: "WARNING" },
  { value: "ERROR", label: "ERROR" },
];

/** "2026-10-16 09:25:56" → "09:25:56"(tnum 由单元格负责) */
function formatLogTime(formatted: string): string {
  const time = formatted.slice(11, 19);
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  const d = new Date(formatted);
  if (Number.isNaN(d.getTime())) return formatted;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function LevelBadge({ level }: { level: string }) {
  if (level === "ERROR") return <Badge variant="destructive">{level}</Badge>;
  if (level === "WARNING") {
    return <Badge variant="outline" className="border-warning/40 text-warning">{level}</Badge>;
  }
  if (level === "INFO") {
    return <Badge variant="outline" className="text-muted-foreground">{level}</Badge>;
  }
  return <Badge variant="outline">{level}</Badge>;
}

export default function LogsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useLogs(300);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");

  const logs = data?.logs ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...logs]
      .reverse()
      .filter(([, , module, levelName, message]) => {
        if (level !== "all" && levelName !== level) return false;
        if (q && !`${module} ${message}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [logs, level, query]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="日志"
        actions={
          <>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="级别筛选">
              {LEVEL_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={level === f.value ? "default" : "outline"}
                  onClick={() => setLevel(f.value)}
                  aria-pressed={level === f.value}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索日志…"
              className="w-56"
              aria-label="搜索日志"
            />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              刷新
            </Button>
          </>
        }
      />

      <p className="text-xs text-muted-foreground">
        共 <span className="tnum">{data?.log_count ?? 0}</span> 条,当前显示 <span className="tnum">{filtered.length}</span>{" "}
        条 · 每 5 秒自动刷新
      </p>

      <Card className="shadow-xs">
        <CardContent className="p-0">
          {isError ? (
            <div className="p-4">
              <ErrorAlert title="日志加载失败" error={error} onRetry={() => refetch()} />
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4" aria-busy="true" aria-label="加载中">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="没有匹配的日志" description="尝试调整级别筛选或更换搜索关键词" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium text-muted-foreground">时间</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">级别</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">模块</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">消息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(([formatted, createdMs, module, levelName, message], i) => (
                    <TableRow key={`${i}-${createdMs}-${module}`}>
                      <TableCell className="tnum text-xs whitespace-nowrap">{formatLogTime(formatted)}</TableCell>
                      <TableCell>
                        <LevelBadge level={levelName} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{module}</TableCell>
                      <TableCell className="text-xs break-all">{message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
