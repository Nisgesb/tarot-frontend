# 首页、导航与运行时

## 首页真相源
- 首页容器：`src/scenes/DreamEntryScene.tsx`
- 首页组件：`src/components/HomePage.tsx`
- 首页文案数据：`src/data/homePageContent.ts`
- 首页功能配置：`src/config/homeMenu.ts`

## 首页当前结构
- 顶部左侧是设置按钮，右侧是更多按钮。
- Hero 标题来自 `HOME_HERO_TITLE`，当前为中文短标题。
- 主视觉是 `/media/home-hero-video.mp4` 视频卡片。
- 中段是横向功能卡片区 `HOME_FEATURE_CARDS`。
- 下段是内容分组区 `HOME_INFO_SECTIONS`。
- 页面底部保留额外 spacer，给底部导航和 safe area 留空间。

## 一级导航真相源
- 组件：`src/components/PrimaryBottomNav.tsx`
- 胶囊 tab 顺序固定：`my -> home -> circle`
- 激活态不是按钮背景切换，而是 `activePill` 按 `--nav-progress` 滑动

## 当前导航交互事实
- 只有当前激活 tab 会绑定拖拽处理器。
- 拖拽时只更新滑块进度，不立即切页。
- 抬手后根据速度投影和当前位置吸附到目标 tab，再触发切页。
- 支持跨两格切换，因为 `progress` 允许从 0 直接吸附到 2，反之亦然。
- 点击切换与拖拽切换使用不同 settle 时间：
  - 点击：220ms
  - 拖拽：320ms

## 运行时控制点
- `src/App.tsx` 用 `has-primary-bottom-nav` 控制底部导航占位语义。
- `useSceneOwnedBackground` 当前对以下场景启用自持背景：
  - `dreamEntry`
  - `gallery`
  - `myDreams`
- 文本输入聚焦只在以下场景允许长期保持：
  - `assistantRefine`
  - `liveReadingActive`

## 调试与持久化
- 陀螺仪调试参数持久化 key：
  - `motion-debug-tuning-v1`
  - `motion-debug-scene-v1`
- 授权与 onboarding 状态 key：
  - `motion-onboarding-complete`
  - `motion-last-permission`
- 这些 key 都由 `src/App.tsx` 统一读写。

## 当前风险
- 首页、我的、圈子的背景体系已经在 `App.tsx + scenes.css + theme.css` 上形成统一基础，但旧命名和旧语义还没完全清干净。
- Hero 和部分功能页仍保留旧的 `dream / universe / archive / collective` 语义尾巴，改文案前先确认是否会影响路由兼容。
