/**
 * TypeScript mirrors of freqtrade's API schemas (freqtrade/rpc/api_server/api_schemas.py).
 * Keep in sync with API_VERSION 2.50.
 */

export interface Ping {
  status: string;
}

export interface Version {
  version: string;
}

export interface StatusMsg {
  status: string;
}

export interface ResultMsg {
  result: string;
}

export interface AccessAndRefreshToken {
  access_token: string;
  refresh_token: string;
}

export interface AccessToken {
  access_token: string;
}

export interface Balance {
  currency: string;
  free: number;
  balance: number;
  used: number;
  bot_owned?: number;
  est_stake: number;
  est_stake_bot?: number;
  stake: string;
  side: string;
  is_position: boolean;
  position: number;
  is_bot_managed: boolean;
}

export interface Balances {
  currencies: Balance[];
  total: number;
  total_bot: number;
  symbol: string;
  value: number;
  value_bot: number;
  stake: string;
  note: string;
  starting_capital: number;
  starting_capital_ratio: number;
  starting_capital_pct: number;
  starting_capital_fiat: number;
  starting_capital_fiat_ratio: number;
  starting_capital_fiat_pct: number;
}

export interface Count {
  current: number;
  max: number;
  total_stake: number;
}

interface BaseStats {
  profit_ratio: number;
  profit_pct: number;
  profit_abs: number;
  count: number;
}

export interface Entry extends BaseStats {
  enter_tag: string;
}

export interface Exit extends BaseStats {
  exit_reason: string;
}

export interface MixTag extends BaseStats {
  mix_tag: string;
}

export interface PerformanceEntry extends BaseStats {
  pair: string;
  profit: number;
}

export interface Profit {
  profit_closed_coin: number;
  profit_closed_percent_mean: number;
  profit_closed_ratio_mean: number;
  profit_closed_percent_sum: number;
  profit_closed_ratio_sum: number;
  profit_closed_percent: number;
  profit_closed_ratio: number;
  profit_closed_fiat: number;
  profit_all_coin: number;
  profit_all_percent_mean: number;
  profit_all_ratio_mean: number;
  profit_all_percent_sum: number;
  profit_all_ratio_sum: number;
  profit_all_percent: number;
  profit_all_ratio: number;
  profit_all_fiat: number;
  trade_count: number;
  closed_trade_count: number;
  first_trade_date: string;
  first_trade_humanized: string;
  first_trade_timestamp: number;
  latest_trade_date: string;
  latest_trade_humanized: string;
  latest_trade_timestamp: number;
  avg_duration: string;
  best_pair: string;
  best_rate: number;
  best_pair_profit_ratio: number;
  best_pair_profit_abs: number;
  winning_trades: number;
  losing_trades: number;
  profit_factor: number;
  winrate: number;
  expectancy: number;
  expectancy_ratio: number;
  sharpe: number;
  sortino: number;
  sqn: number;
  calmar: number;
  cagr: number;
  max_drawdown: number;
  max_drawdown_abs: number;
  max_drawdown_start: string;
  max_drawdown_start_timestamp: number;
  max_drawdown_end: string;
  max_drawdown_end_timestamp: number;
  current_drawdown: number;
  current_drawdown_abs: number;
  current_drawdown_high: number;
  current_drawdown_start: string;
  current_drawdown_start_timestamp: number;
  trading_volume?: number;
  bot_start_timestamp: number;
  bot_start_date: string;
}

export interface ProfitAll {
  all: Profit;
  long?: Profit;
  short?: Profit;
}

export interface SellReason {
  wins: number;
  losses: number;
  draws: number;
}

export interface Stats {
  exit_reasons: Record<string, SellReason>;
  durations: Record<string, number | null>;
}

export interface DailyRecord {
  date: string;
  abs_profit: number;
  rel_profit: number;
  starting_balance: number;
  fiat_value: number;
  trade_count: number;
}

export interface DailyWeeklyMonthly {
  data: DailyRecord[];
  fiat_display_currency: string;
  stake_currency: string;
}

export interface Order {
  pair: string;
  order_id: string;
  status: string;
  remaining?: number;
  amount: number;
  safe_price: number;
  cost: number;
  filled?: number;
  ft_order_side: string;
  order_type: string;
  is_open: boolean;
  order_timestamp?: number;
  order_filled_timestamp?: number;
  ft_fee_base?: number;
  ft_order_tag?: string;
}

