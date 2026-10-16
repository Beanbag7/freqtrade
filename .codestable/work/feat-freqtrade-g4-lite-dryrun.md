# feat: G4-Lite LM 信号接入 Freqtrade Dry-run 与 FreqUI（LM→Freqtrade 迁移）

> 类型：feat（实施与验收单据均在本仓 freqtrade；LM 主仓只读参考）
> 状态：**CLOSED（2026-10-16）**——Owner 终裁 `G4: APPROVE_FINAL_ACCEPTANCE_AND_CLOSE`（OWNER_GATE_DISPOSITION）：按 `lm_migration/G4-final-acceptance-summary.md` 正式验收关闭。全链：四轮授权施工（G4 主体→合并修复→补充收口→最小收口）＋Codex 技术评审 PASS＋Owner 最终接受；末态 G4 65/65、G3 44/44、G2 双 venv、G1 140、冻结 SHA OK；证据时代区分与四项已接受风险在验收摘要 §3-§4 在案。后续门：Git 纳管（方案 v2 修订中，`G1-G4-git-adoption-plan.md`）与 G5 数据审计（阶段一进行中，`G5-phase1-coverage-report.md`）各自独立。
> 前序：G1 PASS（140/140）→ G2 PASS（42/42＋15/15）→ G3-Lite PASS 建议（阶段一 32＋阶段二 12 计 44/44，真实只读运行 24 评估含 1 BUY，零订单零成交零持仓；`lm_migration/G3-lite-stage2-final-report.md`）→ G4-Lite PASS 建议（31/31＋L1 三闭环＋L2 真实开仓；`lm_migration/G4-lite-final-report.md`）
> 基线：FT `abd6e5a66`（2026.9）；LM `0c6d5352`（既有 Maker 漂移 100 项，本轮未触碰）

## 目标

把已真实运行验证的 LM 信号（G1 算法＋G2 特征＋G3 实时链）接入 Freqtrade 原生 Dry-run 虚拟开平仓、Trade/Order 数据库与 FreqUI——不重设计交易引擎，不改 G1 原始算法，不动 G3 观察策略。

## 现场（已核实，2026-10-16）

**Freqtrade 实际接口（源码逐项复核，与任务书引用一致）**：
- `freqtradebot.py:306-359` `process()`：`dataprovider.refresh` → `strategy_safe_wrapper(bot_loop_start, supress_error=True)` → `analyze(active_pair_whitelist)` → `exit_positions` → `enter_positions`。
- `interface.py:110` `process_only_new_candles=True` 默认；`:1220-1221` `if not self.process_only_new_candles or new_candle:`——**置 False 即每轮分析**（§四首要技术问题的原生开关，已确认）。
- 入场读取 `get_entry_signal` `:1354`；退出判定 `should_exit` `:1419`；`custom_exit` `:594`；`leverage()` `:832`。
- `trade_model.py:1418/1426` `Trade.set_custom_data/get_custom_data`（含 `get_custom_data_entry`）——信号 ID 与磁力目标的持久化载体存在。
- `pairlock_middleware.py:35/119/168/179` `lock_pair/unlock_pair/is_global_lock/is_pair_locked`——持久化锁存在。
- `exchange.py:1498-1530` `create_order`：`if self._config["dry_run"]: create_dry_run_order`——Dry-run 与真实下单分支分离，虚拟订单不碰真实接口。
- `api_trading.py`：`/entries:60 /exits:65 /profit:80 /profit_all:85 /status:157 /trades:167` 六端点均在。
- FreqUI 资源目录 `freqtrade/rpc/api_server/ui` 存在（本地 3.1.3 安装以集成阶段实测为准）。

**G3 现状（保持原状）**：`g3_lite/strategy.py` Entry/Exit 恒零、fail-closed；`observer.py` 幂等键 `(pair, candle_time, inputs_digest)`＋`weights_frozen` EMA 分离；44/44 离线＋真实运行证据；独立 config/sqlite/log。**G4 通过组合复用 Observer＋DemoApiClient＋G2 Adapter，不复制第二份客户端或信号算法。**

**Git 现状**：`lm_migration/`＋`.codestable/` untracked；FT tracked 文件零修改；G1/G2 冻结 SHA check OK（本轮复验，vendor 8 文件 @0c6d5352）。

## 边界

- **零实盘**：禁 `dry_run=false`、禁 live runmode、禁真实账户凭据、禁任何真实下单路径；配置 fail-closed（非明确 G4 模拟配置拒绝启动；启动失败不回落实盘配置）。
- **不改**：G1 算法、LM 主链/Maker、Freqtrade 核心、DemoAPI、G3 观察策略及其零订单合同；不重新引入旧 ML 模型；不提前做 G5 回测。
- **不另建**：禁止第二套独立交易数据库或持仓状态机——只用 FT 原生 Trade/Order、enter_tag、Trade custom data、PairLocks、订单状态。
- 施工范围：仅 `lm_migration/g4_lite/`（＋本单据）；FT tracked 文件零改动。

