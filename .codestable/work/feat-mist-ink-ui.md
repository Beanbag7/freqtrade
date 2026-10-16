# feat: 雾白墨绿 UI — 重构 freqtrade 内建 Web 界面

> 类型：feat（本仓 `ui/` 新应用，替换内建 freqUI 3.1.3）
> 状态：**DONE — 已合并 stable @969cc8446**（2026-10-16；cs-review 两轮：0 blocking，3 important 全修复并经复审确认；干净 worktree `npm ci && npm run build` 实证可构建）

## 目标

按《雾白墨绿 v1.1》设计规范(`/Users/modaoshi/Downloads/ui-design-system-agent-spec.md`)彻底替换 freqtrade 内建 Web UI:React + TypeScript + shadcn/ui(Radix)+ Tailwind v4,Vite 构建直出 `freqtrade/rpc/api_server/ui/installed/`,机器人直接服务新界面,覆盖并对齐旧 freqUI 全部核心能力。

## 现场(已核实)

- 旧 freqUI(Vue)产物已从 `installed/` 完全清除(`emptyOutDir` 覆盖),`fallback_file.html` 已重写为新风格 + 新构建指引。
- 8 页全部以真实 dry-run 机器人(127.0.0.1:8081)浏览器验收:登录/概览/交易/K线/交易对/控制/回测/日志;移动端 390px 无横向滚动。
- 已提交:`ee358412b`(主体,+12228)、`b9857af07`(plot_config 策略指标 + 部分平仓 + fallback 页)、`abd6e5a66`(清理 .gitkeep)。
- API 契约源头:`freqtrade/rpc/api_server/api_schemas.py`;登录为 HTTP Basic(`api_auth.py:124`);WS 为 `/api/v1/message/ws?token=<JWT>`,JWT 15 分钟过期需重连换新 token;消息类型枚举 `freqtrade/enums/rpcmessagetype.py`。
- 回测历史/结果接口在 trade 模式返回 "Bot is not in the correct state",须 `freqtrade webserver` 模式验证(计划 8082 端口起第二实例)。

## 边界

- 不做多机器人面板:独立部署版 freqUI 的特性,单机器人内嵌 UI 天然不适用。
- 轮询保留(5s/15s/60s 分级),WS 作为交易/白名单/新K线事件的即时失效通道叠加,不替代轮询。
- 策略指定颜色在雾白底上不可见(白/黄/青等)时回退主题调色板。
- 数据下载为交易所公网数据的恢复性写操作,erase 默认关;不回溯修改 freqtrade 后端任何代码。
- 不做主题/时区设置页:雾白墨绿规范固定亮色主题;时间统一本地时区渲染。
- 不做 freqAI 模型输入与 PlotConfigurator(ad-hoc 任意列绘图):plot_config 已覆盖主用例。

## freqUI 对齐补齐(2026-10-16 第三轮,ee921ffb9)

以 frequi 仓库 main 分支逐视图/组件核对后补齐:

- 回测详情新增「分析」页签:分时段盈亏(日/周/月)+ 进场标签/退出原因/混合标签表
  (数据本就在 backtest_result.strategy.* 里:periodic_breakdown / results_per_enter_tag /
  exit_reason_summary / mix_tag_stats,纯展示)。
- K 线页新增 Heikin Ashi 开关(freqUI CandleChart `heikinAshi` 同名功能,客户端变换,
  时间戳不动,交易标记仍按真实价格对齐——freqUI 行为相同)。
- 交易对页新增「配置器」页签(pairlist_config.vue 等价):/pairlists/available 取处理器
  参数 schema → 组装链(排序/删改/参数表单)→ POST /pairlists/evaluate →
  轮询 /pairlists/evaluate/{jobid} 展示白名单结果。仅 webserver 模式。
- 仪表盘新增累计收益曲线卡(/daily 30 天累计,纯 SVG,CumProfitChart 等价)。
- 新增 /analysis 策略分析页:前瞻偏差 + 递归分析两页签
  (/lookahead_analysis、/recursive_analysis,后台任务轮询专用结果端点)。
  注:/background 列表不含 result,专用端点才返回;递归结果若含 NaN 需浏览器实测确认解析。

## 端到端点击验证(2026-10-16 第四轮,611867043)

双实例全页面点击巡查 + 真实操作链路,捕获并修复 6 处缺陷:

