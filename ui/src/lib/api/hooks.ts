import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api/client";
import type {
  BackgroundTaskStatus,
  BacktestHistoryEntry,
  BacktestResponse,
  Balances,
  BgJobStarted,
  BlacklistResponse,
  Count,
  DailyWeeklyMonthly,
  DownloadDataPayload,
  Entry,
  Exit,
  ForceEnterPayload,
  FreqAIModelListResponse,
  ForceExitPayload,
  Health,
  ListCustomData,
  Locks,
  LocksPayload,
  Logs,
  LookaheadAnalysisResponse,
  MarketResponse,
  OpenTrade,
  PairHistory,
  PairListsResponse,
  PerformanceEntry,
  Profit,
  RecursiveAnalysisResponse,
  ResultMsg,
  ShowConfig,
  Stats,
  StatusMsg,
  StrategyListResponse,
  StrategyResponse,
  SysInfo,
  TradeResponse,
  Version,
  WhitelistEvaluateResponse,
  WhitelistResponse,
} from "@/lib/api/types";

const POLL_FAST = 5_000; // live trading state
const POLL_MED = 15_000; // config / health
const POLL_SLOW = 60_000; // stats / history

type Opts<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

/* ------------------------------ Info ------------------------------ */

export const useVersion = (opts?: Opts<Version>) =>
  useQuery({ queryKey: ["version"], queryFn: () => api<Version>("/version"), staleTime: Infinity, ...opts });

