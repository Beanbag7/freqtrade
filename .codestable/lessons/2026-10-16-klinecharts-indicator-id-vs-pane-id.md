---
status: observed
scope: ui/ klinecharts 指标与窗格管理
date: 2026-10-16
---
规则:klinecharts v10 `createIndicator()` 返回**指标 id 而非 pane id**;要把后续指标堆叠到同一窗格或按 pane 移除,必须先 `chart.getIndicators().find(i => i.id === id)?.paneId` 解析真实 paneId。
适用 / 不适用:适用于所有自定义/内置指标的多窗格堆叠与清理;只创建单指标且不清理时不适用。停止应用信号:klinecharts 升级后 API 返回值语义变化(以 d.ts 与实测为准)。
证据:`ui/src/components/chart/candle-chart.tsx`(策略指标副图堆叠与内置指标清理两处均依赖此解析);MACD 双线曾因此被拆成两个窗格(截图验收发现);cs-review 又发现内置指标用旧写法导致开关失效,复审确认修复。
候选归宿:project-doc(ui/docs 图表维护说明)或上游 klinecharts skill 文档
