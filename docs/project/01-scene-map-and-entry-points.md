# 场景图与入口

## 路由真相源
- 唯一路由语义真相源：`src/hooks/useSceneMachine.ts`
- 场景装配真相源：`src/App.tsx`

## 当前路由到场景映射
| 路径 | 场景 | 备注 |
| --- | --- | --- |
| `/` | `hero` | 开场 Hero |
| `/dream/new` | `dreamEntry` | Enter 后主首页 |
| `/dream/new?phase=assistant` | `assistantRefine` | AI 引导提问阶段 |
| `/dream/new?phase=generating` | `generating` | 结果生成中 |
| `/ai-reading` | `assistantRefine` | 直接进入 AI 占卜入口 |
| `/live-reading` | `featureLanding` | slug 为 `live-reading`，实际由 `LiveReadingScene` 接管渲染 |
| `/daily-fortune` | `featureLanding` | 通用功能页 |
| `/gallery` | `gallery` | 圈子 |
| `/my-dreams` | `myDreams` | 我的页现行主路径 |
| `/archive` | `myDreams` | 旧路径兼容，仍然生效 |
| `/dream/:id?view=result` | `result` | 结果页 |
| `/dream/:id?view=inspect&from=...` | `inspectDream` | 详情检查页 |

## Enter 主流程
1. `HeroOverlay` 在 `hero` / `entering` 场景工作。
2. 点击 Enter 后，`App.tsx` 通过 `useEnterTransition` 驱动过渡。
3. 过渡完成后进入 `/dream/new`。
4. `DreamEntryScene.tsx` 在 `dreamEntry` 阶段直接渲染 `HomePage`。

## 一级页显示规则
- `PrimaryBottomNav` 只在以下场景显示：
  - `dreamEntry`
  - `featureLanding`
  - `gallery`
  - `myDreams`
- 当前激活 tab 规则：
  - `myDreams -> 我的`
  - `gallery -> 圈子`
  - 其他一级页 -> 首页

## 已确认风险
- `actions.goHome()` 仍然导航到 `/`。
- `PrimaryBottomNav` 的首页按钮已经改为 `actions.goDreamEntry()`。
- 但 `DreamGalleryScene`、`MyDreamsScene` 传入的 `onGoHome` 还是 `actions.goHome()`，因此顶部“首页”类动作仍可能把用户带回 Hero。
