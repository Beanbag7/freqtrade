# feat: freqUI 残余功能全量补齐

## 状态

- 状态:DONE
- 创建:2026-10-17
- 上游单据:.codestable/work/feat-mist-ink-ui.md(主工程已 DONE,本单接管其"边界"中声明的刻意裁剪项)

## 诉求

用户指令:「全部给我处理干净,还是一样都走cs」——将主工程边界中刻意排除的 freqUI 功能项全部实现或给出有证据的终止决策,全程 CodeStable 流程。

## 范围(承接上游边界清单)

1. **多机器人面板**:freqUI 的 multi-bot 能力。决策:实现 /bots 独立面板(机器人注册表 + 对比监控表 + 每机器人错误态含 CORS 指引);**不移植** freqUI 的头部全局机器人切换器——架构不匹配:本 UI 由机器人自身伺服、同源单 token 会话,全局切换需对 client.ts/auth/ws 做逐机器人重构,回归风险大且收益是便利而非能力。对比监控才是 multi-bot 的核心价值。
2. **主题/时区设置**:主题**不做**——雾白墨绿设计规范定义单一亮色主题身份,加暗色即违背上游规格;时区**做**(UTC/本地/常用时区,持久化,统一日期格式化)。
3. **freqAI 模型输入**:先查 api_schemas 是否有 freqai 字段;有则补进表单,无则记录"端点不存在"终止。
4. **PlotConfigurator 临时绘图**:K线页加自定义绘图模式——pair_candles 返回的 DF 列任意指派到主图/副图窗格。
5. **独立余额页/钱包历史图**:余额表做(/balance 端点存在);钱包历史图取决于有无历史端点,无则记录终止。
6. **N7 打磨**:累计盈亏卡 tooltip 热区过小,放大不可见命中圆。

## 边界

- 不改后端任何文件;不引入未安装依赖;设计规范不变(亮色单主题、破坏性操作 AlertDialog、tnum 数字、盈亏双色)。
- 多机器人凭据存 localStorage(freqUI 同款,已知安全模型,文档注明)。
- 8082(webserver)为加 CORS_origins 需重启一次以验证跨源;8081 交易实例不重启。

## 验收标准

- 每项功能浏览器实测通过(双实例:8081 交易态 + 8082 webserver 态,各自能力面)。
- 终止决策项有端点/代码证据。
- 独立 cs-review 无 blocking;修复后 18 页回归零崩溃。
- cs-keep:CORS 要求等运维事实进 attention.md。

## 证据与进度

(随轮次追加)

### 2026-10-17 实现 + 浏览器实证(提交 2435efa2b)

**范围落点侦察**(证据先行):
- `BacktestRequest.freqaimodel` + `freqai.identifier`(api_schemas.py:661-674)、`GET /freqaimodels`(api_webserver.py:67,webserver 限定)→ freqAI 输入**可做**。
- `DownloadDataPayload`(api_schemas.py:536-551)含 `candle_types`/`prepend_data`,旧表单缺 → 已补。
- `GET /balance`(api_trading.py:46)存在 → 余额页可做;**无钱包历史端点** → 历史图终止,记录。
- CORS:webserver.py:283-289 `allow_origins` 取 `api_server.CORS_origins`,默认空 → 多机器人跨源需目标配置,已写入 UI 指引与面板说明。

**浏览器实证**(双实例;8082 为验跨源加 CORS_origins 后重启,新 PID 55478):
- 时区:交易记录 21:30→UTC 13:30(精确 -8h);日志 16:46→00:46 跨日正确(改用 createdMs epoch);还原无损。
- 余额:8081 卡片+USDT 1,001.24 行(机器人徽章);8082 → ErrorAlert 设计内降级。
- 多机器人:添加 8082(toast 拿到 v2026.9)→ 行渲染(已停止+模拟盘,webserver 交易字段全"—"降级);注入不可达机器人 → 行级"连接失败"+CORS 指引且不影响邻行;移除 AlertDialog 流完整。
- PlotConfigurator:ETH/USDT 自定义 tema→主图 + macd→副图,图像分析实证主图 tema 曲线+图例、「自定义」副图窗格 macd 单线;按钮"绘图·自定义"选中态;无崩溃。
- 下载:类型三态切换、"至少留一种"守卫、prepend 开关。
- freqAI:8082 模型列表为空 → 手输框降级 ✓,字段可填。
- N7:30 个 r=8 透明热区圆各带 title。

