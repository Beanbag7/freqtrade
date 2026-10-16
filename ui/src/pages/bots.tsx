import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchBotSummary,
  genId,
  testBotConnection,
  useBotRegistry,
  type BotDescriptor,
} from "@/lib/api/multibot";
import { formatNumber, formatProfit, cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/blocks";
import { EmptyState } from "@/components/shared/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StateBadge({ state }: { state: string }) {
  const cls =
    state === "running"
      ? "border-primary/40 bg-primary/10 text-primary"
      : state === "paused"
        ? "border-warning/40 bg-warning/10 text-warning"
        : state === "unknown"
          ? "border-muted-foreground/30 text-muted-foreground"
          : "border-destructive/40 bg-destructive/10 text-destructive";
  const label =
    state === "running"
      ? "运行中"
      : state === "paused"
        ? "已暂停"
        : state === "unknown"
          ? "未知"
          : "已停止";
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

/** 单行:一个机器人的实时汇总(独立轮询,失败不影响其他行)。 */
function BotRow({ bot, onRemove }: { bot: BotDescriptor; onRemove: () => void }) {
  const { data, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["bot-summary", bot.id],
    queryFn: () => fetchBotSummary(bot),
    refetchInterval: 10_000,
    retry: 1,
  });
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{bot.name}</div>
        <a
          href={bot.apiUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {bot.apiUrl}
        </a>
      </TableCell>
      {isError ? (
        <TableCell colSpan={6}>
          <Alert variant="destructive" className="py-2">
            <AlertTitle className="text-xs">连接失败</AlertTitle>
            <AlertDescription className="text-xs">{error.message}</AlertDescription>
          </Alert>
        </TableCell>
      ) : !data ? (
        <TableCell colSpan={6}>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin" /> 连接中…
          </span>
        </TableCell>
      ) : (
        <>
          <TableCell>
            <span className="inline-flex items-center gap-1.5">
              <StateBadge state={data.state} />
              {data.dryRun && (
                <Badge variant="outline" className="border-info/40 bg-info/10 text-info">
                  模拟盘
                </Badge>
              )}
            </span>
          </TableCell>
          <TableCell className="tnum text-right">{data.openTrades ?? "—"}</TableCell>
          <TableCell className="tnum text-right">{data.tradeCount ?? "—"}</TableCell>
          <TableCell
            className={cn(
              "tnum text-right",
              data.closedProfit !== null &&
                (data.closedProfit > 0 ? "text-primary" : data.closedProfit < 0 ? "text-destructive" : ""),
            )}
          >
            {data.closedProfit === null ? "—" : `${formatProfit(data.closedProfit)} ${data.stake}`}
          </TableCell>
          <TableCell
            className={cn(
              "tnum text-right",
              data.allProfit !== null &&
                (data.allProfit > 0 ? "text-primary" : data.allProfit < 0 ? "text-destructive" : ""),
            )}
          >
            {data.allProfit === null ? "—" : `${formatProfit(data.allProfit)} ${data.stake}`}
          </TableCell>
          <TableCell className="tnum text-right">
            {data.balanceTotal === null ? "—" : `${formatNumber(data.balanceTotal, 2)} ${data.stake}`}
          </TableCell>
        </>
      )}
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`刷新 ${bot.name}`}
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`移除 ${bot.name}`} onClick={onRemove}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddBotDialog() {
  const addBot = useBotRegistry((s) => s.addBot);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const bot: BotDescriptor = {
        id: genId(),
        name: name.trim() || apiUrl.trim(),
        apiUrl: apiUrl.trim().replace(/\/+$/, ""),
        username: username.trim(),
        password,
      };
      const version = await testBotConnection(bot);
      addBot(bot);
      toast.success(`已添加 ${bot.name}(freqtrade v${version})`);
      setOpen(false);
      setName("");
      setApiUrl("");
      setUsername("");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" aria-hidden />
          添加机器人
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加机器人</DialogTitle>
          <DialogDescription>
            凭据只保存在本浏览器(localStorage)。目标机器人需在其配置
            api_server.CORS_origins 中包含本页面源,否则浏览器会拦截跨源请求。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bot-name">名称</Label>
            <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="如:套利机 A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bot-url">API 地址 *</Label>
            <Input
              id="bot-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8081"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bot-user">用户名 *</Label>
              <Input id="bot-user" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bot-pass">密码 *</Label>
              <Input
                id="bot-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={testing}>
              {testing && <LoaderCircle className="size-4 animate-spin" />}
              测试连接并添加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 多机器人监控面板(freqUI multi-bot parity):
 * 注册表 + 对比表(状态/持仓/盈亏/余额),每 10s 轮询,行级错误隔离。
 * 刻意不移植头部全局切换器——本 UI 由机器人伺服、单会话,
 * 全局切换需逐机器人重构 client/auth/ws,收益是便利而非能力(工作单据边界)。
 */
export default function BotsPage() {
  const bots = useBotRegistry((s) => s.bots);
  const removeBot = useBotRegistry((s) => s.removeBot);
  const qc = useQueryClient();
  const [pendingRemove, setPendingRemove] = useState<BotDescriptor | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="多机器人"
        description="跨实例对比监控:状态、持仓、盈亏、余额,每 10 秒自动刷新。"
        actions={<AddBotDialog />}
      />
      {bots.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="还没有注册的机器人"
              description="点击右上角「添加机器人」注册其他 freqtrade 实例;本页面的机器人数据独立于当前连接的实例。"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium text-muted-foreground">机器人</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">状态</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      持仓
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      总交易
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      已平仓盈亏
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      总盈亏
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">
                      余额
                    </TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bots.map((b) => (
                    <BotRow key={b.id} bot={b} onRemove={() => setPendingRemove(b)} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <CircleCheck className="size-4" aria-hidden />
        <AlertTitle className="text-xs">关于跨源访问</AlertTitle>
        <AlertDescription className="text-xs">
          浏览器跨源请求要求目标机器人在 config 中设置
          <code className="mx-1">api_server.CORS_origins</code>(如
          <code className="mx-1">["http://127.0.0.1:8081"]</code>
          )并重启;凭据仅保存在本浏览器 localStorage,与 freqUI 的安全模型一致。
        </AlertDescription>
      </Alert>

      {/* 移除确认:破坏性操作走 AlertDialog(设计规范) */}
      <AlertDialog open={Boolean(pendingRemove)} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除 {pendingRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              将从本面板删除该机器人的注册信息与本地凭据;目标机器人本身不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) {
                  removeBot(pendingRemove.id);
                  qc.removeQueries({ queryKey: ["bot-summary", pendingRemove.id] });
                  toast.success(`已移除 ${pendingRemove.name}`);
                }
                setPendingRemove(null);
              }}
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