export interface Trade {
  trade_id: number;
  pair: string;
  base_currency: string;
  quote_currency: string;
  is_open: boolean;
  is_short: boolean;
  exchange: string;
  amount: number;
  amount_requested: number;
  stake_amount: number;
  max_stake_amount?: number;
  strategy: string;
  enter_tag?: string;
  timeframe: number;
  fee_open?: number;
  fee_open_cost?: number;
  fee_open_currency?: string;
  fee_close?: number;
  fee_close_cost?: number;
  fee_close_currency?: string;
  open_date: string;
  open_timestamp: number;
  open_fill_date?: string;
  open_fill_timestamp?: number;
  open_rate: number;
  open_rate_requested?: number;
  open_trade_value: number;
  close_date?: string;
  close_timestamp?: number;
  close_rate?: number;
  close_rate_requested?: number;
  close_profit?: number;
  close_profit_pct?: number;
  close_profit_abs?: number;
  profit_ratio?: number;
  profit_pct?: number;
  profit_abs?: number;
  profit_fiat?: number;
  realized_profit: number;
  realized_profit_ratio?: number;
  exit_reason?: string;
  exit_order_status?: string;
  stop_loss_abs?: number;
  stop_loss_ratio?: number;
  stop_loss_pct?: number;
  stoploss_last_update?: string;
  stoploss_last_update_timestamp?: number;
  initial_stop_loss_abs?: number;
  initial_stop_loss_ratio?: number;
  initial_stop_loss_pct?: number;
  min_rate?: number;
  max_rate?: number;
  nr_of_successful_entries: number;
  nr_of_successful_exits: number;
  has_open_orders: boolean;
  orders: Order[];
  leverage?: number;
  interest_rate?: number;
  liquidation_price?: number;
  funding_fees?: number;
  trading_mode?: string;
  amount_precision?: number;
  price_precision?: number;
  precision_mode?: number;
}

export interface OpenTrade extends Trade {
  stoploss_current_dist?: number;
  stoploss_current_dist_pct?: number;
  stoploss_current_dist_ratio?: number;
  stoploss_entry_dist?: number;
  stoploss_entry_dist_ratio?: number;
  current_rate: number;
  total_profit_abs: number;
  total_profit_fiat?: number;
  total_profit_ratio?: number;
}

export interface TradeResponse {
  trades: Trade[];
  trades_count: number;
  offset: number;
  total_trades: number;
}

export interface LockModel {
  id: number;
  active: boolean;
  lock_end_time: string;
  lock_end_timestamp: number;
  lock_time: string;
  lock_timestamp: number;
  pair: string;
  side: string;
  reason?: string;
}

export interface Locks {
  lock_count: number;
  locks: LockModel[];
}

export interface LocksPayload {
  pair: string;
  side?: string;
  until: string;
  reason?: string;
}

export interface Logs {
  log_count: number;
  // [formattedTime, createdMs, module, level, message]
  logs: [string, number, string, string, string][];
}

export interface ForceEnterPayload {
  pair: string;
  side?: "long" | "short";
  price?: number;
  ordertype?: string;
  stakeamount?: number;
  entry_tag?: string;
  leverage?: number;
}

export interface ForceExitPayload {
  tradeid: string | number;
  ordertype?: string;
  amount?: number;
  price?: number;
}

export interface BlacklistResponse {
  blacklist: string[];
  blacklist_expanded: string[];
  errors: Record<string, unknown>;
  length: number;
  method: string[];
}

export interface WhitelistResponse {
  whitelist: string[];
  length: number;
  method: string[];
}

export interface UnfilledTimeout {
  entry?: number;
  exit?: number;
  unit?: string;
  exit_timeout_count?: number;
}

export interface ShowConfig {
  version: string;
  strategy_version?: string;
  api_version: number;
  dry_run: boolean;
  trading_mode: string;
  margin_mode: string;
  short_allowed: boolean;
  stake_currency: string;
  proxy_coin?: string;
  stake_amount: string;
  available_capital?: number;
  stake_currency_decimals: number;
  max_open_trades: number;
  minimal_roi: Record<string, number>;
  stoploss?: number;
  stoploss_on_exchange: boolean;
  trailing_stop?: boolean;
  trailing_stop_positive?: number;
  trailing_stop_positive_offset?: number;
  trailing_only_offset_is_reached?: boolean;
  unfilledtimeout?: UnfilledTimeout;
  order_types?: Record<string, unknown>;
  use_custom_stoploss?: boolean;
  timeframe?: string;
  timeframe_ms: number;
  timeframe_min: number;
  exchange: string;
  demo_trading: boolean;
  strategy?: string;
  force_entry_enable: boolean;
  exit_pricing: Record<string, unknown>;
  entry_pricing: Record<string, unknown>;
  bot_name: string;
  /** "running" | "paused" | "stopped" */
  state: string;
  runmode: string;
  position_adjustment_enable: boolean;
  max_entry_position_adjustment: number;
}

export interface DeleteTrade {
  cancel_order_count: number;
  result: string;
  result_msg: string;
  trade_id: number;
}