## 施工申请（请求 Owner 一次性批准的四项＋一项确认）

### 1) 交易映射政策（任务书 §二 原表，请求批准）

| LM 信号 | 当前状态 | G4 动作 |
|---|---|---|
| BUY | 空仓 | Long Entry |
| SELL | 空仓 | Short Entry |
| HOLD | 空仓 | 不操作 |
| BUY | 已有 Long | 不重复开仓 |
| SELL | 已有 Short | 不重复开仓 |
| HOLD | 已有持仓 | 不自动平仓 |
| BUY | 已有 Short | 先退出 Short |
| SELL | 已有 Long | 先退出 Long |

约束：**同一信号不得同时平仓＋反手开仓**；反向平仓后须等待新的有效信号，不得重复消费导致平仓的那条信号；不做二次方向反转（G1 已含原始反转参数）。

### 2) 初始模拟风险参数（保守候选，请求批准）

Futures isolated；杠杆 **1×**；单笔 **50 USDT** 虚拟资金；**最多 1 笔**同时持仓；硬止损 **`stoploss=-0.02`**；不加仓/不 DCA/不放大 stake；BTC、ETH、SOL 三永续；**仅 dry_run=true**。声明：G3 的 `stoploss=-0.99` 是观察占位值，**不用于 G4**。本组参数是模拟测试参数，不是生产风险配置。

### 3) 实际运行许可（请求批准两级）

- **L1 受控虚拟输入闭环**：离线验收后，用注入的虚拟信号/K线驱动完整开仓→（反向/止损）→平仓闭环，验证数据库与 API。
- **L2 真实公共行情＋DemoAPI 受控运行**：L1 通过后，用 G3 同款数据源受控运行（明确结束条件）；**市场无自然 BUY/SELL 时不降低 LM 原始阈值制造交易**，以 L1 受控样例证明交易路径。

### 4) Git 纳管方式（任务书 §九：G4 正式实施前必须明确）

建议：将 `lm_migration/`（g1_parity、g2_adapter 含 vendor＋sha_registry＋G2_REFERENCE_RESULTS、g3_lite 含 tests、g4_lite、各验收报告）与 `.codestable/`（attention/work/lessons）纳入版本控制。**排除**：API Key/Secret/JWT、SQLite 交易库、实时信号 JSONL、`user_data/`、FT 临时状态、`.gemini/`、`graphify-out/`、`lm-audit/`（非本迁移产物）。提交/推送/合并仍按 Owner 单独授权执行——请裁决纳管范围与方式（如：本仓新分支一次性引入，或维持 untracked 由 Owner 自行处理）。

### 5) FreqUI/API 确认项

启用 API Server 仅 `127.0.0.1`，端口避开 8080（DemoAPI）/8090（LM API）等（候选 **8088**）；独立用户名/密码/JWT（运行期环境注入，不入 Git 不落日志）；全新独立 `g4_lite` SQLite；验收 `/api/v1/status /trades /profit /profit_all /entries /exits`。承认 API Server 含可修改交易状态的操作，不伪称只读——靠隔离 Dry-run＋认证＋localhost＋操作范围管理。

## 技术方案要点（获批后实施依据，单一来源）

**最小文件**：`lm_migration/g4_lite/`——`strategy.py`（`LMDryRunStrategy(IStrategy)`）、`signal_mapping.py`（方向/退出/消费判定）、`config_lm_dryrun.json`、`tests/`、`README.md`；职责可合并则从简。

**同 K 线内信号更新（§四）**：`process_only_new_candles=False`。每轮 `bot_loop_start` 复用 G3 Observer 得最新评估→更新 per-pair 信号快照（action/signal_id/candle_time/digest/readiness/时间戳）→`populate_entry_trend` 仅在**最后已确认 K 线行**、快照与当前 K 线时间一致、且信号未消费时置位 Entry 列（不制造历史 DataFrame 虚假入场）。输入分类处置：新 K 线/新 DemoAPI 版本→可消费；相同输入重复→沿用已评估信号但不重复交易；`NOT_READY`/`ERROR`/超出有效窗口→**撤销待执行信号**（该轮及后续不得沿用旧 BUY/SELL 置位）；DEGRADED kline_estimate＝G2 已批准基础回退，不等同策略失败。