### 独立 cs-review(2435efa2b)→ 处置(46683443c,全部浏览器复验)

0 blocking / 4 important / 9 nit:
- **I1** `crypto.randomUUID` 非安全上下文缺失 → genId(getRandomValues);复验添加流正常。
- **I2** 时区切换不可靠(getState 非响应式 + structural sharing 吞重渲)→ AppShell `key={timezone}` 整树重挂;交易记录静态页实测 21:30→13:30。
- **I3** btoa 非 ASCII 误报 CORS → 登录前 ASCII 校验+正确提示;中文密码实测 toast 正确、弹窗保持。
- **I4** webserver `state:""` → 徽章「未知」(muted) 不再红色「已停止」;实测徽章 [未知, 模拟盘]。
- nit 处置:formatter 按 tz 缓存、login in-flight 去重、updateBot 作废旧 token、removeQueries、apiUrl 剥 userinfo、行色添加即固定、custom 模式隐藏策略开关(实测)、失效列提示、erase+prepend 双开才提示(实测单开不提示/双开提示)。
- 记录不做:Popover+Tooltip 滞留观感(Radix 标准组合)。

### 修复后回归

11 路由 × 2 实例 = 22 页零崩溃零空白;`npm run build` 全绿。

### 整体级全量审查(origin/develop...stable 78 文件 +12,641 行)→ 处置(92f79e150,浏览器复验)

0 blocking / 6 important / ~20 nit,Important 全处置:
- **I1** `/health` 时间戳是**秒**,系统状态卡按毫秒渲染 → 1970 年;调用点 ×1000。实测「2026-10-14 10:44 · 2 天前」。
- **I2** 回测详情「回测时段」读顶层不存在字段恒 `— ~ —`;改读 `metadata[strategy]`(秒)。实测渲染 `2026-10-10 ~ 2026-10-16`。
- **I3** K 线同 key 增量只推末根会丢中间蜡烛;改为整段差量投喂 + 跳变重置兜底。
- **I4** 「自动刷新」被 WS new_candle 绕过;开关入全局设置 `chartAutoRefresh`,轮询/WS 双门控。实测关态 45s 零请求、开态 4 次、持久化正确。
- **I5** 令牌刷新两套实现收敛:ws.ts 复用 client.ts `refreshOnce` 单飞锁。
- **I6** Docker 链路装旧 freqUI 的发布缺口写入 ui/README(刻意暂留边界)。
- nit 选取处置:liquidation_warning 补 toast、sonner 锁定 light(卸 next-themes)、死 hook×4/死类型×8/死映射 profit_all、cssVar 单源、黑名单 aria-label、StateBadge 加载态不渲染、force-enter 文案条件化、locks 时区提示、登录 ASCII 精确报错(实测)、force enter/exit 失效键补全、any 豁免收窄行级。
- 记录不做:指标 effect 依赖 bars.length 的重建开销(正确但浪费,优化需重写 diff 逻辑,风险大于收益);三处交易对搜索/两处策略下拉的组件级去重(行为等价重构,留作 cs-refactor 后续)。
- 回归:22 页双实例零崩溃;8082 /balance 「Bot is not in the correct state」属设计内降级;`.uiversion` 缺失为已知小缺口。
- 验证过程教训沉淀 attention.md(秒/毫秒口径、invalidate 不看 interval、`role="switch"` 选择器陷阱)。

### 二轮独立审查(敌意审修复提交 + 行为状态机 + 契约全量 64 调用点)→ 处置(1be0257c4,浏览器复验)

三路并行互不重叠审查,总账:契约 0B/0I/4N(64 调用点全部一致);敌意审 5/7 项干净、2 尾巴;行为审查 0B/6I/8N。

