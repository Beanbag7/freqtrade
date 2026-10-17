---
epic: ../epics/lm-freqtrade-migration.md
phase: acceptance
approved_revision: 2b9c9bba9f111bcbeed4d6ae9b0946b5fbef265d071efff962be2466895bdca6
current_item: ITEM-3
next_action: 待 Owner 书面签收 FINAL ACCEPTANCE（`lm_migration/G5-FINAL-ACCEPTANCE.md`，四条标准全过）＋v1 缓存 4.4GB 删批。G-5 已按 Owner 选 A 执行＝私有仓 `Beanbag7/freqtrade-lm-private` 备份 stable＋迁移分支（公共远端零发布）。签收后 epic status→accepted
blocked_by: null
item_progression: per-item
milestone_commit: manual
remote_publish: manual
---
## 子项进度

- [ ] ITEM-1 B1/P0 收口确认（Owner Gate，辅助证据层）
- [x] ITEM-2 G3 观察期运维（**提前终止**，Owner 2026-10-17「不需要一周的持续数据收集」：1774 评估/零订单/零 error 收尾，进程优雅停止，cron 已删；cutover 提前执行并复验全绿——见下）
- [x] ITEM-3 OKX 15m 历史输入工件化（571 根/币×3＋双读 SHA）
- [x] ITEM-4 双链信号级对照（初验 PASS＋政策4回退复验 PASS：**1002/1002 全行全字段位级精确**（含 504 个 dist-gap 行）、决策 1002/1002、aux 989/989；22/22 测试；G2 check OK 证线上契约未破坏）
- [x] ITEM-5 终局（2026-10-17）：`G5-FINAL-ACCEPTANCE.md` 四条验收标准全过（自审豁免下复核＋C2C 块）；G-1 fetch✓／G-2 rebase 零漂移✓（ebef5a7e4）／G-3 G5 交付物 66 文件提交✓（2576d4c29）／G-4 codestable 5 文件提交✓（7c5edf9f6）／G-5 按 Owner 选 A 执行（2026-10-17）＝新建私有仓 `Beanbag7/freqtrade-lm-private` 推送两分支（origin 公共上游与 fork——查证亦 PUBLIC——均排除，零公开）

## 临时决策与证据

- 2026-10-17 建档：Epic 由用户指示「整个目标走 cs 流程」建立；G0–G4 与验收 A/B1/P0 的既有成果作为起点记入永久文档（不重复开子项，只补剩余路径）。
- 就近设计文档：ITEM-3/5 复用 Owner 侧在维护的 `work/feat-freqtrade-g3-lite-signal-observer.md` 与 `work/feat-freqtrade-g5-data-replayability-audit.md`（执行时按需增量，不重写）。
- milestone_commit/remote_publish 先记 manual（与本仓「Git 写操作须 Owner Gate」纪律一致），首次 Gate 由 Owner 最终裁定；item_progression 待 Gate 定（建议 per-item）。
- **Design review（2026-10-17）**：Owner 明示「你自己审核」→ 自审豁免 fresh-reviewer 独立性门槛（限制已声明；外部 ChatGPT 复核环后续轮次仍覆盖本档）。审查冻结版 `4df53d27…`：**blocking 0｜important 4｜minor 2**，全部处理——①ITEM-3 补重启环境基线核对（现证核心 diff=0，stable 前移风险留待重启时重验）；②「验收 B 规格判读更新」自 ITEM-1 移至 ITEM-5 完成后（依赖 B2/L6 结果，不可提前）；③ITEM-6 新观察窗授权/时长显式并入 ITEM-3 重启 Gate；④目标措辞改为「可授权状态＋促成决策」（不预设授权结果）；⑤整体验收补「B2 未 PASS 不授权、归因另立子项」；⑥遗留风险补外部治理环时效。修复后版本 `ead83266…`，待 Owner 拆解确认（目标/边界/验收/子项契约＋三策略裁定）。

- 2026-10-17 首次 Owner Gate 通过：「继续」＝批准拆解（目标/范围/非目标/验收/ITEM-1~7）＋三策略 per-item / manual / manual；status→active，approved_revision=9d07ce4091a1f755…，current_item=ITEM-1（per-item 逐项暂停生效）。

