---
status: active
created: 2026-10-17
work: ../work/epic-lm-freqtrade-migration.md
---
# LM→Freqtrade 迁移：双链信号一致性验证

起点：Liquidation_Matrix（LM，OKX 实盘原系统，主仓 @0c6d5352 只读）为信号权威；迁移资产 G0–G4 已建成并冻结（worktree `feat/lm-migration-g1-g4`@900a27745，allowlist 60）；验收 A `OFFLINE_PARITY_PASS`（CLOSED）；B1（REPLAY_EVENT_PARITY_PASS）与 P0（OHLCV_READINESS_CONDITIONAL_PASS）经外部复核建议收口、待 Owner 确认。

目标（Owner Goal，2026-10-17 契约修订）：**迁移 LM 策略到 Freqtrade，保证约定条件下的信号一致性**——约定条件＝同一冻结历史输入（DemoAPI V007 已有数据＋对应 OKX 15m K 线）；主验收锚＝**LM 原始实现 ↔ Freqtrade 实际迁移链**的信号级对照。发现的迁移差异定位并修复。交付物：可上线的等价策略＋可审计证据链（不含实盘授权决策，见非目标）。

范围：围绕已有历史数据补齐双链信号验证（复用验收 A 双链工具与 B1/P0 支撑成果，**不重建验证体系**）；迁移差异的定位与修复；OKX 历史输入的工件化固化；G3 日志辅助对账；`lm_migration/` 纳管与 Git 收尾。

非目标：**本 Epic 不含实盘授权决策与长期收益评估**（Owner 后续另立）；不设日期型前置条件（观察期到期仅为运维事件）；不修改 LM 原仓算法；不修改 Freqtrade 核心/UI/G4 冻结交易规则；不做策略调参/Hyperopt/回测优化；不自行实盘交易或启停进程（既有 cron 授权条款内运维除外）；不绕过任何 Owner Gate；不扩大到 FreqUI 或其他仓库。

验收标准（整体）：①双链信号级对照以 fail-closed 验收器给出裁决（含 EMA 权重值层；分层口径，未证层如实标注）；②发现的迁移差异全部定位并修复（或经 Owner 明确接受并记录）；③G3 日志辅助对账完成（辅助证据定位，不阻塞主验收）；④全部交付物纳入版本管理（Git G-1~G-5 收尾）。

## 共享语言与概念边界

- **信号一致性**：同一有效历史输入下，LM 原链与 FT 迁移链的 action/confidence/target_price/magnet_tp/reason 逐字段一致；digest/EMA 事件/EMA 值/信号各层证据独立统计，低层结论不得冒充高层（禁「100%」合并解读）。
- **双链**：参考链＝LM venv 原仓 import（验收 A ref 路径）；目标链＝FT venv 的实际迁移链（g2_adapter→AdapterRuntime/g3_lite 语义）。同一注入输入、同一定义时钟语义。
- **主验收锚 vs 辅助证据**：主锚＝双链对照（LM 原始实现为权威）；辅助＝G3 观察日志对账（第三方实时视角，佐证迁移链在真实环境的行为，不作为主判定依据）。
- **CLOSED**：某验证层经独立复核（ChatGPT）＋Owner 明示确认后的终态；复核建议≠CLOSED。
- **冻结基线**：B1 的 1002 条 G3 评估（`PINNED_BASELINE_N=1002`）及其三源工件＋v2 投影缓存；历史输入数据集以此为主要来源。
- **Owner Gate**：Codex 任务书（C2C）→执行→ChatGPT 独立复核→Owner 确认的外部治理环；各子项照常走此环。cs-review 的独立审查职能在执行环内由 ChatGPT 复核承担；Epic 级 design/contract/final review 用仓库内 fresh reviewer（Owner 可明示豁免）。

## 关键决策

