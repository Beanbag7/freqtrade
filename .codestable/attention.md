# freqtrade 项目 attention

每次会话必读的项目事实与硬约束（cs-onboard 2026-10-16 初始化，从空开始）。

## 内建 Web UI(雾白墨绿,2026-10-16 并入 stable @969cc8446)

- 源码在 `ui/`(React 19 + TS + shadcn/Radix + Tailwind v4 + klinecharts v10);构建 `cd ui && npm run build` 直出 `freqtrade/rpc/api_server/ui/installed/`,机器人直接服务,无需 `install-ui`。
- 设计规范唯一来源:`/Users/modaoshi/Downloads/ui-design-system-agent-spec.md`(雾白墨绿 v1.1);实施简报 `ui/docs/ui-brief.md`。
- API 契约以 `freqtrade/rpc/api_server/api_schemas.py` + 各 `api_*.py` 路由为准,不靠旧 freqUI 行为猜测。已知坑:登录是 HTTP Basic(`/token/login`);`/logs` 是五元组 `[formattedTime, createdMs, module, level, message]`;`/backtest/history/result` 需 `filename`+`strategy` 双参数;`DELETE /blacklist` 读重复 query 参数 `pairs_to_delete` 不读 body;中止回测是 `GET /backtest/abort`(DELETE 是 reset)。
- `/download_data`、`/backtest/history*`、`/pairlists/evaluate` 仅 webserver 模式可用(`is_webserver_mode` 守卫,trade 模式 503);UI 以 ErrorAlert 兜底。验收用第二实例:`freqtrade webserver -c user_data/config-web.json`(127.0.0.1:8082)。
- WS `/api/v1/message/ws?token=<JWT>`:频道只收到**显式订阅**的消息类型(channel_broadcaster 按 subscribed_to 过滤,默认空集);access token 15 分钟过期,重连需重读 token。调试点 `window.__ftWs` / `window.__ftChart`。
- 测试机器人:dry-run `freqtrade trade -c user_data/config.json --strategy SampleStrategy`(127.0.0.1:8081,账密 freqtrade / 见 config)。`force_entry_enable` 未开,强平可用、强开不可用。
- `.gitignore` 的 Python 打包规则 `lib/` 曾把 `ui/src/lib/` 整体忽略(已加 `!ui/src/lib/` 例外);新增前端目录树时先 `git check-ignore` 验证。
