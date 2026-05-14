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

## 首页天气小猫视频真机验收
1. 配置 `.env.local`：
   - `VITE_QWEATHER_API_KEY=你的和风天气 API Key`
   - `VITE_QWEATHER_API_HOST=你的 QWeather 专属 API Host`
2. 重启 dev server（环境变量变更后必须重启）。
3. Web 验收：
   - 打开首页并允许定位，观察小猫视频是否随天气切换。
   - 关闭定位权限/断网后，确认页面不白屏，回退到 cache 或 fallback。
   - 打开视频调试面板，分别验证模拟晴天、雨天、定位失败、权限拒绝、接口失败、清缓存、强制刷新。
4. iOS 验收：
   - 执行 `npm run cap:sync:ios`，在模拟器或真机安装运行。
   - 首次进入首页允许定位，观察天气来源日志与小猫视频切换。
   - 在系统设置里拒绝定位后重进首页，确认仍能回退展示。
5. Android 验收：
   - 执行 `npm run cap:sync:android`，在模拟器或真机安装运行。
   - 首次进入首页允许定位，观察天气来源日志与小猫视频切换。
   - 拒绝定位或断网后重进首页，确认仍能回退展示。
6. 验收日志关注点（仅 dev）：
   - `hasApiKey`、`hasApiHost`
   - `endpoint`（`/v7/weather/now`）
   - `canRequestRealWeather`
   - `origin`（`real-api / cache / fallback / debug-mock`）
