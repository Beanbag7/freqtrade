# feat: G3-Lite 实时信号观察接线（LM→Freqtrade 迁移）

> 类型：feat（实施与验收单据均在本仓 freqtrade；LM 主仓只读参考）
> 状态：**AWAITING OWNER GATE — G3-Lite 最终验收**（阶段二 2026-10-16 完成：多源幂等修复＋44/44 离线＋真实只读运行 24 评估含 1 BUY＋零订单零成交零持仓＋全量回归保持；裁定建议 PASS，详见 `lm_migration/G3-lite-stage2-final-report.md`；G4 须另批）
> 前序：G1 PASS（140/140）→ G2 PASS（42/42＋15/15，见 `lm_migration/G2-acceptance-fix-and-final.md`）→ 阶段一 31/31（`lm_migration/G3-lite-implementation-report.md`）
> 本单据为本仓 `.codestable/` 初始化（2026-10-16，cs-onboard）后的首个 work 档

## 目标

让 Freqtrade 通过真实 `IStrategy` 生命周期获取 OKX 公共 15m 行情与 DemoAPI live 输入，复用 G2 Adapter（`lm_migration/g2_adapter/`）与 G1 冻结 `evaluate_signal()`，对 BTC/ETH/SOL 永续持续输出可观察、可验证的 BUY/SELL/HOLD 信号——**只读观察，零订单**。详细技术方案与施工前检查证据（单一来源，本文不复述）：`lm_migration/G3-lite-implementation-gate.md`。

## 现场（已核实，2026-10-16）

- 本仓 `1f394eae`（FT 2026.9）；策略生命周期源码已核：`process()` = `dataprovider.refresh()` → `bot_loop_start()` → `analyze()`；`process_only_new_candles=True` 同 K 线跳过 populate；策略永不收到未完成 K 线。
- LM 主仓 HEAD `0c6d5352`（95 项既有 Maker 漂移，未触碰）；G1/G2 冻结 SHA check 全过。
- DemoAPI HEAD `70bbed6`（＝交接基线）；G2 消费 DTO 字段逐项核对通过。
- `lm_migration/` 整目录 untracked（G1/G2 交付物未入 Git 版本控制）；`.codestable/` 今日初始化，`git check-ignore` 确认不被忽略。

## 边界

- **授权边界**：本单据即施工审批请求；批准前不写任何代码。批准范围＝阶段一（完全离线 G3-A~E 测试矩阵＋实施 `lm_migration/g3_lite/` 六文件）。阶段二（真实 OKX 公共行情＋DemoAPI live 只读烟雾）**单独再批**，前置＝DemoAPI 8080/15432 `0.0.0.0` 暴露的修复或网络限制证据。
- **硬安全边界**：任何订单/虚拟订单/Entry-Exit 列置位/真实账户 Key/有未结仓位的交易数据库一律禁止；fail-closed（非明确观察配置拒绝启动）；EMA 失效政策＝G2 终版（失效立即固定 WEIGHTS＋清状态、恢复重播种）。
- **不改**：LM 生产策略/Freqtrade 核心/DemoAPI/Maker/Risk/Executor/WAL；不重引入 ML 模型；不做 G5 回测。
- **取舍（需 owner 选择）**：①方案 A（bot_loop_start 挂点＋幂等键 `(pair, candle_time, snapshot_id)`）为推荐——技术依据见 gate 文档 §二；②G2 终验裁决方式；③lm_migration 与 .codestable Git 纳管方式；④阶段二预批与否。

## 证据（G3 验收矩阵承诺，阶段一全离线）

- G3-A 策略加载（IStrategy 实际加载＋SHA＋零模型依赖）；G3-B 实时输入（冻结响应：正常/超时/部分失败/stale/杠杆分布失效恢复/非法 HTTP/历史不足→NOT_READY）；G3-C 时序（同 K 线多次评估幂等、K 线/DemoAPI 单侧更新、多币交错、EMA 不重复更新、状态不跨币、重启初始化）；G3-D 信号等价（同时点输入下进入 `evaluate_signal()` 的字段全集＋七字段对照，G2 主动差异保留）；G3-E 零订单（BUY/SELL/连续/交替/多币并发构造下列恒零＋误配置拒启实测）。
- 回归保持：G1 140 案＋G2 42 案/15 负向。
- 交付：四部分报告（实施/测试证据/观察证据[阶段二]/结论），从零复现命令。