**信号 ID 与消费幂等（§五）**：`signal_id = sha256(pair|candle_time|inputs_digest|direction)[:12]`。消费证据落 FT 原生层：入场 `enter_tag=signal_id`（populate 列）；开仓后 `Trade.set_custom_data("lm_signal_id")`＋磁力目标；反向退出在被平 Trade 上记 `exit_signal_id`。每轮 `bot_loop_start` 从**数据库**重建消费视图（open trades 的 enter_tag、open orders、最近 closed trades 的 exit_signal_id）——进程内只做缓存，重启后不重复消费已交易信号。**重试政策（请批准）**：已成交＝永久消费；待成交＝不下新单；已取消/失败且无持仓＝同一 signal_id 最多重试 3 次后 PairLock 至 signal_id 变化。反向退出后：该 signal_id 记入抑制集，须等新 signal_id 才可再入场。

**止盈止损（§六）**：硬止损用原生 `stoploss=-0.02`（回调错误/DemoAPI 故障不使其失效——原生引擎持有）。磁力目标：入场时以 Trade custom data 记录 `magnet_tp`＋方向校验（Long 目标>成交价、Short 目标<成交价，不满足则弃用该目标）；不随 DemoAPI 每轮更新追逐目标价；优先 `custom_exit()`＋`minimal_roi`＋止损组合实现达标退出。**若 v1 无法可靠保存/恢复磁力目标，则明示其为未启用的退出增强，先以基本开平仓＋风险验收交付，不伪称磁力 TP 已执行。**

**G4 配置**：独立 `config_lm_dryrun.json`（trading_mode futures/isolated、`can_short=True`、dry_run_wallet、独立 db_url、独立 user_data、独立日志、API Server 如上）；与 G3 config/sqlite/日志零混用（验收项）。

## 证据与验收计划（任务书 §八 三阶段）

**阶段一 离线交易生命周期**（真实 FT 生命周期或最小集成测试，非仅单测 mapping 函数）：BUY→Long、SELL→Short、HOLD→不开仓、Long+SELL→退出、Short+BUY→退出、退出后旧信号不立即反手、同向重复信号不重复开仓、同 K 线内 DemoAPI 更新被消费、开仓未完成不重复下单、重启后不重复消费已持久化信号、已确认 K 线/时效/异常 fail-closed、Stoploss/ROI/Magnet 方向校验、**G3 观察策略仍零订单**。

**阶段二 独立 Dry-run 集成**：策略真实加载；`can_short=True` 在 futures 生效；交易对/市场类型/杠杆/模拟资金符合合同；Dry-run 模拟订单与 Trade/Order 库正常；成交/止损/退出状态正确；手续费与盈亏原生记录；无任何真实 OKX 下单请求；API Server localhost 正常；FreqUI 可读独立库的持仓与历史。先 L1 受控虚拟输入闭环，再 L2 真实数据受控运行。

**阶段三 回归与安全**：G1 140、G2 42＋15、G3 44、冻结 SHA、G3 零订单、DemoAPI 优先与基础回退、无旧模型依赖，全部保持；另验：`dry_run=false` 拒启、live 拒启、真实凭据不入模拟配置、G3/G4 策略/配置/日志/库不混用、API 端口非全接口绑定、持仓或止损状态异常时拒绝新开仓。

## 验收

- **PASS**：Dry-run 全链闭环＋数据库＋FreqUI 实测通过，安全与回归满足。
- **CONDITIONAL**：离线开发完成，但风险审批或真实 Dry-run/FreqUI 未验收。
- **REWORK**：重复开仓、错误反转、止损失效、交易安全或状态持久化缺陷。

## 状态与未决（请求裁决）

1. 交易映射政策批准（上表＋三约束）。
2. 初始模拟风险参数批准（1×/50 USDT/1 仓/-0.02/三对/仅 dry_run）。
3. 两级实际运行许可（L1 受控虚拟输入→L2 真实数据受控运行）。
4. Git 纳管方式（范围与排除清单如上；提交推送另批）。
5. FreqUI/API 端口 8088＋环境注入凭据方式确认。

获批后按「技术方案要点」直接开发，不另开全面架构审计；未获批前不写 G4 代码、不创建虚拟交易。

---

## 执行与验收记录（2026-10-16，已完成）

**实施**：`lm_migration/g4_lite/` 六件（strategy/signal_mapping/config/tests/tools/README）。信号快照＋DB 派生消费视图＋`lm-reverse-<sid>` 反向退出＋磁力目标成交价校验持久化；fail-closed 启动矩阵；G3 原状未动。

**验收**：离线 31/31（13 生命周期场景＋时效失效＋fail-closed＋多币）；L1 受控闭环三笔全以 `lm-reverse-*` 平仓（Long/Short 双向），FreqUI 六端点＋登录实测；L2 真实 DemoAPI 运行 19 分钟，27 评估全 READY 零错误，ETH 真实 BUY 开仓（enter_tag 落库）＋`lm_magnet_tp=2478.7` 持久化＋FreqUI 仪表板截图；SOL BUY/BTC SELL 被单仓政策原生拦下；G1 140 IDENTICAL、G2 双 venv PASS、G3 44/44、G4 31/31、SHA OK。

