# Freqtrade UI 重构 · 子代理工作简报

本文件是所有页面实现子代理必须遵守的统一简报。完整设计规范见
`/Users/modaoshi/Downloads/ui-design-system-agent-spec.md`(雾白墨绿 v1.1),必须阅读。

## 项目位置与技术栈

- 项目根:`/Users/modaoshi/freqtrade/ui`(Vite 7 + React 19 + TypeScript strict)
- UI 体系:shadcn/ui(**Radix 版**,组件源码已在 `src/components/ui/`,统一 `radix-ui` 包)+ Tailwind CSS v4
- 数据层:@tanstack/react-query(hooks 已封装,见 `src/lib/api/hooks.ts`)
- 图标:lucide-react;类名:`cn()` 来自 `@/lib/utils`
- 路径别名:`@/` → `src/`
- **禁止新增 npm 依赖**(klinecharts 已装,仅 K 线页可用)。禁止修改 `src/index.css`、`src/lib/**`、`src/components/ui/**`、`src/components/layout/**`、`src/router.tsx`。

## 设计令牌(已在 index.css 定义,直接用 Tailwind 类)

| 语义 | 类名示例 | 色值 |
| --- | --- | --- |
| 页面背景 | `bg-background` | #F5F6F3 雾白 |
| 内容面 | `bg-card` | #FCFDFC 近白 |
| 主文字 | `text-foreground` | #17251E 深墨 |
| 主色(按钮/链接/选中) | `bg-primary` `text-primary` | #245B47 墨绿 |
| 细边框/分隔 | `border-border` | #DEE5DE |
| 次级文字 | `text-muted-foreground` | #52645A |
| 次级面/悬停 | `bg-muted` `bg-accent` | #ECEFE9 / #E2EAE3 |
| 负向 | `text-destructive` `bg-destructive` | #B96359 珊瑚 |
| 成功/盈利 | `text-success` `bg-success` | #3E7C51 |
| 警告 | `text-warning` `bg-warning` | #96662C |
| 信息 | `text-info` | #4E6E7B |

- 圆角:卡片 `rounded-lg`(12px);控件 `rounded-md`(8px);徽章 `rounded-sm`(6px)。**不要**把 12px 套到所有元素。
- 阴影:最多 `shadow-xs`,卡片优先用细边框不用阴影。禁止渐变、玻璃拟态、荧光色、厚阴影。
- 选中态:`border-primary/25 bg-accent text-primary`(细墨绿边线+浅背景+明确文字)。

## 排版(已定义自定义 scale)

- 正文:`text-sm`(14/22,默认 body 已是);控件/页签:`text-control font-medium`(14/20)
- 辅助标签:`text-xs`(12/18),配 `text-muted-foreground`
- 模块标题:`text-base font-semibold`(16/24);页面标题用 `<PageHeader>`
- 核心数值:`text-3xl font-semibold tnum`(28/36),单位用正文尺度(`text-sm text-muted-foreground`)
- **所有数字、金额、比例、时间必须加 `tnum` 类**(等宽数字);不要把整段文字切成 mono。代码/长标识符才用 `font-mono`。

## 组件与共享块

### shadcn/ui(src/components/ui/)
alert, alert-dialog, badge, button, card, collapsible, command, dialog, dropdown-menu, empty, input, label, popover, progress, scroll-area, select, separator, sheet, skeleton, sonner(toast), switch, table, tabs, textarea, tooltip。
用法即官方 shadcn 用法。变体:Button `default|destructive|outline|secondary|ghost|link`,尺寸 `sm|default|lg|icon`。
纯图标按钮必须 `aria-label`;弹层必须有标题(Sheet/Dialog 的 Title)。

### 共享块(src/components/shared/)
- `<PageHeader title description? actions? />` — 每页顶部必用
- `<StatCard label value sub? icon? tone?("neutral"|"profit"|"loss") />` — 核心指标卡
- `<ProfitText value suffix? withIcon? />` — 带符号/颜色/趋势图标的盈亏数(状态不只靠颜色)
- `<PageSkeleton />` `<ErrorAlert title? error? onRetry? />` `<EmptyState title description? icon? />`(states.tsx)
- **加载/空/错误三种状态必须区分**:加载用 Skeleton;确认无数据用 EmptyState;失败用 ErrorAlert 带重试。

### 格式化(src/lib/utils)
`cn, formatProfit, formatRatioAsPct(ratio→%), formatPct(已是百分数), formatNumber, formatPrice(自适应精度), formatTimestamp(ms→YYYY-MM-DD HH:mm), formatDate, formatDuration(ms), timeAgo`。

## 数据 hooks(src/lib/api/hooks.ts)

查询(全部返回 react-query 的 `{ data, isLoading, isError, error, refetch }`):
`usePing, useVersion, useShowConfig, useLogs(limit), useSysinfo, useHealth, useBalance, useCount, useProfit, useProfitAll, useStats, usePerformance, useEntries(pair?), useExits(pair?), useMixTags(pair?), useTimeunitProfit("daily"|"weekly"|"monthly", timescale?), useOpenTrades, useTrades(limit, offset), useTradeCustomData(id), useWhitelist, useBlacklist, useLocks, useMarkets(quote?), usePairCandles(pair, timeframe, limit), usePlotConfig, useStrategies, useStrategy(name), useBacktestHistory, useBacktestStatus(自动轮询运行中任务), useBacktestResultFile(file), useBacktestMarketChange(file), useBackgroundTasks`。