## 验收

- **PASS**：IStrategy 真实接线完成、G3-A~E 全绿、G1/G2 回归保持、零订单安全成立；阶段二获批后补实时观察证据（信号样例/来源快照时间/刷新节奏/降级样例/零订单零持仓证明）。
- **CONDITIONAL**：离线接线通过但阶段二未批/未做；**REWORK**：输入状态错误、重复 EMA 更新、信号计算错误或意外交易风险。

## 阶段二执行申请·修订（2026-10-16，G3_LITE_STAGE2_EXECUTION_REQUEST）

> 本节为当前唯一有效申请（替代 2026-10-16 早先 G3_LITE_STAGE2_REQUEST 版）。事实变化：端口已修复并复核、跨设备测试 Owner 已取消、DemoAPI 部署修复已提交推送。任务书 §二 判定：阶段二**仍未获授权**（C2C `REQUIRED: OWNER_STAGE2_APPROVAL_AND_RESIDUAL_RISK_ACCEPTANCE`）→ 按任务书提交本最小审批请求，停在 Owner Gate。

**§二 五项核验（2026-10-16 复核）**：①阶段一 31/31 全绿＋change review APPROVE_WITH_IMPORTANT，Owner 正式裁决仍未下发（PASS_RECOMMENDED）；②阶段二授权仍无；③Git 纳管方式未定——freqtrade 侧 `lm_migration/`＋`.codestable/` 仍 untracked（另见既有 untracked：`.gemini/`、`GEMINI.md`、`graphify-out/`、`lm-audit/`，非本迁移产物）；④G1/G2 冻结 SHA：`runner.py check` → `g1_strategy_sha_ok=true, vendor_files=8, verdict OK`（LM HEAD `0c6d5352` 不变）；⑤LM 95 项既有 Maker 漂移（executor/exchange/defense +1165 行）原样未动。

**§三 DemoAPI 安全前置复核（只读，未修改/重启/动库）**：①docker 实测 `demoapi-api-1 127.0.0.1:8080->8000`、`demoapi-timescaledb-1 127.0.0.1:15432->5432`，宿主 lsof 仅 127.0.0.1 LISTEN，redis 未发布宿主端口；②`http://127.0.0.1:8080/health` HTTP 200（liqmap fresh/usable、anchor 06:30Z、snapshot_id 有值）；③crawler 06:31:08Z 完整轮 committed（dataset_count=12），255s 后下一轮——自然采集正常；④Owner 接受跨设备未实测缺口＝**未决**（见请求④，不重新设为必需步骤）；⑤部署配置 Git 纳管已闭环：修复提交 `ead06f3`（70bbed6 之子），工作树干净且与 origin/master 同步。详证：`DemoAPI/docs/reports/local-docker-port-security.md`（裁定 CONDITIONAL——不宣称网络安全全面 PASS）。

**§四.1 幂等修正方案（与任务书 §四 一致，获批后实施）**：幂等身份 `(pair, candle_time, inputs_digest)`——digest 反映五源有效输入身份（liqmap 版本与可用性/whale 内容/动态阈值/杠杆分布/其他实影响信号的 DemoAPI 来源＋present|stale|tombstone 状态转换与恢复），稳定确定性序列化＋哈希，不含本地获取时刻。行为分离——`AdapterRuntime.tick` 新增 `weights_frozen`：非权重源变化且 dist 子指纹未变→冻结权重重算信号（不动 EMA tracker）；dist 内容变化（含失效立即固定 WEIGHTS＋清状态、恢复重播种）→EMA 更新。不改 G1/G2 数学口径。定向测试＝任务书 §四 十类场景（G3-S1~S5 扩展）。

**§四.2 请求预算**：现状 1s/端点＋4s/币，三币串行最坏 12s。获批后先行有界延迟注入测试（单币/三币累计/超时恢复/缓存命中/失败重试/输入到评估延迟），运行时记录 p50/p95；仅在实测超预算时做最小必要修复（共享全局预算或消同周期重复拉取），不新增 Redis/EventBus/AsyncIO 架构。

