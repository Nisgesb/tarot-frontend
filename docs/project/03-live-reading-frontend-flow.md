# 真人连线前端链路

## 代码真相源
- 页面：`src/scenes/LiveReadingScene.tsx`
- API 封装：`src/services/liveReadingApi.ts`
- 类型：`src/types/liveReading.ts`

## 环境与存储
- API 基地址来自 `VITE_API_BASE_URL`
- WebSocket 地址常量来自 `VITE_LIVEKIT_WS_URL`
- 但房间连接实际使用的是后端 `/calls/:id/join-token` 返回的 `livekit.url`
- 已登录态存储 key：`live-reading-auth-v1`

## 页面主链
1. 未登录时显示邮箱密码登录/注册。
2. 页面激活后先拉一次，登录成功后会再拉一次：
   - `GET /readers/online`
   - `GET /tarot/decks`
3. 用户侧选择占卜师和牌组，调用 `POST /calls` 创建会话。
4. 创建成功后调用 `POST /calls/:id/join-token` 获取房间 token。
5. 前端用 `livekit-client` 连接房间。
6. 用户侧点击“揭牌并同步特效”：
   - 先本地显示特效
   - 再通过 LiveKit DataChannel 广播
   - 同时调用 `POST /calls/:id/reveal` 存证
7. 挂断时调用 `POST /calls/:id/end`

## 角色差异
- 注册入口只会创建普通用户账号。
- 占卜师角色没有前端注册入口，联调依赖后端种子占卜师。
- 当 `auth.user.role === 'READER'` 时，页面显示“按会话号加入”入口。

## 媒体能力降级
- 如果环境支持 `getUserMedia`，会直接启用本地摄像头和麦克风。
- 如果不支持 `getUserMedia`，页面会尝试创建 canvas 虚拟视频流用于双端联调。
- 如果连虚拟流也不可用，则继续保留“仅信令 + 特效同步”降级模式。

## 当前已知风险
- 登录面板 helper text 仍显示历史账号 `test2@123.com / test123`，这只是旧提示，不是正式真相源。
- `liveReadingApi.ts` 暴露了 `LIVEKIT_WS_URL` 常量，但 `LiveReadingScene.tsx` 连接房间时依赖 join token 返回值；排查 WS 问题时不能只盯前端 env。
- 该场景目前仍属于一级页语义内的特殊功能页，回首页动作已接到 `actions.goDreamEntry()`。
