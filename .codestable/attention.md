# freqtrade 项目 attention

每次会话必读的项目事实与硬约束（cs-onboard 2026-10-16 初始化，从空开始）。

## 内建 Web UI(雾白墨绿,2026-10-16 并入 stable @969cc8446)

- 源码在 `ui/`(React 19 + TS + shadcn/Radix + Tailwind v4 + klinecharts v10);构建 `cd ui && npm run build` 直出 `freqtrade/rpc/api_server/ui/installed/`,机器人直接服务,无需 `install-ui`。
- 设计规范唯一来源:`/Users/modaoshi/Downloads/ui-design-system-agent-spec.md`(雾白墨绿 v1.1);实施简报 `ui/docs/ui-brief.md`。
- API 契约以 `freqtrade/rpc/api_server/api_schemas.py` + 各 `api_*.py` 路由为准,不靠旧 freqUI 行为猜测。已知坑:登录是 HTTP Basic(`/token/login`);`/logs` 是五元组 `[formattedTime, createdMs, module, level, message]`;`/backtest/history/result` 需 `filename`+`strategy` 双参数;`DELETE /blacklist` 读重复 query 参数 `pairs_to_delete` 不读 body;中止回测是 `GET /backtest/abort`(DELETE 是 reset)。
- `/download_data`、`/backtest/history*`、`/pairlists/evaluate` 仅 webserver 模式可用(`is_webserver_mode` 守卫,trade 模式 503);UI 以 ErrorAlert 兜底。验收用第二实例:`freqtrade webserver -c user_data/config-web.json`(127.0.0.1:8082)。
- WS `/api/v1/message/ws?token=<JWT>`:频道只收到**显式订阅**的消息类型(channel_broadcaster 按 subscribed_to 过滤,默认空集);access token 15 分钟过期,重连需重读 token。调试点 `window.__ftWs` / `window.__ftChart`。**交易事件(entry/exit*_fill 等)是扁平载荷**——pair/open_rate/close_rate/direction 在消息顶层,不在 `data` 内;`data` 包裹只用于白名单等请求-响应式消息。
- 后台任务结果:`/background` 列表只报状态进度,**不含 result**;pairlist 评估读 `/pairlists/evaluate/{jobid}`,策略分析读 `/lookahead_analysis/{jobid}` / `/recursive_analysis/{jobid}`。`/pairlists/available` 返回 19 个处理器的参数 schema(type number/option/boolean/list + default/description)。回测分析字段(periodic_breakdown/results_per_enter_tag/exit_reason_summary/mix_tag_stats)只在 `backtest_result.strategy.*` 明细里,`strategy_comparison` 行没有;mix_tag_stats 的 `key` 是二元组数组。
- 后台任务轮询语义不一致:pairlist 评估端点**运行期间返回 400** "Job not finished yet."(前端须映射为挂起态,不能当错误);分析端点运行期间返回 200 `{status:"running", running:true}`。分析任务失败时是 200 `{status:"error", status_msg}`,前端必须渲染 status_msg 否则静默;递归分析结果含 NaN 方差时 GET 直接 500(JSON 序列化失败,后端限制)。递归分析**强制要求 timerange**(缺省直接 OperationalException),前瞻分析则可省略。
- 测试机器人:dry-run `freqtrade trade -c user_data/config.json --strategy SampleStrategy`(127.0.0.1:8081,账密 freqtrade / 见 config)。`force_entry_enable` 已开(本轮验证强开链路时打开)。
- 前端列表过滤组件禁止"先截断后过滤"(曾 `slice(0,200)` 致 OKX 靠后交易对永远搜不到);cmdk 自带过滤,渲染全量即可。
- `.gitignore` 的 Python 打包规则 `lib/` 曾把 `ui/src/lib/` 整体忽略(已加 `!ui/src/lib/` 例外);新增前端目录树时先 `git check-ignore` 验证。
- 多机器人跨源:目标机器人须在 `api_server.CORS_origins` 列入本 UI 源并重启,否则浏览器拦截(webserver.py CORS 中间件,默认空)。freqtrade Basic 认证仅支持 ASCII 凭证(后端 `b64decode().decode("ascii")`)。`crypto.randomUUID` 在非安全上下文(http://IP)不可用,前端 id 生成用 `crypto.getRandomValues`。webserver 模式 `/show_config.state` 返回空串(非 "stopped")。`/freqaimodels` 为 webserver 限定端点。日志五元组第二元素是 epoch 毫秒浮点(时区转换须用它,formatted 串是服务器本地时区)。
