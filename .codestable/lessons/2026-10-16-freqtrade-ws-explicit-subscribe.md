---
status: observed
scope: freqtrade api_server WebSocket 消费
date: 2026-10-16
---
规则:freqtrade WS 频道默认**零订阅**——`channel_broadcaster` 只转发 `channel.subscribed_to(type)` 的消息;连接后必须立刻发送 `{"type":"subscribe","data":[...全部需要的类型...]}`,交易事件(entry/exit/fill)也不例外;否则 socket OPEN 但永远收不到广播。
适用 / 不适用:所有 `/api/v1/message/ws` 消费方;REST 不适用。停止应用信号:后端改为默认全量广播(检查 `api_ws.py` channel_broadcaster 与 `ws/channel.py` 的 _subscriptions 默认值)。
证据:`freqtrade/rpc/api_server/api_ws.py:50`(`if channel.subscribed_to(...)`);`freqtrade/rpc/api_server/ws/channel.py:51`(`_subscriptions: list[str] = []`);UI 实测 exit_fill 广播后页面无反应,补全订阅后即时失效刷新(见 `ui/src/lib/api/ws.ts` SUBSCRIPTIONS)。
候选归宿:project-doc(ui/README 或后端 ws 注释)
