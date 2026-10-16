# Freqtrade UI(雾白墨绿)

freqtrade 的新一代 Web 界面,替代随 `install-ui` 分发的旧版 freqUI。
基于《雾白墨绿设计风格与 UI 规范 v1.1》实现:雾白背景、墨绿交互、深墨文字、低饱和强调色。

## 技术栈

- **React 19 + TypeScript**(strict)
- **shadcn/ui(Radix 版)** 组件体系 + **Tailwind CSS v4**(CSS-first 主题,`src/index.css`)
- **Vite 7** 构建
- **@tanstack/react-query** 数据层 + **zustand**(登录态持久化)
- **klinecharts v10** K 线图
- lucide-react 图标 / CVA / clsx / tailwind-merge

## 目录结构

```
ui/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui Radix 组件(生成,勿手改)
│   │   ├── layout/      # 应用外壳:侧边栏、头部、机器人控制按钮
│   │   ├── shared/      # PageHeader / StatCard / ProfitText / 加载-空-错误三态
│   │   └── <page>/      # 各页面私有组件
│   ├── lib/
│   │   ├── api/         # API 类型(types.ts)、fetch 客户端(client.ts)、react-query hooks(hooks.ts)
│   │   ├── chart/       # klinecharts 自定义 overlay(交易/信号标记)
│   │   ├── auth.ts      # JWT 登录态 store
│   │   └── utils.ts     # cn() 与数字/时间格式化
│   ├── pages/           # 概览 / 交易记录 / K线图 / 交易对 / 机器人控制 / 回测 / 日志
│   └── router.tsx       # 路由(登录守卫)
└── docs/ui-brief.md     # 设计令牌与实现简报
```

## 开发

```bash
cd ui
npm install
npm run dev        # http://localhost:3000,/api 代理到 127.0.0.1:8081(可用 FREQTRADE_API_URL 覆盖)
```

前提:本地已有运行中的 freqtrade(`api_server.enabled = true`)。

## 构建与部署

```bash
npm run build      # tsc 类型检查 + vite 构建
```

构建产物直接输出到 `../freqtrade/rpc/api_server/ui/installed/`,
随后 `freqtrade trade` / `freqtrade webserver` 会直接服务新界面,无需再执行 `freqtrade install-ui`。

## 设计约束(摘要)

- 颜色与组件变体集中在 `src/index.css` 语义令牌管理,页面中不写死 hex 色值。
- 状态表达双通道:颜色 + 图标/文字(盈亏用 `ProfitText`,状态用带圆点的 Badge)。
- 数字、金额、比例、时间一律加 `tnum` 类保持等宽数字对齐。
- 加载 / 空结果 / 错误三种状态必须区分(Skeleton / EmptyState / ErrorAlert)。
- 变更操作(停止、强平、删除等)必须 AlertDialog 二次确认。

完整规范见 `docs/ui-brief.md` 与仓库外原始规范文档。