export interface PairHistory {
  strategy: string;
  pair: string;
  timeframe: string;
  timeframe_ms: number;
  columns: string[];
  all_columns: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[][];
  annotations?: { type: string; start: string; end: string; note?: string }[] | null;
  length: number;
  buy_signals: number;
  sell_signals: number;
  enter_long_signals: number;
  exit_long_signals: number;
  enter_short_signals: number;
  exit_short_signals: number;
  last_analyzed: string;
  last_analyzed_ts: number;
  data_start_ts: number;
  data_start: string;
  data_stop: string;
  data_stop_ts: number;
}

export type PlotConfig = Record<string, unknown>;

export interface StrategyParameter {
  param_type: "IntParameter" | "RealParameter" | "DecimalParameter" | "BooleanParameter" | "CategoricalParameter";
  name: string;
  space: string;
  load: boolean;
  optimize: boolean;
  value: unknown;
  low?: unknown;
  high?: unknown;
  decimals?: number;
  opt_range?: unknown[];
}

export interface StrategyResponse {
  strategy: string;
  timeframe?: string;
  params: StrategyParameter[];
  code: string;
}

export interface StrategyListResponse {
  strategies: string[];
}

export interface BacktestHistoryEntry {
  filename: string;
  strategy: string;
  run_id: string;
  backtest_start_time: number;
  notes?: string;
  backtest_start_ts?: number;
  backtest_end_ts?: number;
  timeframe?: string;
  timeframe_detail?: string;
}

export interface BacktestResponse {
  status: string;
  running: boolean;
  status_msg: string;
  step: string;
  progress: number;
  trade_count?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backtest_result?: Record<string, any> | null;
}

export interface BacktestMarketChange {
  columns: string[];
  length: number;
  data: unknown[][];
}

export interface BackgroundTaskStatus {
  job_id: string;
  job_category: string;
  status: string;
  running: boolean;
  progress?: number;
  progress_tasks?: Record<string, { description?: string; progress?: number; total?: number }>;
  error?: string;
}

export interface CpuInfo {
  cpu: number;
  pct: number;
}

export interface SysInfo {
  cpu_pct: number[];
  cpu_load: CpuInfo[];
  cpu_load_avg: Record<string, number>;
  cpu_count: number;
  cpu_avg: number;
  ram_pct: number;
}

export interface Health {
  last_process?: string;
  last_process_ts?: number;
  bot_start?: string;
  bot_start_ts?: number;
  bot_startup?: string;
  bot_startup_ts?: number;
}

export interface MarketModel {
  symbol: string;
  base: string;
  quote: string;
  spot: boolean;
  swap: boolean;
  active: boolean;
}

export interface MarketResponse {
  markets: Record<string, MarketModel>;
  exchange_id: string;
}

/* --------------------------- Download data -------------------------- */

export interface DownloadDataPayload {
  pairs: string[];
  timeframes?: string[];
  days?: number;
  timerange?: string;
  erase?: boolean;
  download_trades?: boolean;
  candle_types?: string[];
  prepend_data?: boolean;
}

export interface BgJobStarted {
  status: string;
  job_id: string;
}

/** GET /freqaimodels(webserver 模式限定)。 */
export interface FreqAIModelListResponse {
  freqaimodels: string[];
}

/* ------------------------- Pairlist evaluate ------------------------ */

export interface WhitelistEvaluateResponse {
  error: string | null;
  status: string;
  result?: WhitelistResponse | null;
}

export interface PairListParamSpec {
  type: string;
  default?: unknown;
  description?: string;
  help?: string;
  options?: string[];
}

/* -------------------------- Analysis tools -------------------------- */

export interface LookaheadAnalysisResult {
  strategy: string;
  has_bias: boolean;
  total_signals: number;
  biased_entry_signals: number;
  biased_exit_signals: number;
  biased_indicators: string[];
}

export interface LookaheadAnalysisResponse {
  status: string;
  running: boolean;
  status_msg: string;
  result?: LookaheadAnalysisResult | null;
}

export interface RecursiveAnalysisResult {
  strategy: string;
  startup_candles: number[];
  strategy_scc: number | null;
  /** indicator → (startup candle count → variance) */
  results: Record<string, Record<string, number>>;
}

export interface RecursiveAnalysisResponse {
  status: string;
  running: boolean;
  status_msg: string;
  result?: RecursiveAnalysisResult | null;
}

export interface PairListResponse {
  name: string;
  description: string;
  is_pairlist_generator: boolean;
  params: Record<string, PairListParamSpec>;
}

export interface PairListsResponse {
  pairlists: PairListResponse[];
}

export interface CustomDataEntry {
  key: string;
  type: string;
  value: unknown;
  created_at: string;
  updated_at?: string;
}

export interface ListCustomData {
  trade_id: number;
  custom_data: CustomDataEntry[];
}