1. `/daily` 倒序返回 → useTimeunitProfit 统一升序(累计收益曲线与近7日柱图原方向相反)。
2. HA 开关只刷新末根 → CandleChart 新增 `dataEpoch` prop,原地变换触发全量 resetData。
3. WS 交易事件为**扁平载荷**(字段在顶层,非 data 包裹)→ toast 交易对显示 `?`;
   修复后实测 "做多开仓 ETH/USDT 价格 2,475.52"、"平仓 ETH/USDT 成交价 … · 收益 -0.29%"。
4. 回测失败静默 → 运行卡结束后显示可关闭错误横幅(status_msg 为身份,新报错会再弹)。
5. 下载页交易对 `slice(0,200)` 截断 → OKX 300+ USDT 对中 SOL/USDT 永远搜不到;去掉截断。
6. 进行中交易无详情入口(详情面板只能从已平仓列表开)→ 概览持仓卡行可点击开面板,
   取消挂单/分批平仓/强平/删除/重载由此可达。

通过项:锁定增删(AlertDialog+计数回零)、强制开仓(市价即成;限价未成交超时由后端自动取消)、
分批强平 0.01 精确减半(realized_profit 落账)、回测分析页签与 API 逐字段一致、
配置器 StaticPairList 评估出 BTC/ETH/SOL、前瞻偏差分析跑完出结果卡、递归分析提交+轮询、
下载任务 success+feather 落盘、401 双路径(无 token loader 拦截 / 假 token refresh 失败)跳 /login。
datetime-local 自动化键入需 ArrowRight 分段(Chrome 年字段收 6 位),属测试技巧非缺陷。
8081 残留一笔 dry-run 限价卖单等待成交,无害。

## 证据

- `ui/` 源码 26 个 shadcn 组件 + 完整类型化数据层(`src/lib/api/`);`tsc -b` 全绿;`npm run build` 通过(按页分包)。
- K线页截图验收:策略 plot_config(tema/sar 主图,MACD 双线同窗格,RSI 副图)正确渲染;klinecharts `createIndicator` 返回指标 id 而非 pane id(已修,堆叠前须经 `getIndicators()` 解析 paneId)。
- 交易详情:强平弹窗支持可选数量(留空=全部),AlertDialog 二次确认符合规范。
- 日志协议实测为五元组 `[formattedTime, createdMs, module, level, message]`。

## 验收

1. WS:连接建立(101),forceenter 后概览/持仓在 5s 轮询到达前即时刷新;token 过期自动重连。✅(订阅全量类型后,exit_fill 广播 → 页面零手动刷新即时清空持仓,`__ftWs` 计数递增)
2. 数据下载页:白名单/自选交易对 + 时间粒度 + days/timerange 互斥校验;启动后台任务后轮询 `/background` 展示进度至完成;失败有 ErrorAlert。✅(8081 验证表单+错误路径;8082 webserver 验证任务卡 success 态 + feather 落盘)
3. 回测可视化:webserver 模式(8082)跑一次真实回测 → 结果详情内选交易对 → K线 + 开平仓标记正确渲染。✅(3 交易结果,BTC/ETH 切换,盈绿亏红+百分比标签,focus 滚动到首笔交易;顺带修复 `filename`+`strategy` 双参数缺失导致的 422 与 total_trades 字段名)
4. 全部完成后合并 `feat/mist-ink-ui` → `stable`,cs-review 无 blocking。✅(merge 969cc8446;复审额外捕获 .gitignore `lib/` 规则吞掉 `ui/src/lib/` 的重大隐患并修复)

## 毕业清单(2026-10-16)

- UI 运维/API 契约事实 → `.codestable/attention.md`(内建 Web UI 一节)
- klinecharts 指标 id ≠ pane id → `.codestable/lessons/2026-10-16-klinecharts-indicator-id-vs-pane-id.md`
- freqtrade WS 显式订阅语义 → `.codestable/lessons/2026-10-16-freqtrade-ws-explicit-subscribe.md`
- Python gitignore 吞前端目录 → `.codestable/lessons/2026-10-16-python-gitignore-eats-frontend-lib.md`
- 本单据按仓内惯例(G3-lite 同例)留档备查,不删除。

## 状态与未决

- [x] WS 实时推送(`src/lib/api/ws.ts` + AppShell 挂载)
- [x] 数据下载页(`/download` 路由 + 导航)
- [x] 回测结果 K 线复盘(复用 CandleChart + `/pair_history` POST)
- [x] webserver 模式验证实例(8082)
- [x] cs-review(两轮)→ 合并 stable → cs-keep 沉淀
- 未决(有意不做,见"边界"):多机器人面板;analyzed_df 订阅推送全量 DF(数据量大,轮询已够)

