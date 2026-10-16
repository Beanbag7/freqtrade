# feat: G5 历史数据可回放性审计（LM→Freqtrade 迁移）

> 类型：audit（只读调查；全部产出在 freqtrade 仓 `lm_migration/`；DemoAPI 仓库/数据库不在默认授权内）
> 状态：**PHASE 1 IN PROGRESS — BLOCKED_ON_DEMOAPI_KEY**（Owner 已批 `G5: APPROVE_READONLY_PHASE_1_AFTER_SCOPE_CHECK`，SCOPE: HISTORICAL_COVERAGE_AND_COMPLETE_ROUND_AUDIT_ONLY；范围核验＋本地可做项已完成，HTTP 历史抽样待 Owner 注入 `DEMOAPI_API_KEY`，见 `lm_migration/G5-phase1-coverage-report.md` §3）
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