export const useShowConfig = (opts?: Opts<ShowConfig>) =>
  useQuery({
    queryKey: ["show_config"],
    queryFn: () => api<ShowConfig>("/show_config"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useLogs = (limit = 200, opts?: Opts<Logs>) =>
  useQuery({
    queryKey: ["logs", limit],
    queryFn: () => api<Logs>("/logs", { query: { limit } }),
    refetchInterval: POLL_FAST,
    ...opts,
  });

export const useSysinfo = (opts?: Opts<SysInfo>) =>
  useQuery({
    queryKey: ["sysinfo"],
    queryFn: () => api<SysInfo>("/sysinfo"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useHealth = (opts?: Opts<Health>) =>
  useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: POLL_MED,
    ...opts,
  });

/* --------------------------- Trading info -------------------------- */

export const useBalance = (opts?: Opts<Balances>) =>
  useQuery({
    queryKey: ["balance"],
    queryFn: () => api<Balances>("/balance"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useCount = (opts?: Opts<Count>) =>
  useQuery({
    queryKey: ["count"],
    queryFn: () => api<Count>("/count"),
    refetchInterval: POLL_FAST,
    ...opts,
  });

export const useProfit = (opts?: Opts<Profit>) =>
  useQuery({
    queryKey: ["profit"],
    queryFn: () => api<Profit>("/profit"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useStats = (opts?: Opts<Stats>) =>
  useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats"), refetchInterval: POLL_SLOW, ...opts });

export const usePerformance = (opts?: Opts<PerformanceEntry[]>) =>
  useQuery({
    queryKey: ["performance"],
    queryFn: () => api<PerformanceEntry[]>("/performance"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useEntries = (pair?: string, opts?: Opts<Entry[]>) =>
  useQuery({
    queryKey: ["entries", pair ?? ""],
    queryFn: () => api<Entry[]>("/entries", { query: { pair } }),
    refetchInterval: POLL_SLOW,
    ...opts,
  });

export const useExits = (pair?: string, opts?: Opts<Exit[]>) =>
  useQuery({
    queryKey: ["exits", pair ?? ""],
    queryFn: () => api<Exit[]>("/exits", { query: { pair } }),
    refetchInterval: POLL_SLOW,
    ...opts,
  });

export type TimeUnit = "daily" | "weekly" | "monthly";

export const useTimeunitProfit = (unit: TimeUnit, timescale?: number, opts?: Opts<DailyWeeklyMonthly>) =>
  useQuery({
    queryKey: ["timeunit", unit, timescale ?? 0],
    queryFn: async () => {
      const res = await api<DailyWeeklyMonthly>(`/${unit}`, {
        query: timescale ? { timescale } : {},
      });
      // 接口按日期倒序返回;此处统一转为升序(左旧右新)——所有消费方按此约定实现,
      // 新增消费方不要再假设接口原生顺序。
      return {
        ...res,
        data: [...res.data].sort((a, b) => a.date.localeCompare(b.date)),
      };
    },
    refetchInterval: POLL_SLOW,
    ...opts,
  });

/* ------------------------------ Trades ----------------------------- */

export const useOpenTrades = (opts?: Opts<OpenTrade[]>) =>
  useQuery({
    queryKey: ["status"],
    queryFn: () => api<OpenTrade[]>("/status"),
    refetchInterval: POLL_FAST,
    ...opts,
  });

export const useTrades = (limit = 500, offset = 0, opts?: Opts<TradeResponse>) =>
  useQuery({
    queryKey: ["trades", limit, offset],
    queryFn: () => api<TradeResponse>("/trades", { query: { limit, offset } }),
    refetchInterval: POLL_SLOW,
    ...opts,
  });

export const useTradeCustomData = (tradeId: number, opts?: Opts<ListCustomData[]>) =>
  useQuery({
    queryKey: ["trade-custom-data", tradeId],
    queryFn: () => api<ListCustomData[]>(`/trades/${tradeId}/custom-data`),
    ...opts,
  });

/* ---------------------------- Pair lists --------------------------- */

export const useWhitelist = (opts?: Opts<WhitelistResponse>) =>
  useQuery({
    queryKey: ["whitelist"],
    queryFn: () => api<WhitelistResponse>("/whitelist"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useBlacklist = (opts?: Opts<BlacklistResponse>) =>
  useQuery({
    queryKey: ["blacklist"],
    queryFn: () => api<BlacklistResponse>("/blacklist"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useLocks = (opts?: Opts<Locks>) =>
  useQuery({
    queryKey: ["locks"],
    queryFn: () => api<Locks>("/locks"),
    refetchInterval: POLL_MED,
    ...opts,
  });

export const useMarkets = (quote?: string, opts?: Opts<MarketResponse>) =>
  useQuery({
    queryKey: ["markets", quote ?? ""],
    queryFn: () => api<MarketResponse>("/markets", { query: { quote } }),
    staleTime: POLL_SLOW,
    ...opts,
  });

/* --------------------------- Candle data --------------------------- */

export const usePairCandles = (
  pair: string,
  timeframe: string,
  limit = 500,
  opts?: Opts<PairHistory>,
) =>
  useQuery({
    queryKey: ["pair_candles", pair, timeframe, limit],
    queryFn: () => api<PairHistory>("/pair_candles", { query: { pair, timeframe, limit } }),
    enabled: Boolean(pair && timeframe),
    refetchInterval: POLL_MED,
    ...opts,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plot_config 结构随策略自由定义
export const usePlotConfig = (opts?: Opts<Record<string, any>>) =>
  useQuery({
    queryKey: ["plot_config"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api<Record<string, any>>("/plot_config"),
    staleTime: POLL_SLOW,
    ...opts,
  });

export interface PairHistoryParams {
  pair: string;
  timeframe: string;
  /** e.g. "20250101-20250201" */
  timerange: string;
  strategy?: string;
}

/**
 * Strategy-analyzed candles over a historical timerange (POST /pair_history).
 * Used by the backtest result review chart; no polling — the past is static.
 */
export const usePairHistory = (params: PairHistoryParams | null, opts?: Opts<PairHistory>) =>
  useQuery({
    queryKey: [
      "pair_history",
      params?.strategy ?? "",
      params?.pair ?? "",
      params?.timeframe ?? "",
      params?.timerange ?? "",
    ],
    queryFn: () => api<PairHistory>("/pair_history", { method: "POST", body: params }),
    enabled: Boolean(params?.pair && params?.timeframe && params?.timerange),
    staleTime: Infinity,
    retry: 1,
    ...opts,
  });

/* ---------------------------- Strategy ----------------------------- */

export const useStrategies = (opts?: Opts<StrategyListResponse>) =>
  useQuery({
    queryKey: ["strategies"],
    queryFn: () => api<StrategyListResponse>("/strategies"),
    staleTime: POLL_SLOW,
    retry: 1,
    ...opts,
  });

export const useStrategy = (name: string | undefined, opts?: Opts<StrategyResponse>) =>
  useQuery({
    queryKey: ["strategy", name ?? ""],
    queryFn: () => api<StrategyResponse>(`/strategy/${encodeURIComponent(name!)}`),
    enabled: Boolean(name),
    staleTime: POLL_SLOW,
    retry: 1,
    ...opts,
  });

/* ---------------------------- Backtest ----------------------------- */

export const useBacktestHistory = (opts?: Opts<BacktestHistoryEntry[]>) =>
  useQuery({
    queryKey: ["backtest-history"],
    queryFn: () => api<BacktestHistoryEntry[]>("/backtest/history"),
    refetchInterval: POLL_MED,
    retry: 1,
    ...opts,
  });

/** Poll a (possibly running) backtest job state. */
export const useBacktestStatus = (opts?: Opts<BacktestResponse>) =>
  useQuery({
    queryKey: ["backtest-status"],
    queryFn: () => api<BacktestResponse>("/backtest"),
    refetchInterval: (q) => (q.state.data?.running ? 2_000 : false),
    retry: 1,
    ...opts,
  });

export const useBacktestResultFile = (
  file: string | undefined,
  strategy: string | undefined,
  opts?: Opts<BacktestResponse>,
) =>
  useQuery({
    queryKey: ["backtest-result", file ?? "", strategy ?? ""],
    queryFn: () =>
      api<BacktestResponse>("/backtest/history/result", {
        query: { filename: file, strategy },
      }),
    enabled: Boolean(file && strategy),
    retry: 1,
    ...opts,
  });

export const useBackgroundTasks = (opts?: Opts<BackgroundTaskStatus[]>) =>
  useQuery({
    queryKey: ["background"],
    queryFn: () => api<BackgroundTaskStatus[]>("/background"),
    refetchInterval: (q) => (q.state.data?.some((t) => t.running) ? 2_000 : POLL_MED),
    retry: 1,
    ...opts,
  });

export const useDownloadData = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DownloadDataPayload) =>
      api<BgJobStarted>("/download_data", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["background"] });
    },
  });
};

/* --------------------- Pairlist evaluation (webserver) --------------- */

export const usePairlistsAvailable = (opts?: Opts<PairListsResponse>) =>
  useQuery({
    queryKey: ["pairlists-available"],
    queryFn: () => api<PairListsResponse>("/pairlists/available"),
    staleTime: Infinity,
    retry: 1,
    ...opts,
  });

export const useEvaluatePairlists = () =>
  useMutation({
    mutationFn: (payload: {
      pairlists: Record<string, unknown>[];
      blacklist: string[];
      stake_currency: string;
    }) => api<BgJobStarted>("/pairlists/evaluate", { method: "POST", body: payload }),
  });

/** Poll a pairlist evaluation job until it finishes. */
export const usePairlistEvalResult = (jobId: string | null, opts?: Opts<WhitelistEvaluateResponse>) =>
  useQuery({
    queryKey: ["pairlist-eval", jobId ?? ""],
    queryFn: async () => {
      const pending: WhitelistEvaluateResponse = { status: "pending", error: null, result: null };
      try {
        const res = await api<WhitelistEvaluateResponse>(`/pairlists/evaluate/${jobId}`);
        // I-1 竞态加固:POST 创建 job(is_running=false)到后台任务置位之间有窗口,
        // 此间 GET 会返回 success+空 result {};whitelist 缺失按挂起处理,避免组件渲染崩溃
        if (res.status === "success" && !Array.isArray(res.result?.whitelist)) return pending;
        return res;
      } catch (e) {
        // 运行期间后端返回 400 "Job not finished yet."——映射为挂起态,不能谎报为失败。
        // N-a:双判 detail 文本,避免未来该路径出现其他 400 时被误吞为永久 pending
        if (e instanceof ApiError && e.status === 400 && e.detail === "Job not finished yet.") {
          return pending;
        }
        throw e;
      }
    },
    enabled: Boolean(jobId),
    // I-2:硬错误(404/500/断网)下停止轮询,避免每 2s 无限重试
    refetchInterval: (q) =>
      q.state.status === "error" || q.state.data?.status === "success" || q.state.data?.error
        ? false
        : 2_000,
    retry: 1,
    ...opts,
  });

/* ------------------- Strategy analysis tools (webserver) ------------- */

export const useStartLookahead = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<BgJobStarted>("/lookahead_analysis", { method: "POST", body: payload }),
  });

export const useLookaheadResult = (jobId: string | null, opts?: Opts<LookaheadAnalysisResponse>) =>
  useQuery({
    queryKey: ["lookahead", jobId ?? ""],
    queryFn: () => api<LookaheadAnalysisResponse>(`/lookahead_analysis/${jobId}`),
    enabled: Boolean(jobId),
    // I-2:硬错误下停止轮询(NaN 结果致后端稳定 500 的场景不再每 2s 无限打)
    refetchInterval: (q) =>
      q.state.status === "error" ||
      (q.state.data?.running === false && q.state.data?.status !== "running")
        ? false
        : 2_000,
    retry: 1,
    ...opts,
  });

export const useStartRecursive = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<BgJobStarted>("/recursive_analysis", { method: "POST", body: payload }),
  });

export const useRecursiveResult = (jobId: string | null, opts?: Opts<RecursiveAnalysisResponse>) =>
  useQuery({
    queryKey: ["recursive", jobId ?? ""],
    queryFn: () => api<RecursiveAnalysisResponse>(`/recursive_analysis/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (q) =>
      q.state.status === "error" ||
      (q.state.data?.running === false && q.state.data?.status !== "running")
        ? false
        : 2_000,
    retry: 1,
    ...opts,
  });

/* ----------------------------- Mutations --------------------------- */

function useInvalidate(...keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export const useStartBot = () => {
  const invalidate = useInvalidate("show_config", "health");
  return useMutation({ mutationFn: () => api<StatusMsg>("/start", { method: "POST" }), onSuccess: invalidate });
};

export const useStopBot = () => {
  const invalidate = useInvalidate("show_config", "health");
  return useMutation({ mutationFn: () => api<StatusMsg>("/stop", { method: "POST" }), onSuccess: invalidate });
};

export const usePauseBot = () => {
  const invalidate = useInvalidate("show_config", "health");
  return useMutation({ mutationFn: () => api<StatusMsg>("/pause", { method: "POST" }), onSuccess: invalidate });
};

export const useReloadConfig = () => {
  const invalidate = useInvalidate("show_config");
  return useMutation({
    mutationFn: () => api<StatusMsg>("/reload_config", { method: "POST" }),
    onSuccess: invalidate,
  });
};

export const useForceEnter = () => {
  // WS entry_fill 失效兜底之外,纯轮询环境也要尽快刷新这些面
  const invalidate = useInvalidate("status", "count", "balance", "trades", "profit", "stats");
  return useMutation({
    mutationFn: (payload: ForceEnterPayload) => api<unknown>("/forceenter", { method: "POST", body: payload }),
    onSuccess: invalidate,
  });
};

export const useForceExit = () => {
  const invalidate = useInvalidate("status", "count", "balance", "trades", "profit", "stats");
  return useMutation({
    mutationFn: (payload: ForceExitPayload) => api<ResultMsg>("/forceexit", { method: "POST", body: payload }),
    onSuccess: invalidate,
  });
};

export const useDeleteTrade = () => {
  const invalidate = useInvalidate("trades", "status", "count", "profit");
  return useMutation({
    mutationFn: (tradeId: number) => api<unknown>(`/trades/${tradeId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
};

export const useReloadTrade = () => {
  const invalidate = useInvalidate("status", "trades");
  return useMutation({
    mutationFn: (tradeId: number) => api<OpenTrade>(`/trades/${tradeId}/reload`, { method: "POST" }),
    onSuccess: invalidate,
  });
};

export const useCancelOpenOrder = () => {
  const invalidate = useInvalidate("status", "trades");
  return useMutation({
    mutationFn: (tradeId: number) => api<OpenTrade>(`/trades/${tradeId}/open-order`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
};

export const useAddBlacklist = () => {
  const invalidate = useInvalidate("blacklist", "whitelist");
  return useMutation({
    mutationFn: (pairs: string[]) => api<BlacklistResponse>("/blacklist", { method: "POST", body: { blacklist: pairs } }),
    onSuccess: invalidate,
  });
};

export const useRemoveBlacklist = () => {
  const invalidate = useInvalidate("blacklist", "whitelist");
  return useMutation({
    // Backend reads repeated query params (list[str] = Query), not a body.
    mutationFn: (pairs: string[]) =>
      api<BlacklistResponse>("/blacklist", {
        method: "DELETE",
        query: { pairs_to_delete: pairs },
      }),
    onSuccess: invalidate,
  });
};

export const useAddLocks = () => {
  const invalidate = useInvalidate("locks");
  return useMutation({
    mutationFn: (locks: LocksPayload[]) => api<Locks>("/locks", { method: "POST", body: locks }),
    onSuccess: invalidate,
  });
};

export const useDeleteLock = () => {
  const invalidate = useInvalidate("locks");
  return useMutation({
    mutationFn: ({ lockid, pair }: { lockid?: number; pair?: string }) =>
      lockid !== undefined
        ? api<Locks>(`/locks/${lockid}`, { method: "DELETE" })
        : api<Locks>("/locks/delete", { method: "POST", body: { pair } }),
    onSuccess: invalidate,
  });
};

export const useStartBacktest = () => {
  const invalidate = useInvalidate("backtest-status", "backtest-history");
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 回测载荷字段随 schema 演进,运行时由后端校验
    mutationFn: (payload: Record<string, any>) => api<BacktestResponse>("/backtest", { method: "POST", body: payload }),
    onSuccess: invalidate,
  });
};

/** GET /freqaimodels(webserver 模式限定;交易态 503 → 表单降级为手输框)。 */
export const useFreqAIModels = (opts?: Opts<FreqAIModelListResponse>) =>
  useQuery({
    queryKey: ["freqaimodels"],
    queryFn: () => api<FreqAIModelListResponse>("/freqaimodels"),
    staleTime: 60_000,
    retry: 1,
    ...opts,
  });

export const useAbortBacktest = () => {
  const invalidate = useInvalidate("backtest-status", "backtest-history");
  return useMutation({
    // Abort is GET /backtest/abort; DELETE /backtest only resets a finished run.
    mutationFn: () => api<BacktestResponse>("/backtest/abort"),
    onSuccess: invalidate,
  });
};

export const useDeleteBacktestFile = () => {
  const invalidate = useInvalidate("backtest-history");
  return useMutation({
    mutationFn: (file: string) => api<BacktestHistoryEntry[]>(`/backtest/history/${encodeURIComponent(file)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
};

export const useUpdateBacktestNotes = () => {
  const invalidate = useInvalidate("backtest-history");
  return useMutation({
    mutationFn: ({ file, strategy, notes }: { file: string; strategy: string; notes: string }) =>
      api<BacktestHistoryEntry[]>(`/backtest/history/${encodeURIComponent(file)}`, {
        method: "PATCH",
        body: { strategy, notes },
      }),
    onSuccess: invalidate,
  });
};