**获批后运行计划**：①实施 §四.1 修正＋定向测试；②延迟注入与预算实测；③`freqtrade trade --config lm_migration/g3_lite/config_lm_observer.json`（dry_run=true、Entry/Exit 恒零、API Server/Telegram 关闭、独立模拟库、DEMOAPI_API_KEY 受控环境注入、明确结束条件）受控只读观察；④采集 §七 12 项证据（含零订单/零成交/零持仓证明）；⑤§八 全量回归（G1 140＋G2 42/15＋阶段一 31＋新增幂等与预算用例＋冻结 SHA）。若 FT 启动被强制要求实盘凭据→停止并报告，不加凭据。

**请求裁决（最小五项）**：1) 阶段一正式验收裁决（31/31＋APPROVE_WITH_IMPORTANT→PASS）；2) 阶段二执行授权——含 §四.1 多源幂等修复与定向测试；3) 本机 OKX 公共行情＋DemoAPI localhost 只读运行许可；4) 接受「端口已修复为 localhost 但跨设备访问未实测」的剩余证据缺口（跨设备测试 Owner 已取消，不设为必需）；5) Freqtrade 试验代码（`lm_migration/`＋`.codestable/`）Git 纳管方式。

**阶段二批复记录（2026-10-16，Owner「批准」）**：对上述五项申请，Owner 以「批准」批复。按申请口径解读：①阶段一正式验收 **PASS**；②阶段二执行授权**获批**（含多源幂等修复 `inputs_digest`＋`weights_frozen` 与十类定向测试）；③本机 OKX 公共行情＋DemoAPI localhost 只读运行许可**获批**（dry_run=true、零订单、独立模拟库、明确结束条件）；④Owner **接受**「端口已收窄 localhost、跨设备访问未实测」剩余证据缺口（跨设备测试不恢复为必需）；⑤Git 纳管方式未随批复明示→**维持 untracked，不自行提交**，待 Owner 明示方式（沿用阶段一批复解读③先例）。边界不变：不改 LM 主链/FT 核心/DemoAPI；禁真实与虚拟订单；若 FT 启动强制实盘凭据→停止并报告。

---

## 阶段二执行与最终验收（2026-10-16，已完成）

**实施**：多源幂等修复按计划落地——`inputs_digest`（五源 present/absent＋完整内容＋funding/OI，排除本地时刻）、`dist_fingerprint`＋`weights_frozen`（重评与 EMA 更新分离）、JSONL 五新字段、每 loop 三币耗时日志；config 两处 FT 2026.9 schema 启动兼容最小修正（pricing/stoploss/api_server 字段，无策略语义）。改动全部限于 `lm_migration/`。

**离线**：G3 套件 **44/44**（阶段一 32＋G3-S 7＋G3-T 5，覆盖任务书 §四十场景＋§五预算/延迟注入）；G2 双 venv PASS（42/42＋15/15）；G1 140 IDENTICAL；冻结 SHA OK。

**真实只读运行**（Owner 授权＋安全前置满足后）：15:15:51→15:33:33（SIGINT 正常停止，约 17.7 分钟），2 根已确认 K 线（07:00/07:15 UTC）×3 币，4 个 DemoAPI 采集轮。**24 条评估**（0 错误）：BTC/ETH HOLD ×8、SOL HOLD ×5＋**BUY ×3**（confidence=100、magnet_tp=106.70、frozen 重评中触发）；READY 全覆盖；幂等/冻结序列与离线合同逐条一致；loop p50=212ms/p95=265ms ≪ 预算；`observer.sqlite` trades=0/orders=0，日志零订单路径，key 零落盘。

**裁定建议：PASS**（证据与剩余风险全清单见 `lm_migration/G3-lite-stage2-final-report.md` §D）。剩余风险声明：单窗口/未自然发生端点失败（离线覆盖）/EMA 步进＝分布变化频率归档/funding-OI 未接线归档/跨设备未实测（Owner 已接受）。

**本单据停在 G3-Lite 最终验收门**：G4-Lite（Dry-run 虚拟开平仓/信号映射/交易库/FreqUI）须新任务书与授权，不自动启动。

---
存档：2026-10-16 早先 G3_LITE_STAGE2_REQUEST 版申请（端口阻塞期）要点——幂等缺陷七情形对照、端口 `0.0.0.0` 暴露证据、四裁决请求；已被本节替代，原文见 git 外历史或 `lm_migration/G3-lite-stage2-gate-report.md`。