- **Blocking(自查复现)**:zustand persist 的 `merge` 在 `create()` 时同步执行,调用文件后部 `const normalizeUrl` 踩 TDZ → hydration 抛 ReferenceError 被 persist 静默吞掉 → 机器人注册表**刷新即空**(写入路径不经过 merge 所以添加时正常,auth/settings 无 merge 所以正常———— 单点特征强)。修复:normalizeUrl 真正上移至 store 前 + onRehydrateStorage 错误日志。实测:添加→刷新→恢复;种子化复现修复前必现。
- **重要修复**:①跨标签页 store 互覆写 → cross-tab.ts storage 事件 rehydrate(实测 p1 增删 bot p2 秒级跟随、设置同步);②存量凭据清洗写回(种入 userinfo 记录→刷新→storage+渲染双清);③强平数量 0/负数曾静默全平 → 校验拒绝(实测持仓保留);④限价开仓价格 0 静默丢弃 → 拒绝 + 弹窗补价格行(三种输入实测);⑤回测复盘 pair 残留 → `key={file}` 重挂载(实测 A 切对后 B 重置);⑥refetchOnReconnect 第三条缝同受门控;⑦WS 1008 在 uvicorn 握手前 close 变 1006 → 1006/1008 一并单飞刷新;⑧timerange 非法日期/倒序曾后台任务内失败(提交先 200 假成功)→ lib/validation.ts 前置校验,下载页+回测表单接入(实测三类输入);⑨client.ts 补 502 `{error}` 体与 200 非 JSON;⑩PairHistory.annotations 按后端联合类型修正 + 秒/毫秒单位注释;⑪构建写 installed/.uiversion(`mist-ink-` 前缀)关闭 /ui_version 缺口(两实例实测)。
- **nit 处置**:formatDuration/formatPct Infinity 守卫、whitelist/blacklist 形状防御、复盘标记取整、交易搜索空态改「本页」口径。
- 记录不做:cmdk Enter 阻断隐式提交(库固有)、白名单重排隐式换对(UX 决策)、locks DST 双时区(已注记固有语义)。
- 回归:22 页双实例零崩溃。新沉淀事实:`/trades` 只含已平仓(is_open=False),持仓在 /status;persist merge 静默吞错教训;`/ui_version` 挂根路径。

### 修复后复审(敌意审 1be0257c4)→ 处置(未提交时即修,浏览器复验)

0 Blocking / 3 Important / 若干 Nit,全部处置:
- **I1** validation.ts 格式集与后端错配(双向):误杀 `yyyymmddThhmm(ss)` 与 epoch(此前表单无校验,属新引入回归);且错误放行空格+冒号形式。重写为与 `_TIMERANGE_FORMATS` 逐条对齐(含混用、单侧空、`start > stop > 0` 边角语义)。实测差分:带交易对后 T/epoch/纯日期可提交,空格冒号/0.5 天禁用;回测表单 T 格式端到端「回测已开始」。
- **I2** 强平缺上界:数量超持仓时后端整仓平掉(同类"静默改写意图")→ 拒绝并明示,输入框补 max。实测 2× 持仓被拦、持仓未动。
- **I3** `key={file}` 身份不完整(一个结果文件可含多策略)→ 改 `file:strategy` 复合身份 + ResultBody 透传。可区分实验:B 复查=自己的初值,非 A 残留值。
- Nit 处置:存量清洗回写改 `onRehydrateStorage`+queueMicrotask(覆盖 storage 事件路径且规避 TDZ);merge 垃圾条目兜底(单条脏数据不再整窝清空,实测);cross-tab 补 `clear()`(key=null)分支;tryRefresh 仅 401/403 注销(5xx 误注销)且按会话丢弃在途响应;投入金额守卫与价格/杠杆一致(实测 0 被拦);vite closeBundle mkdirSync;白/黑名单页与下载页 `?./?? []` 补防御;attention 错字。
- 回归:新构建 8081×10 + 8082×8 页扫描零崩溃;脏记录清洗/干净记录恢复在新构建复验通过。

### 终态

- 范围 6 项全部关闭:5 项实现并实证;主题切换经决策不做(规范锁定亮色单主题);钱包历史图终止(无端点,证据:api_trading.py 仅当前 /balance)。
- 二轮独立审查(2026-10-17)发现并修复 1 Blocking + 10 Important + 4 nit;修复批次又经一轮敌意复审,处置 3 Important + 若干 Nit,全部浏览器实证。
- 运维事实沉淀至 attention.md。
- 用户授权收尾:push fork + 收测试实例(均已执行)。