**裁定建议：PASS**。遗留声明：FT tracked 两处改动归 FreqUI 3.1.3 安装（非本任务动作，维持现状）；磁力目标跨重启不补记（v1 明示限制）；L1 stub 经一轮保真修复（后台求解＋缓存）；L2 单窗口未自然发生端点失败；Git 纳管方式仍未明示→维持 untracked。

**本单据停在 G4-Lite 验收门**：G5 历史回测与真实交易须新任务书与授权。

---

## 合并修复施工申请（2026-10-16，G4_COMBINED_ACCEPTANCE_FIX）

> 本节为当前唯一有效申请。Owner 范围裁决：**只迁移 LM 止盈策略，其他保持 G4 现状**。冻结不变项（任务书 §二）：stoploss -0.02、杠杆 1×、stake 50 USDT、最多 1 仓、futures isolated、BUY→Long/SELL→Short、现有反向平仓方式、三次取消重试上限、现有重入与冷却政策——本轮一律不动；不迁移 LM 风控/Maker 执行链/旧模型。全程离线（无真实 OKX/DemoAPI 运行），故**无需新运行许可**；无真实凭据、无真实订单。

**现场（2026-10-16 复核）**：FT HEAD `abd6e5a66`（任务书基线一致；`b9857af07`+`abd6e5a66` 为另一会话的 UI 提交，非本任务动作，不触碰）；LM `0c6d5352`（既有漂移 100 项未动）；G4 31/31、G3 44/44 基线绿。

### 申请一（P0）：LM 止盈同构

**已核实的 LM 现役规则（生产事实）**：
- `config.py:777` TAKE_PROFIT_MODE 默认 `dynamic`（.env 无覆盖）；`.env` `TAKE_PROFIT_PCT=60`（config.py:701 默认 3.0 被覆盖）。
- 目标优先级（`order_executor.py:642-660`）：`magnet_tp → target_price → take_profit_price`（G1 信号无第三项），首个**方向有效**者胜（`_directionally_valid_tp:634`：BUY 候选>现价、SELL 候选<现价）。
- 仓位模式（`.env:25` `OKX_POSITION_MODE=net`）→ `order_executor.py:3568-3572` **net 分支适用 front-run**（非 long_short 直取分支）：`frozen(BUY)=target×(1−front_run)`、`frozen(SELL)=target×(1+front_run)`，守卫：越过现价则回退原始 target（`:460-482`）。front_run＝`max(币种floor/100, atr14/price×0.25)`（`:447-460`＋生产 .env：floors BTC 0.20/ETH 0.15/SOL 0.15/DEFAULT 0.10、factor 0.25）。ATR 复用 `g2_adapter/features.py:23 compute_atr`（既有字节镜像），窗口同 LM（raw 末 60 根、period 14）。
- 无有效目标→固定回退（`:255-266`）：`TP=price×(1±TAKE_PROFIT_PCT/100/leverage)`；G4 杠杆 1× → ±60%（BUY×1.6/SELL×0.4，事实上的远端兜底）。

**G4 变更（请批准）**：①入场时按上表计算冻结目标（有效 magnet→有效 target→front-run 调整→固定回退），以**实际成交价**做方向校验（继承信号侧已对信号价的校验）；②目标＋来源（magnet_tp/target_price/fixed）＋signal_id 以 Trade custom data 持久化（重启可从库恢复；不可恢复的旧仓→仅 stoploss/反向退出，**不**回自创 ROI）；③`custom_exit()` 按持久目标执行（Long≥目标、Short≤目标）；④**移除无条件 2% ROI**：策略类与 config 的 `minimal_roi` 改为 `{"0": 100}`（永不触发），并核验 StrategyResolver 不再注入其他 ROI 默认值（启动日志实证）；⑤stoploss -0.02 与反向退出原样保留。

### 申请二（P0）：信号有效期修复（§四）

`_snapshot_touch` 仅在新有效 evaluation 时刷新（record=None/普通 heartbeat 不刷新）；ERROR/NOT_READY 立即撤销；60s 政策时长不变。策略时钟改为可注入（默认 time.time，测试注入假时钟），新增「连续重复回调>60s」RED→GREEN 用例。

### 申请三（P0）：READY→NOT_READY 直接判定（§五）

G4 每轮自行核验本轮 OHLCV（None/空/<500 根）→立即撤销该币待执行信号，与 G3 心跳限频解耦；恢复 READY 须等新有效 evaluation；单币异常不扩散；已有持仓继续由原生 stoploss/持久止盈管理；DEGRADED（G2 已批基础回退）不视为 NOT_READY；G3 零订单观察政策不动。