变更(`.mutate(payload, {onSuccess, onError})`,错误 `e.message` 已是中文):
`useStartBot, useStopBot, usePauseBot, useReloadConfig, useForceEnter, useForceExit, useDeleteTrade, useReloadTrade, useCancelOpenOrder, useAddBlacklist, useRemoveBlacklist, useAddLocks, useDeleteLock, useStartBacktest, useAbortBacktest, useDeleteBacktestFile, useUpdateBacktestNotes`。
toast 用 `import { toast } from "sonner"`。

类型在 `src/lib/api/types.ts`,**先读再用**。常用:
- `OpenTrade`/`Trade`:trade_id, pair, is_open, is_short, amount, stake_amount, open_rate, current_rate?, close_rate?, profit_ratio(比率!), profit_pct(百分数!), profit_abs, total_profit_abs?, open_timestamp(ms), close_timestamp?, enter_tag?, exit_reason?, stop_loss_abs, orders[], leverage?, nr_of_successful_entries...
  注意:`profit_ratio` 是 0.0123 这种比率,`profit_pct` 是 1.23 这种百分数。用 `formatRatioAsPct(profit_ratio)` 或 `formatPct(profit_pct)`。
- `Profit`:profit_all_coin, profit_all_fiat, profit_closed_coin, trade_count, closed_trade_count, winning_trades, losing_trades, winrate(0-1 比率), profit_factor, sharpe, sortino, max_drawdown_abs, current_drawdown_abs, avg_duration("0:12:00"), best_pair, bot_start_date...
- `Balances`:currencies[](currency, free, used, balance, est_stake, is_bot_managed, side, position), total, total_bot, stake, symbol(法币符号), value, starting_capital, starting_capital_pct
- `Count`:current, max, total_stake(max<0 表示无限制)
- `DailyWeeklyMonthly`:data[](date "2026-10-15", abs_profit, rel_profit, starting_balance, fiat_value, trade_count), stake_currency
- `PerformanceEntry`:pair, profit(比率), profit_pct, profit_abs, count
- `ShowConfig`:state("running"|"paused"|"stopped"), dry_run, stake_currency, stake_amount(string), max_open_trades, timeframe, timeframe_min, stoploss(-0.05), trailing_stop, trailing_stop_positive, minimal_roi({"0":0.04,...}), exchange, bot_name, strategy, trading_mode("spot"|"futures"), short_allowed, force_entry_enable, version, stake_currency_decimals, available_capital, position_adjustment_enable
- `PairHistory`:columns(如 ["date","open","high","low","close","volume",...指标列,"enter_long","exit_long"...]), data(行数组,与 columns 对齐;date 列为 ms 时间戳), enter_long_signals...
- `LockModel`:id, pair, side("long"|"short"|"*"), reason?, lock_time, lock_end_time, lock_timestamp, lock_end_timestamp, active
- `Logs`:logs: [isoTime, module, level, message][]
- `StrategyResponse`:strategy, timeframe, params[](param_type, name, space("buy"|"sell"|...), value, low, high, opt_range, optimize), code
- `BacktestHistoryEntry`:filename, strategy, run_id, backtest_start_time(s!), backtest_start_ts(ms?), backtest_end_ts, notes, timeframe
- `BacktestResponse.backtest_result`:freqtrade 原生回测结果 dict:`strategy_comparison`(数组:strategy, total_trades, profit_total, profit_total_abs, cagr, sharpe, sortino, calmar, expectancy, winrate, max_drawdown_abs...),`strategy[strategyName]`(明细:total_trades, profit_total_abs, profit_total, winrate, max_drawdown_abs, results_per_pair[](key, profit_abs, profit_total, trades...), daily_profit 等)。字段可能缺失,**必须做可选链/默认值兜底**。
- 强开单 `useForceEnter` payload:`{pair, side?:"long"|"short", price?, ordertype?:"limit"|"market", stakeamount?, entry_tag?, leverage?}`
- 强平 `useForceExit` payload:`{tradeid, ordertype?, amount?, price?}`

## 硬性规则(验收清单对应)

1. 所有页面中文文案;语义化 HTML(table 用 `<Table>`,别用 div 模拟)。
2. 状态表达必须"颜色+图标/文字"双通道(盈亏用 ProfitText;状态用 Badge+圆点/文字)。
3. 表格数字列右对齐加 `tnum`;表头 `text-xs text-muted-foreground font-medium`。
4. 交互元素有 hover/focus-visible/disabled 可辨状态;键盘可达(shadcn 组件自带,别破坏)。
5. 窄屏重排:栅格 `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`;宽表格包 `<div className="overflow-x-auto">` 限制在容器内横向滚动。
6. 空内容区域随内容收缩,不要人为撑满高度(除 K 线图这种固有高度)。
7. 同类组件高度/内边距/圆角一致;操作按钮统一 `size="sm"` outline。
8. 变更操作(停止/强平/删除)必须 AlertDialog 二次确认;成功后 toast.success,失败 toast.error(e.message)。
9. 不要在组件里写死 hex 色值,只用语义类(primary/success/destructive/muted...)。图表(klinecharts)例外:用 CSS 变量取值。
10. TypeScript strict:不允许隐式 any;后端数据用可选链兜底。

## 目录归属(每个子代理只写自己的目录)

- 页面文件:`src/pages/<name>.tsx`(必须 `export default function`)
- 页面私有组件:`src/components/<name>/*`
- 页面间不要互相 import;共享需求用 `src/components/shared/*` 现有块。
