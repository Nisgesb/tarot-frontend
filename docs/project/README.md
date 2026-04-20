# 前端仓库手册

## 作用
- 这里只放前端仓库内的执行手册、入口说明、运行时事实和验证清单。
- 跨仓契约、任务级别、任务包、验收规则，仍以上位总控 `/Users/zs/Code/project_controls/tarot-divination` 为准。

## 建议阅读顺序
1. `AGENTS.md`
2. `docs/project/00-local-dev-and-capacitor.md`
3. `docs/project/01-scene-map-and-entry-points.md`
4. `docs/project/02-home-nav-and-runtime.md`
5. `docs/project/03-live-reading-frontend-flow.md`
6. `docs/project/04-verify-checklist.md`

## 配套真相源
- 场景装配：`src/App.tsx`
- 路由语义：`src/hooks/useSceneMachine.ts`
- 首页挂载：`src/scenes/DreamEntryScene.tsx`
- 首页内容：`src/components/HomePage.tsx`
- 一级导航：`src/components/PrimaryBottomNav.tsx`
- 调试面板：`src/components/MotionDebugPanel.tsx`
- 真人连线：`src/scenes/LiveReadingScene.tsx`
- API 入口：`src/services/liveReadingApi.ts`

## 当前已知风险
- `DreamGalleryScene` 和 `MyDreamsScene` 顶部回首页动作仍传入 `actions.goHome`，会回到 `/`，不是 Enter 后首页 `/dream/new`。
- `useSceneMachine.ts` 仍保留旧语义兼容：`/archive -> myDreams`，改路由前必须先处理兼容口径。
- 真人连线登录区 helper text 仍写死历史账号文案，不应被当成正式真相源。