### 申请四（P1）：已交易信号持久去重（§六）

消费判定改为：存在任一 enter_tag＝当前 signal_id 且**有已成交入场**（open 或 closed、amount>0/有成交入场单）的 Trade 即永久消费（按 signal_id 有界查询，复用现有 enter_tag 索引列）；保留三次取消/失败重试、挂单中不重复下单、`lm-reverse-<sid>` 反向抑制、现有重入政策。测试 A→B→A（含进程重启后）不得再开仓；新 candle/新 digest 的新 signal_id 允许；Long/Short、多币隔离。不另建消费库/缓存/状态机。

### 申请五（P1）：实际模拟退出验证（§七）

离线但经**真实 FreqtradeBot 生命周期**（FT 测试手法：patched exchange＋脚本化价格/订单簿＋脚本化 dp，真实 bot.process() 进出单与 dry-run 成交模拟）：Long/Short 各验证 -2% stoploss 成交、LM magnet/target TP 成交、无目标固定回退 TP、反向退出与 TP 同满足时的 FT 原生处理顺序；逐项核验 Trade/Order/exit_reason/close_rate/手续费/盈亏。不再以旧 2% ROI 为预期；stoploss 数值不变，且不把 `stoploss_on_exchange=False` 描述为远端保护单。

### Git 纳管（§八，未获批→仅报告阻塞与候选清单）

`lm_migration/`＋`.codestable/` 维持 untracked（Owner 未明示方式；未经单独批准不 add/commit/push/merge/切分支）。候选清单——纳入：`lm_migration/`（g1_parity、g2_adapter 含 vendor＋sha_registry＋G2_REFERENCE_RESULTS、g3_lite、g4_lite、各验收报告）、`.codestable/`（attention/work/lessons）；排除：SQLite/JSONL/日志、`user_data/` 运行产物、API Key/Token/JWT、无关 UI 文件、`.gemini/`、`graphify-out/`、`lm-audit/` 等其他工作区资产。

### 请求裁决（合并五项）

1) LM 止盈同构实施（含移除 2% ROI、front-run net 分支、目标持久化）；2) 有效期修复（可注入时钟）；3) READY→NOT_READY 直接判定；4) 持久去重；5) 离线真实 bot 退出验证。批准后即施工并跑 §九 全量回归（G4 新增＋原 31、G3 44、G2 42+15、G1 140、冻结 SHA、fail-closed、G3 零订单），完成停在 G4 最终验收门，不进入 G5。


---

## 合并修复执行与验收记录（2026-10-16，已完成）

**实施**：`tp_policy.py`（LM dynamic 镜像：优先级/方向校验/net front-run/固定回退，参数全部取自生产 .env 与 order_executor 源）；`strategy.py`（ROI 移除、`_update_atr`、`_record_tp_targets`＋`lm_tp_target/source` 持久化、custom_exit 读库恢复、TTL 仅新评估刷新＋可注入时钟、每轮 OHLCV 就绪判定）；`signal_mapping.py`（`traded_signal_ids` 有成交即永久消费）；`config` minimal_roi {"0":100}；新增退出验证 harness（真实 FreqtradeBot.process()，FT 官方 patched-exchange 手法）。

**验收**：G4 53/53（47 离线＋6 真实 bot 退出：双向 stop_loss、lm_tp_magnet_tp/lm_tp_target_price、固定回退＋5% 不平仓（旧 ROI 已死）、反向与 TP 同帧原生顺序）；TTL RED→GREEN、A→B→A 含重启、readiness 单币隔离；G3 44/44、G2 双 venv PASS、G1 140 IDENTICAL、SHA OK、fail-closed 矩阵全过。冻结项（-0.02/1×/50/1仓/isolated/映射/反向/三次重试/重入政策）零漂移。

**遗留声明**：跨重启不回填旧仓 TP（v1 边界）；退出验证交易所面为离线合成（amount_to_precision/min-stake/funding-mark 三项 patch，已声明）；FT 工作树 ui/src diff 归另一会话（非本任务）；front-run 守卫以成交价为基准（既定 G4 差异，归档）。

**裁定建议 PASS，停在 G4 最终验收门（G4_FINAL_REVIEW）**；G5 历史回测与真实交易须新任务书与授权。

---

## 补充收口施工申请（G4_FINAL_REVIEW → CONDITIONAL，2026-10-16）