- 2026-10-17 **契约修订（contract change）**：外部治理环 C2C `REVISE_SCOPE_TO_OWNER_GOAL`（Owner 转发＝指令）——主验收锚改为 LM 原始实现↔FT 迁移链双链信号对照（DEC-7）；G3 日志降辅助证据；移除实盘授权/长期收益/日期型前置；旧 ITEM-3（observer 增记/重启）与 ITEM-6（新观察窗 L6）随之移除（双链直接比对权重值）；子项重编为 1-5。修订版 hash `2b9c9bba…95bdca6`（本修订即外部 review 结果的直接落实，后续外部复核轮自然覆盖）。current_item→ITEM-3（ITEM-1 的 B1/P0 确认仍待 Owner 一句话，不阻塞主线）。
- 2026-10-17 ITEM-3 完成：`g5_ohlcv_readiness/klines_frozen.json`（0.1MB）——571 根/币×3 并集跨度，双读 SHA-256 稳定且与 P0 evidence.json 两遍哈希精确一致（隐含第三/四次独立读取一致），跨度校验零问题。零 Git（manual 策略）；本轮 graphify 按默认跳过（仅数据工件＋.codestable 文档变更，无代码 AST 变化）。
- 2026-10-17 ITEM-4 完成（里程碑，manual 策略不 commit）：`g5_dual/` 六文件＋17/17 测试；执行证据与两轮根因定位见 `lm_migration/G5-DUAL-signal-parity-report.md`。首跑 FAIL×2 均归因闭环：①回放时钟工件（bootstrap timestamp 陈旧分支，harness 钉钟修复，非迁移缺陷）；②Owner 已批政策4（A §4）真实数据 footprint 首次量化（504 行入域/481 差异/0 决策影响），比较器政策域层 fail-closed 承接。三方一致：LM 原链=FT 迁移链=G3 记录（决策字段）。
- 晶化候选：跨时间回放带 timestamp 派生陈旧判定的系统，必须把判定时钟钉到被回放事件时刻（待 Owner 授权入 lessons）。
- 2026-10-17 **Owner 裁定政策 4 回退（「严格按照 LM」）并执行**：`g2_adapter/weights.py` 新增 `on_missing` 模式——`"hold"`（规范语义：dist 缺失整个权重块跳过、tracker 保留、恢复与断档前记忆混合，镜像 `market_tick.py:179-183`）／`"reset_base"`（旧 Owner 政策降级为显式模式）。g5_dual tgt 显式 hold、比较器取消豁免域全行严格。复验 PASS：1002/1002 位级全等（23 行亚 ulp 随回退消失）、hold 路径 504 行零差、aux 989/989 不变；测试 22/22。详见报告 §7。
- 2026-10-17 ITEM-5 执行完毕（同日，Owner Gate「继续吧」批复后）：终局验收文档落盘＋G-1~G-4 全部本地执行并核验（stable@7c5edf9f6；feat/lm-migration-g1-g4@2576d4c29＝rebase ebef5a7e4＋G5 交付物 66 文件，数据工件按嵌套 gitignore 排除；rebase 内容零漂移 `diff 900a27745..HEAD -- lm_migration/`=0）。graphify 本轮跳过（仅 .md/.codestable 变更，无代码 AST 变化——沿用 ITEM-3 轮口径）。**待 Owner：签收＋G-5 处置＋4.4GB 缓存删批。**
- 2026-10-17 **Owner Gate「继续吧」**（对上轮汇报所列待决事项的整体批复，按本 Epic 既有「继续＝Gate 通过」口径）：①ITEM-1 CLOSED——B1（REPLAY_EVENT_PARITY_PASS）与 P0（OHLCV_READINESS_CONDITIONAL_PASS）两条正式关闭；②晶化候选（回放钉钟）授权入册 lessons；③ITEM-5 启动——G-1~G-4 执行、**G-5（push/PR）留 Owner 终裁**（remote_publish=manual 常设＋已查明 `origin`＝公共上游 freqtrade/freqtrade，迁移分支含专有策略逻辑，推 origin 即公开；若推仅可考虑 `fork`=Beanbag7 私仓，由 Owner 定）。
- 2026-10-17 **观察窗提前终止＋cutover 执行**（Owner「不需要一周的持续数据收集，我们只需要一段时间内策略信号一致就行」）：G3 收尾统计 1774 评估（READY 1682/DEGRADED 92）＋零订单断言全程成立＋error 事件 0＋仅 3 处 WS 瞬断重连；进程优雅停止、cron automation-152c77c7 删除。随即 `AdapterRuntime` 默认 flip `reset_base→hold`（不再有活进程依赖 legacy）；G2 runner 严格 LM 重导（sim hold／C8·C10 全步等价／负向对照 E10=旧政策、E14=丢 tracker）——**G2 参考文件零改动**（存的是 LM 原始输出）。复验：G2 target 58/58 PASS＋check OK、g5_dual 22/22、compare PASS 1002/1002 位级。详见 G5-DUAL 报告 §8。