- **DEC-1 · 双链隔离验证架构**：参考侧 LM venv 原仓 import vs 目标侧 FT venv vendor 镜像，socket guard＋冻结时钟（G2 起；验收 A 201/201 的基础）。
- **DEC-2 · 分层证据口径**：L1 DTO／L2 digest／L3 API 特征／L4 EMA 事件／L5 状态／L6 值／L7 信号，各层分子/分母/排除/可信度分列（B1 收口轮定型）。
- **DEC-3 · 证据先行＋fail-closed**：纪元边界只认独立进程证据，行为签名仅佐证且必须重合否则 FAIL；验收器四裁决（PASS/CONDITIONAL/FAIL/ABORT）非零退出＋负向注入证明。
- **DEC-4 · 投影缓存＋全量 digest 变体**：验证数据只存消费字段投影，内容验证锚点在构建时从全量算出并随投影存储；缓存命中不等于绕过验证（4.44GB→62MB，零等价失败）。
- **DEC-5 · 锚点验证法**：系统未记录完整输入时，用已记录的最小真值作事后对账锚点；无真值维度标 UNVERIFIABLE，不得用事后下载冒充（P0：1002/1002 锚点零失配）。
- **DEC-6 · 外部治理环为主审流程**：ChatGPT 规划/独立复核、Codex 任务书、Owner Gate；本 Epic 不替代该环，只补长程契约与状态管理。
- **DEC-7 · 主验收锚定双链（2026-10-17 契约修订）**：主验收＝LM 原始实现↔FT 迁移链在同一冻结历史输入上的信号级对照（含 EMA 权重值直接比对——两链各自产出，无需 G3 增记日志）；G3 日志对账降为辅助证据；不设日期型前置（观察期等待、新观察窗采集等全部移除）；实盘授权与长期收益评估移出本 Epic。理由：G3 日志只是迁移链自身的运行记录，LM 原实现才是信号权威；双链对照消除「等待采集」且证据更强。

## 子项契约

- **ITEM-1**（辅助证据收口）：B1/P0 收口确认（无代码；Owner 确认两份建议 CLOSED 生效；两报告状态注记更新）。依赖：none。
- **ITEM-2**（运维）：G3 观察期到期运维（cron automation-152c77c7 按 2026-10-23 条款处理＋汇总；纯运维事件，**无子项依赖其日期**）。依赖：none。
- **ITEM-3**（数据固化）：OKX 15m 历史输入工件化：571 根/币×3 并集跨度落盘（JSONL＋逐棒字段）＋双读 SHA-256＋与 P0 evidence 哈希交叉一致（公共无凭据 GET，P0 已实证可得）。依赖：none。
- **ITEM-4**（主验收·核心）：双链信号级对照（cs-feat/审计）：以冻结 1002 基线的历史输入（DemoAPI v2 投影缓存五路载荷＋对应 K 线 500 根窗口＋阈值）分别驱动 LM 原链（LM venv runner 注入式，复用验收 A 双链工具）与 FT 迁移链（AdapterRuntime.tick＋observer 幂等语义），对照完整信号字段与 EMA 权重值；fail-closed 分层裁决；G3 记录作辅助交叉证据列。**差异→定位→修复→复跑**（修复仅限迁移侧缺陷，不动 LM 算法与 FT 核心）。依赖：ITEM-3。
- **ITEM-5**（收尾）：final acceptance review（fresh reviewer 或 Owner 豁免）＋差异修复记录＋G3 辅助对账汇总＋Git G-1~G-5 与 `lm_migration/` 纳管收尾。依赖：ITEM-4。

（原 ITEM-3「观察期后 observer 增记/重启」与 ITEM-6「新观察窗 L6 对账」已随 DEC-7 移除：双链对照直接产出两侧权重值，无需 G3 增记与采集等待。）

## 最终交付索引

- ITEM-3：`g5_ohlcv_readiness/klines_frozen.json`（571×3，双读 SHA＋P0 交叉）
- ITEM-4：`G5-DUAL-signal-parity-report.md`（PASS）＋`g5_dual/`（含 compare_result.json；dataset/worker 输出为本地工件）

## 整体验收

全部子项完成＋final acceptance review 通过＋Owner 书面接受；四条验收标准逐条核对并留证据指针。**双链对照未达 PASS 时不收尾**——不可解释差异继续定位修复或经 Owner 明确接受并记录，不得带差异宣称完成。

## 遗留风险

- OKX 公共历史观测期外变动（理论不应发生；复跑差异按归因处理，不静默重取）。
- 1002 冻结基线永久缺 G3 侧 L6 真值（对主验收无影响——双链直接比对；仅影响 G3 辅助对账的值层）。
- DemoAPI V007 历史接口为单点依赖（合同已验证；服务变更将阻塞 ITEM-4 输入侧）。
- LM 主仓 Owner 侧并行开发造成对账面漂移（已发生一次，import 面未受影响；每轮复核）。
- G3 观察进程单点（仅运维影响）。
- 外部治理环（ChatGPT/Codex 复核轮次）可用性与时效不受本仓控制（阻塞 Gate 节奏，不阻塞只读工作）。
