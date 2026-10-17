# feat: G5 历史数据可回放性审计（LM→Freqtrade 迁移）

> 类型：audit（只读调查；全部产出在 freqtrade 仓 `lm_migration/`；DemoAPI 仓库/数据库不在默认授权内）
> 状态：**PHASE 3 READINESS PREPARED — AWAITING OWNER §D×4＋PHASE3_GATE**（统计统一 as-of 14:07 UTC：245 唯一轮/20.21h/81 槽（§10 统一口径＋Phase 2 三层边界声明已入覆盖率报告）；Phase 3 准入决策包 `lm_migration/G5-phase3-admission-decision-pack.md`（§D 四项独立推荐＋七步最小验证设计＋有限施工申请）；G3 持续观察健康（63 评估、零订单）。回测实现未授权。）
> 注意：本文件已被 Owner 于 `db18f9067` 自行纳入版本管理（`docs(codestable)` 提交）——后续更新将表现为 stable 分支上的 tracked 修改。
> 授权链：任务书 `lm_migration/G5-data-replayability-audit-request.md`（2026-10-16 Owner 批）← 基线 `lm_migration/G5-demoapi-historical-replay-readiness.md`（2026-10-15 源码审计，DemoAPI@2c05ed0：架构可行/覆盖不足/生产未部署＋四项 Owner 待处置）
> 硬边界：G5_IMPLEMENTATION 与 BACKTEST 未授权；不调参不 Hyperopt；LIVE_TRADING FORBIDDEN；不读不输出密钥。

## 目标

回答：历史数据是否足以在任意指定时间点重生成当时 LM 策略真正可见的输入（当时可见版本，非事后更新）。三段递进：①覆盖率 → ②时间一致性（R1-R7）→ ③重放可行性 GO/NO-GO；覆盖不足即提交 NO-GO 证据收口。

## 已完成（阶段一，2026-10-16）

- 范围核验：本地 DemoAPI 在线（0.5.0）；无 key 401 实证；零仓库/DB/远程访问。
- 端点清单（OpenAPI 实测）：六类 history 端点＋**两个新端点**（`/history/inputs/{sym}`、`/timeline`，高于审计基线接口面）。
- 实时侧真值盘点：自然评估仅 51 条（G3 24＋L2 27，总跨度 <1h；L1 142 条为受控输入）——前向积累是硬需求。

## 待办

1. Owner 注入 DEMOAPI_API_KEY → 六类端点＋timeline 覆盖率实测（深度/完整轮次占比/缺失分布/首末时间）→ 正式阶段一报告；确认不足则提交 NO-GO 证据并停。
2. 阶段二/三未启动（按任务书顺序，阶段一完成后再推进）。
3. 两个新端点仅记响应事实，不下源码结论（仓库未授权）。

## 记录

- 2026-10-16：任务书获批并执行阶段一至密钥阻塞点；部分报告 `G5-phase1-coverage-report.md`（BLOCKED_ON_KEY）。

## 2026-10-16 晚执行记录（Owner「批准」三项并行申请）

①Git 纳管执行完成：commit `900a27745`（详见纳管方案 §10）。②G3 观察恢复：受控验证 7 分钟（12 条新评估全 READY、零订单、SIGINT 停止），持续运行已另提申请。③Phase 2 最小 R1-R7 **七项全 PASS**（短窗口未见未来泄漏；详见覆盖率报告 §9）；同时诚实更正轮数计数伪影（450→241 唯一轮，§8）。**下一步待 Owner：G3 持续观察批准（＋时长）／readiness §D 四项处置／数据跨度积累**；Phase 3 与回测实现未启动。
