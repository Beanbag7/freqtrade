import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  ChartCandlestick,
  Download,
  FlaskConical,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  RefreshCw,
  ScrollText,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useShowConfig, useVersion } from "@/lib/api/hooks";
import { useLiveUpdates } from "@/lib/api/ws";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BotControlButtons } from "@/components/layout/bot-controls";

const NAV_ITEMS = [
  { to: "/", label: "概览", icon: LayoutDashboard, end: true },
  { to: "/trades", label: "交易记录", icon: ListOrdered },
  { to: "/chart", label: "K 线图", icon: ChartCandlestick },
  { to: "/pairs", label: "交易对", icon: Tags },
  { to: "/control", label: "机器人控制", icon: SlidersHorizontal },
  { to: "/backtest", label: "回测", icon: FlaskConical },
  { to: "/download", label: "数据下载", icon: Download },
  { to: "/logs", label: "日志", icon: ScrollText },
] as const;

function StateBadge({ state }: { state?: string }) {
  if (state === "running") {
    return (
      <Badge variant="outline" className="gap-1.5 border-success/40 bg-success/10 text-success">
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        运行中
      </Badge>
    );
  }
  if (state === "paused") {
    return (
      <Badge variant="outline" className="gap-1.5 border-warning/40 bg-warning/10 text-warning">
        <span className="size-1.5 rounded-full bg-warning" aria-hidden />
        已暂停
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden />
      已停止
    </Badge>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="主导航">
      {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={"end" in rest}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex h-9 items-center gap-2.5 rounded-md border border-transparent px-3 text-control font-medium text-muted-foreground transition-colors",
              "hover:bg-accent/60 hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-ring",
              isActive && "border-primary/25 bg-accent text-primary",
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5">
      <div
        className="flex size-8 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground"
        aria-hidden
      >
        F
      </div>
      <div className="leading-tight">
        <div className="text-control font-semibold">Freqtrade</div>
        <div className="text-xs text-muted-foreground">量化交易机器人</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: config } = useShowConfig();
  const { data: version } = useVersion();
  useLiveUpdates();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-4 border-r bg-card py-4 md:flex">
        <Brand />
        <Separator />
        <NavList />
        <div className="mt-auto px-5 text-xs text-muted-foreground">
          {version ? `v${version.version}` : ""}
          {config?.dry_run ? " · 模拟盘" : ""}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="打开导航菜单">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-4 p-0 py-4">
              <SheetHeader className="px-0">
                <SheetTitle className="sr-only">导航菜单</SheetTitle>
              </SheetHeader>
              <Brand />
              <Separator />
              <NavList onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-control font-semibold">
              {config?.bot_name ?? "freqtrade"}
            </span>
            <StateBadge state={config?.state} />
            {config?.dry_run && (
              <Badge
                variant="outline"
                className="hidden border-info/40 bg-info/10 text-info min-[480px]:inline-flex"
              >
                模拟盘
              </Badge>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <BotControlButtons state={config?.state} />
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="刷新数据"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新数据</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="退出登录" onClick={handleLogout}>
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>退出登录</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