## 收尾轮:全量端到端补验 + 独立审查补审(2026-10-16 晚)

### 补验 9 项(ego-browser,8081/8082 双实例)

全部 PASS:递归分析结果矩阵表(指标×启动K线数,缺失值"—");黑名单空格批量添加+AlertDialog 逐条移除;交易详情「从交易所重载」「删除交易」(顺带清理 #6 残留灰尘仓,挂单成交后「取消未成交单」正确禁用);机器人暂停/停止/启动三态往返(API state 与徽章一致);登录失败提示与退出登录;下载页起止日期模式/开关/白名单 0 禁用防呆/timerange 提交落盘(SOL_USDT-1h.feather);配置器参数覆盖(number_assets=5 → 精确 5 对)与失败路径(纯过滤器链报错如实展示);移动端 390px 汉堡导航(CDP 模拟);WS 静默刷新(坏 access+好 refresh → 自动换 token、WS 重连 OPEN、未跳登录)。

### 独立 cs-review 补审(969cc8446..611867043)

2 blocking / 3 important / 8 nit,全部处置于 b86d715c5:

- **B1** `GET /pairlists/evaluate/{jobid}` 运行期间返回 400 → hook 映射为挂起态;此前运行中常显红色失败横幅且按钮不禁用。浏览器高频采样复验:运行期按钮"评估中…"禁用、零错误横幅、完成恢复。
- **B2** 递归分析 timerange 后端强制要求但 UI 标可选,失败静默 → 改必填+原生校验,两页签渲染 `status=error` 的 `status_msg`。实测无数据区间提交 → "分析失败 / Analysis failed with No data found. Terminating."。
- **I1** mix_tag_stats key 二元组 → 数组 join(" / ");**I2** NaN 致后端 500 补可读提示;**I3** 升序约定注释固化。
- nit:N1(400 双倍请求)随 B1 消除;N2 list 参数只读防类型错;N3 参数 DOM id 加步骤前缀;N4 extractStrategyDetail 首策略裁剪注释;N5 `|| 10` 吞 0 修复;N6 首轮轮询间隙计入运行态;N7/N8 记录不做(tooltip 打磨/可逆本地操作无需 AlertDialog)。

### 审查后回归

前瞻分析默认路径(2 天区间,0 信号未发现偏差)、配置器 StaticPairList(3 对)均复验 PASS;`npm run build` 通过。

### 边界确认(审查后仍成立)

I2 的后端 NaN 500 不可修(边界:不改后端),UI 侧已给可读提示;freqUI 策略切换器属有意裁剪(N4 注释固化)。

## 查漏轮(2026-10-17)

### 新增验证(全部 PASS)

- **8081 交易态降级四面**:回测(toast+历史 ErrorAlert)、下载(toast+ErrorAlert)、配置器(「交易对配置器仅在网页服务器模式下可用」+503)、分析页(手输框降级+「仅在网页服务器模式下可用」+提交 toast);/strategies、/pairlists/available、/download_data 在交易态均 503,UI 全部干净降级。
- **日志页交互**:级别过滤(ERROR→0/300)、搜索(heartbeat→102/300 全命中)、5s 自动刷新声明;8082 一致。
- **K线页控件**:交易对选择、timeframe 1m-1d 切换、指标设置 popover(MA/VOL 默认开,BOLL 勾选态翻转正确)、自动刷新开关。
- **资产新鲜度**:installed/index.html 引用即最新构建 hash;同目录旧 hash 为 gitignored 孤儿文件,不影响服务。

### 复审轮(对 b86d715c5 的独立复审)

0 blocking / 2 important(既有问题,同路径顺手加固)/ 5 nit,处置于 1e81811fc:

- **I-1** pairlist 评估 POST→后台置位竞态:窗口内 GET 返回 success+空 result,`result.method.join` 会崩整树(无 ErrorBoundary)→ queryFn 归一化为 pending;浏览器 3 轮快速连发复验无崩溃。
- **I-2** 硬错误后轮询永不停止(NaN-500 场景每 2s 双请求无限打)→ 三个轮询 hook 统一 `q.state.status==="error"` 停止。
- N-a 400 捕获加 detail 双判;N-c 合并双 JSDoc;N-b(错误期 isFetching 抖动)随 I-2 消解;N-d/N-e 记录不做(真实标签下不可能撞 key;type=number 输入天然拦截非数字)。

### 修复后全量回归

9 路由 × 2 实例 = 18 页面零崩溃零空白;`npm run build` 通过。
