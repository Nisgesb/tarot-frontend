# 塔罗前端 AGENTS

## 作用范围
本文件作用于 `/Users/zs/Code/frontend/app/tarot-divination-frontend` 及其子目录，是前端线程的仓库级执行入口。

## 上位规则
- 跨仓真相源、任务级别、门禁、验收、任务包，以总控目录 `/Users/zs/Code/project_controls/tarot-divination` 为准。
- 如果本仓规则与总控冲突，以总控为准。
- 前端线程默认先读总控，再回到本仓执行。

## 先读什么
1. 总控入口：`/Users/zs/Code/project_controls/tarot-divination/AGENTS.md`
2. 仓库手册入口：`docs/project/README.md`
3. 路由与一级页语义：`/Users/zs/Code/project_controls/tarot-divination/control/docs/02-c-end-route-scene-canon.md`
4. 视觉、动效、safe area、运行时：`/Users/zs/Code/project_controls/tarot-divination/control/docs/03-c-end-visual-motion-canon.md`
5. 联调与运行时治理：`/Users/zs/Code/project_controls/tarot-divination/control/docs/07-linkup-and-runtime-governance.md`
6. 真人连线前端相关任务：
   - `/Users/zs/Code/project_controls/tarot-divination/control/docs/04-live-reading-mvp-canon.md`
   - `/Users/zs/Code/project_controls/tarot-divination/control/contracts/live-reading/accounts-and-seeds.md`

## 仓库事实
- 技术栈固定：React 19 + TypeScript + Vite + Capacitor
- 当前联调环境文件：`.env.local`
- 常用命令：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run cap:sync`
  - `npm run cap:sync:ios`

## 前端线程最常看的真相源
- `src/App.tsx`
- `src/hooks/useSceneMachine.ts`
- `src/scenes/DreamEntryScene.tsx`
- `src/components/HomePage.tsx`
- `src/components/PrimaryBottomNav.tsx`
- `src/components/MotionDebugPanel.tsx`
- `src/scenes/LiveReadingScene.tsx`
- `src/services/liveReadingApi.ts`
- `src/styles/theme.css`
- `src/styles/scenes.css`

## 前端硬约束
1. `Hero -> Enter -> /dream/new` 是当前主流程，不允许误把 `/` 当成 Enter 后主首页。
2. 一级页固定为“我的 / 首页 / 圈子”，一级底部导航只在一级页显示。
3. 首页、我的、圈子必须共享同一产品世界观、背景体系和沉浸感。
4. 先复用原组件、原逻辑、原动效、原参数，不允许用“差不多”代替复用。
5. 前端最终交付形态是 iOS / Android 移动应用，浏览器只作为开发与回归通道。
6. 默认同时保留浏览器兼容和 Capacitor 兼容，但实现决策必须优先服务移动端应用交付。
7. safe area、点击命中、键盘、白条遮挡、陀螺仪问题属于运行时机制问题，不能只靠 CSS 蒙混。
8. 禁止随意引入新依赖、UI 框架、icon library、Tailwind、styled-components、MUI、antd、Chakra。

## 真人连线前端约束
1. 前端不能持有 LiveKit secret。
2. 占卜师联调账号默认以总控 `accounts-and-seeds.md` 为准，不直接相信页面 helper text。
3. 真人连线问题排查顺序固定为：API、`.env.local`、容器权限、WS、ICE/TCP/UDP、必要时降级。
4. 不能只验证“视频连上”，还要验证建会话、入房、揭牌同步、挂断状态。

## 修改前默认检查
- 先确认当前任务属于哪个能力域：
  - C 端场景与导航域
  - C 端视觉与动效域
  - C 端运行时与容器域
  - 我的与圈子域
  - 真人连线 MVP 域
- 再确认是否命中文档先行：
  - 新增功能
  - 影响其他页面或其他端
  - 改路由语义、状态流转、联调环境口径

## 修改后最少验证
- 默认至少跑：
  - `npm run lint`
  - `npm run typecheck`
- 涉及构建、Capacitor、资源或样式出包时，再补：
  - `npm run build`
- 涉及移动端布局、safe area、命中区域、陀螺仪、真人连线时，必须明确写出：
  - 是否验证了浏览器
  - 是否验证了 Capacitor / 模拟器
  - 是否验证了 iOS / Android
  - 哪些没验证

## 不该做的事
- 不看 `useSceneMachine.ts` 就改路由语义
- 不看 `App.tsx` 就改一级页/功能页显示逻辑
- 不看 `PrimaryBottomNav.tsx` 就重做导航交互
- 不看 `MotionDebugPanel.tsx` 和运行时链路就直接调陀螺仪/背景参数
- 不看总控账号口径就直接拿旧测试账号当正式真相源