> 触发：Codex「G4 最终验收补充收口」任务书（C2C: STATE=G4_COMBINED_FIX_REVIEW / VERDICT=CONDITIONAL / NEXT=BOUNDED_TP_AND_QUERY_CLOSEOUT）。范围仅下列四项施工＋定向测试＋回归；冻结边界按原任务书全部维持。授权覆盖核对（只读）：第 4 项属本单申请四（:145 已批「按 signal_id 有界查询，复用现有 enter_tag 索引列」）的履约修正——现实现 `Trade.get_trades([Trade.pair==pair])` 全量偏离；第 1/2/3 项引入新回调机制／改已交付值／改 TP 数值输出，超出已批申请字面范围。依「无授权不写码」合并一份有限申请，获批后施工。

### 项目一（P0）：TP 冻结时机前移至原生 order_filled

事实（复核属实）：FT 每轮顺序 bot_loop_start（freqtradebot.py:329）→ analyze（:334）→ enter_positions（:358）；本策略 `_record_tp_targets` 在 bot_loop_start 末尾（strategy.py:127），且依赖仅存内存的 `_signal_history`（:89、:264）——新仓成交后若在下一轮前重启，TP 既未持久化、重启后也永久不可恢复（:265 因 history 缺失跳过）。
施工：策略新增原生 `order_filled()` 回调（FT 在 `_update_trade_after_fill` 调用，freqtradebot.py:2560-2564，随 :2554 同轮 `Trade.commit()` 落库）：入场侧且订单实际成交（status=="closed" 且 filled>0，`NON_OPEN_EXCHANGE_STATES=(*CANCELED, "closed")` 需显式门控）且该 Trade 尚无 `lm_tp_target` 时，立即按已批申请三同参数冻结（`tp_policy.resolve_tp`，fill_price=trade.open_rate，ATR=`self._last_atr`，信号事实=`_signal_history[enter_tag]`——同轮 bot_loop_start 已写入，含后续轮成交的挂单场景）。`bot_loop_start` 的 `_record_tp_targets` 保留为幂等补漏路径（只补缺、不覆写）；重启恢复＝成交时已入库。
测试：真实离线 harness「成交→不进下一轮→重建策略实例（同库）」TP 仍在且等于成交时冻结值；重启幂等（不重算）；既有 53 用例参数零改动。
风险声明：若 `order_filled` 在 dry-run 成交路径无法实证可靠触发，停下转为提交 Owner 剩余风险审批，不伪称恢复通过。

### 项目二（P0）：ROI 严格禁用

事实（复核属实）：`{"0":100}` 非严格禁用；`minimal_roi={}` 时 interface.py:1705-1711 roi_list 为空→roi=None→`min_roi_reached` 恒 False（:1729-1730）；`_override_attribute_helper`（strategy_resolver.py:106-110）对 config 中存在的键原样写入，默认 `{"0":10}` 仅在策略类未定义时注入（:115-127）；schema 仅 patternProperties、无 minProperties/required（build_helpers/schema.json:130-138）——空对象合法。
施工：策略类与 config 双源 `minimal_roi={}`；经 StrategyResolver 实际加载后断言 `bot.strategy.minimal_roi=={}`（含 config 同值）；`min_roi_reached` 多时段负向用例（use_custom_roi 未启用）；离线 `validate_config_schema` 预检通过。
不变量：stoploss -0.02、反向退出、custom_exit 原样；既有「+5% 不平仓」用例保留。

### 项目三（P0）：TP 数值精度对齐 LM 2 位小数

事实（复核属实）：LM front-run 冻结价与守卫回退均 `round(…,2)`（order_executor.py:466/472/474/480），固定回退同 `round(…,2)`（:266-267）；G4 `tp_policy.py:53-56/:67-68` 现为 8 位——同一冻结输入与 LM 产出存在分位级差异。
施工：`tp_policy` 五处改 `round(…,2)`（front-run 冻结价、守卫回退 target、固定回退多/空）；magnet/target 沿 API 载荷原值（LM 同）；交易所价格精度仍由 FT 原生下单时处理。
测试：同一冻结输入的 LM/G4 数值对照（矩阵：4 币种×多/空×ATR 高于/低于 floor×守卫触发/未触发×固定回退），LM 侧以 order_executor.py 源公式（round 2）为对照 oracle；生产证据复核 `.env:94 TAKE_PROFIT_PCT=60`（单行 grep，不读其他内容；LM HEAD `0c6d5352`）。

### 项目四（P0）：历史信号消费有界查询

