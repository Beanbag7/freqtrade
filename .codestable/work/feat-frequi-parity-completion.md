# feat: freqUI 残余功能全量补齐

## 状态

- 状态:进行中
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

### 终态

- 范围 6 项全部关闭:5 项实现并实证;主题切换经决策不做(规范锁定亮色单主题);钱包历史图终止(无端点,证据:api_trading.py 仅当前 /balance)。
- 运维事实沉淀至 attention.md。
- 用户授权收尾:push origin + 收测试实例。
