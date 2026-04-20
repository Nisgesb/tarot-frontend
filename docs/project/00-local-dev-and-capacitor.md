# 本地开发与 Capacitor

## 环境入口
- 前端环境文件：`.env.local`
- 当前代码读取的关键变量：
  - `VITE_API_BASE_URL`
  - `VITE_LIVEKIT_WS_URL`
- 本仓最终交付形态是 iOS / Android 移动应用，Web 主要用于开发、回归和联调。
- 联调地址不要写死在文档、组件或常量说明里，直接以当前 `.env.local` 为准。
- `.env.example` 只代表回环默认值，不代表当前局域网联调口径。

## 常用命令
- 安装依赖：`npm install`
- Web 开发：`npm run dev`
- 静态检查：`npm run lint`
- 类型检查：`npm run typecheck`
- 构建：`npm run build`
- 同步原生壳：`npm run cap:sync`
- 同步 iOS：`npm run cap:sync:ios`
- 同步 Android：`npm run cap:sync:android`
- 打开 iOS 工程：`npm run cap:open:ios`
- 打开 Android 工程：`npm run cap:open:android`

## 本地开发顺序
1. 先确认 `.env.local` 和后端 `.env.local` 的 API / LiveKit 地址是一套口径。
2. 先跑 `npm run dev` 做浏览器检查。
3. 涉及资源、样式出包、Capacitor 容器、原生插件或设备能力时，再跑 `npm run cap:sync`。
4. 涉及 iOS 模拟器时，优先 `npm run cap:sync:ios` 后进入 Xcode/模拟器验证。
5. 涉及 Android 交付时，也要进入 `cap:sync:android` 路线验证，不要只停留在 iOS 或浏览器。

## 运行时事实
- safe area 变量由 `src/hooks/useSafeAreaInsets.ts` 注入，来源是 `env(safe-area-inset-*)`。
- 键盘高度与白条影响由 `src/hooks/useKeyboardAwareViewport.ts` 基于 `visualViewport` 处理。
- `src/App.tsx` 会把 `--app-dvh`、safe area 变量和键盘状态统一注入壳层。
- 陀螺仪调试面板由 `src/components/MotionDebugPanel.tsx` 提供，当前只在 `hero` 场景且 `pointerCoarse` 时显示。

## 不要这样做
- 不看 `.env.local` 就排查联调地址。
- 不跑 `cap:sync` 就判断 Capacitor 容器问题已修复。
- 把 safe area、键盘遮挡、点击区域偏移只当成 CSS 问题处理。
- 把浏览器效果当成 iOS / Android 应用交付完成。