事实（复核属实）：strategy.py:196 每轮全量读取该交易对全部 Trade（:189-240），偏离已批申请四承诺。
施工：消费事实改为有界查询——a) 该交易对 open 持仓（is_open 过滤，量级≤max_open_trades）；b) `Trade.get_trades([Trade.pair==…, Trade.enter_tag==当前 signal_id])` 定向覆盖永久消费与该信号取消计数（trade_model.py:1903 原生接口，enter_tag 索引列）；c) 最近退出事实以当前 signal 相关 tag 为范围定向查询，不做全对全历史扫描（与 signal_mapping 全部消费点核对后现场定稿，不变量＝既有 53 用例语义零变化）。永久消费、三次重试、`lm-reverse-<sid>` 抑制、重入政策全部不变；不建第二套存储。
测试：A→B→A、重启恢复、该对 500 笔历史交易下行为正确＋spy 断言查询为 enter_tag/is_open 有界（无全对扫描）。

### 回归与验证（全部本轮实际执行，不复用历史 PASS）

G4 全量（原 53＋上述新增）／G3 44／G2 双 venv 42+15／G1 140 IDENTICAL／冻结 SHA／FT tracked 零改动（ui/src 归另一会话）。

### 明确不变（冻结）

止损 -0.02、1×、50 USDT、1 仓、BUY/SELL 映射与反向平仓、60s TTL、NOT_READY 判定、三次重试、重入政策、G1-G3 算法、FT 核心、LM 主仓/DemoAPI/UI。Git 纳管仍留独立审批门（本轮不 add/commit/push）。仅离线 dry-run 验证，不进 G5。

> 批准口径建议：回复「批准」＝按上述范围批准四项施工与回归验证；回复「批准第 X 项」或调整意见＝按批复范围执行。
>
> **Owner 批复（2026-10-16）：「批准」——四项全批，按申请范围施工与回归验证。**
>
> **执行与验收记录（同日完成）**：四项全部落地——①`order_filled` 成交即冻结（strategy.py:261-313，`_record_tp_targets` 降级补漏 :315-326）；②`minimal_roi={}` 三源（strategy.py:59／config:7／harness:128）＋resolver 加载实证；③`tp_policy` 全 round(…,2)（:50-70）＋LM 源公式 oracle 逐组合精确对照；④`_refresh_consumed` 有界化（strategy.py:192-259，enter_tag/is_open/exit_reason 三路定向，signal_mapping 零改动）。**G4 63/63**（新增 10：含真实 bot「成交→不进下轮→重启 TP 仍在」spy 实证、resolver 装载 `{}` 实证、500 笔大历史有界 spy）；G3 44/44、G2 双 venv PASS（42/42＋15/15）、G1 140 IDENTICAL、冻结 SHA OK（8 vendor @0c6d5352）、FT tracked 零本任务改动。报告：`lm_migration/G4-final-closeout-report.md`（裁定建议 PASS）。
> **状态：AWAITING OWNER — G4 终裁（G4_FINAL_REVIEW，Codex CONDITIONAL 四项已全部收口）**。G5 与真实交易须新任务书与授权。

---

## 最小收口施工申请二（MINIMAL_FAIL_CLOSED_CLOSEOUT，2026-10-16）

> 触发：Codex G4_FINAL_REVIEW 二轮裁决 CONDITIONAL（NEXT: MINIMAL_FAIL_CLOSED_CLOSEOUT），仅两项，不重新设计、不扩大范围。授权核对（只读）：第 1 项为**新的行为规格**（c) 反向痕迹查询异常时 fail-closed 拒绝入场），已批申请均未涉及该分支的异常行为；第 2 项要求 Owner **明示确认接受剩余风险**——两项皆未覆盖，依任务书「若不覆盖先申请有限授权并停止写入」合并一份申请，获批后施工。

### 项目一（P0）：反向退出痕迹查询异常分支 fail-closed

事实（复核属实）：strategy.py:251-259 现状 `except` 仅告警放行——查询失败时 `last_exit_reason` 缺失 → signal_mapping:92 反向抑制不生效 → 该 signal_id **可**入场；与既有「数据库不可用 → fail-closed 拒绝开仓」（a/b 查询路径 :197-201 `abnormal_position=True`）不一致。
施工：把 c) 查询并入主 try/except——**任一**消费查询失败 → `view.abnormal_position = True`（复用既有唯一拦截机制，signal_mapping 决策层零改动；`ConsumedView.abnormal_position` 注释语义更新为「持仓/查询状态异常：拒绝新开仓」）。不新增字段/数据库/状态机；正常路径交易映射与重入政策零变化。
测试：①定向——反向平仓已完成（库内存在 `exit_reason=lm-reverse-<sid>` 的已平仓 Trade）→ 注入查询异常 → 该轮入场列为 0（不得再次开仓）；②回归——异常恢复后下一轮，旧 signal_id 仍被 :92 正常路径抑制、**新** signal_id 允许入场；③既有 G4 全量保持。

### 项目二（P0）：表述更正＋剩余风险 Owner 确认

