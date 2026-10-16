import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Page title block: 24px/32px semibold title + muted description. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Core metric card: 12px radius, thin border, restrained shadow. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "profit" | "loss";
}) {
  return (
    <Card className="gap-0 shadow-xs">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-xs font-normal text-muted-foreground">
          {label}
          {icon && <span className="text-muted-foreground/70">{icon}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "tnum text-3xl font-semibold leading-9",
            tone === "profit" && "text-success",
            tone === "loss" && "text-destructive",
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * Signed profit figure: color + direction icon + sign so state never
 * relies on color alone (spec §2).
 */
export function ProfitText({
  value,
  suffix,
  className,
  withIcon = false,
}: {
  value: number | null | undefined;
  suffix?: string;
  className?: string;
  withIcon?: boolean;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("tnum text-muted-foreground", className)}>—</span>;
  }
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1",
        positive && "text-success",
        negative && "text-destructive",
        !positive && !negative && "text-muted-foreground",
        className,
      )}
    >
      {withIcon && <Icon className="size-3.5" aria-label={positive ? "上涨" : negative ? "下跌" : "持平"} />}
      {positive ? "+" : ""}
      {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}