事实（复核属实）：`G4-final-closeout-report.md`:12「与成交原子落库」、:58「窗口压缩到零」过强。实际机制：trade/订单落库（freqtradebot.py:1236 `Trade.commit()`）与 TP custom data 落库（custom_data.py:189-191 **独立**即时 commit，发生于 :1252 `update_trade_state` 内部）是**两次独立提交**；正常即时成交路径两者在同一 `process()` 轮内先后完成。
施工：更正报告 §A/§C/§G 相应表述为「正常即时成交路径当轮保存 TP；成交记录与 TP custom data 为独立提交边界」；报告与单据新增「剩余风险（Owner 确认接受）」条目：**两段提交之间进程崩溃 → 已落库的成交无 TP → 重启不回填（v1 边界），由 stoploss -0.02 与反向退出兜底**；不为此新增数据库或状态机。README:29「随成交同轮落库」为准确表述（同轮＝真实保证），保留原文并追加独立提交边界半句。该剩余风险的「确认接受」以本申请获批为准。

### 回归与不变量（全部本轮实际执行）

G4 全量（63＋新增定向）／G3 44（G4 共享其测试设施）／G1 140／G2 双 venv／冻结 SHA／FT tracked 零改动（ui/src 归另一会话）。G1/G2/G3、LM、FT 核心、DemoAPI、UI 零触碰；止损 -0.02/1×/50 USDT/1 仓/映射与反向平仓/60s TTL/NOT_READY/三次重试/重入/止盈政策全部维持；仅离线测试，不启动真实交易；Git 纳管仍留独立门（本轮不 add/commit/push），不进 G5。

> 批准口径建议：回复「批准」＝批准两项施工与回归验证，并**同时构成对项目二剩余风险（两段独立提交间的崩溃窗口 → 无 TP 仓由 stoploss/反向兜底、重启不回填）的明示接受**；回复「批准第 1 项」＝仅修 fail-closed，表述更正与剩余风险记录照做但不视为风险已接受（维持待裁决）。
>
> **Owner 批复（2026-10-16）：「批准」——两项全批；剩余风险（两段独立提交间的崩溃窗口 → 无 TP 仓由 stoploss -0.02 与反向退出兜底、重启不回填）明示接受。**
>
> **二轮执行与验收记录（同日完成）**：①fail-closed——`_refresh_consumed` 的 c) 反向退出痕迹查询并入主 try/except（strategy.py:192-214）：任一消费查询失败 → `abnormal_position=True` 该轮拒绝开仓；`signal_mapping.py` 仅扩展 `abnormal_position` 注释语义（零行为改动），正常路径映射与重入政策不变，未新增字段/数据库/状态机。定向测试 ×2（`TestG4FailClosedReverseTrace`：反向平仓已完成→查询异常→`abnormal_position=True`＋入场列全 0；恢复后下一轮 `abnormal_position=False`、旧 signal_id 经 :92 正常抑制、whale 微调新 digest 的 BUY 放行）。②表述更正——报告 §A/§C/§G 改「独立提交边界／非零窗口」口径＋新增「剩余风险（Owner 确认接受）」条目＋§H 二轮补节；README:29 追加边界注记；本单据同步。**回归（本轮实际执行）**：G4 **65/65**、G3 44/44、G2 双 venv PASS（py3.13.16＋py3.12.13）、G1 140 IDENTICAL、冻结 SHA OK（8 vendor @0c6d5352）；FT tracked 非 ui 零改动（ui/src 归另一会话）；仅离线测试，未启动真实交易；Git 维持 untracked 未 add/commit/push。报告：**独立成文 `lm_migration/G4-minimal-failclosed-closeout-report.md`**（Owner 要求单独报告，2026-10-16 拆出；裁定建议 **PASS**），终局报告 §H 改为指向该文件。
> **状态：AWAITING OWNER/CODEX — G4 终裁（G4_FINAL_REVIEW，二轮两项已收口）**。G5 与真实交易须新任务书与授权。
---

## 正式关闭记录（2026-10-16）

**Owner 裁决（OWNER_GATE_DISPOSITION）：`G4: APPROVE_FINAL_ACCEPTANCE_AND_CLOSE`。** 关闭声明（验收摘要 §7 草案生效）：G4-Lite（LM 信号→Freqtrade Dry-run＋FreqUI）按四轮授权口径完成实施与验收；冻结边界零漂移；本工作单置 **CLOSED**。关闭后补充（同日，属收尾任务授权范围）：测试可移植性修补（`test_g4_exit_verification.py` FT 路径改 `__file__` 上溯、`test_g4_lite.py` 字面路径去机器化——GIT_REQUIRED: PORTABLE_TEST_PATHS），修补后 G4 全量 **65/65** 复验通过。G5 实现与任何真实交易仍须新任务书与授权；Git 纳管待 OWNER_GIT_ADOPTION 执行批准。
