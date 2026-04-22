# Start/Home Palette Backup — 2026-04-22

## 备份方式（当前采用）
- 采用“**可读快照 + 源文件锚点**”方式备份。
- 优点：不影响运行时、不引入依赖、可按区块精准回滚。
- 回滚方式：按下面区块将颜色段拷回对应文件/选择器。

---

## A. 起始页（Hero / Entering）配色快照

### A1) 场景主题入口
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/index.css:84`

```css
.app-root.scene-entering {
  --text-main: rgba(255, 246, 252, 0.97);
  --text-subtle: rgba(255, 234, 248, 0.86);
  --glass-border: rgba(243, 222, 255, 0.34);
  --glass-bg: rgba(67, 42, 99, 0.44);
  --button-shadow: 0 10px 28px rgba(103, 64, 152, 0.32);
  background:
    radial-gradient(circle at 74% 14%, rgba(255, 214, 240, 0.3), transparent 38%), radial-gradient(circle at 16% 74%, rgba(204, 174, 255, 0.26), transparent 44%),
    radial-gradient(circle at 52% 94%, rgba(255, 236, 248, 0.2), transparent 40%),
    linear-gradient(124deg, #4d2d73 0%, #68439a 34%, #7b58b6 62%, #8a6ac7 100%);
}

.app-root.scene-entering::before {
  background:
    radial-gradient(circle at 52% 42%, rgba(255, 255, 255, 0.09), transparent 54%), radial-gradient(circle at 32% 70%, rgba(220, 186, 255, 0.12), transparent 48%),
    radial-gradient(circle at 74% 24%, rgba(255, 212, 238, 0.12), transparent 44%);
}
```

### A2) 星云 Shader 主色（不含算法）
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/components/NebulaBackground.tsx:105`

```glsl
vec3 deepBlue = vec3(0.09, 0.06, 0.2);
vec3 electricBlue = vec3(0.36, 0.24, 0.58);
vec3 cyanBlue = vec3(0.58, 0.42, 0.72);
vec3 lilac = vec3(0.97, 0.88, 0.93);
color += cyanBlue * stream * 0.5;
color = mix(color, lilac, smoothstep(0.5, 1.0, n3) * 0.36 + halo * 0.3);
color += vec3(0.28, 0.2, 0.24) * bloom;
```

### A3) 门体发光/玻璃色
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/index.css:209`

```css
.portal-halo {
  background:
    radial-gradient(circle at 52% 42%, rgba(246, 220, 255, 0.46), rgba(201, 162, 236, 0.24) 34%, rgba(127, 108, 198, 0) 74%),
    radial-gradient(circle at 50% 63%, rgba(198, 173, 247, 0.3), rgba(198, 173, 247, 0) 66%);
}

.portal-shell {
  border: 1px solid rgba(250, 233, 255, 0.48);
  background:
    radial-gradient(circle at 50% 16%, rgba(250, 231, 255, 0.56), rgba(250, 231, 255, 0) 34%),
    linear-gradient(180deg, rgba(243, 204, 255, 0.55) 0%, rgba(223, 186, 246, 0.5) 44%, rgba(170, 148, 226, 0.42) 100%);
  box-shadow:
    0 0 0 1px rgba(245, 223, 255, 0.2) inset,
    0 0 34px rgba(235, 208, 255, 0.26),
    0 0 80px rgba(181, 146, 238, 0.29),
    0 0 140px rgba(133, 95, 204, 0.22);
}
```

### A4) 门线条 SVG 渐变
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/components/DreamPortal.tsx:118`

```tsx
<stop stopColor="rgba(255,255,255,0.86)" />
<stop offset="0.5" stopColor="rgba(245,219,255,0.86)" />
<stop offset="1" stopColor="rgba(206,186,245,0.68)" />
<path d="M74 420H286" stroke="rgba(228, 215, 255, 0.76)" strokeWidth="2.4" />
```

### A5) 吸星粒子点色
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/components/StarField.tsx:388`

```ts
context.fillStyle = `rgba(217, 244, 255, ${opacity})`
context.fillStyle = `rgba(205, 235, 255, ${opacity * 0.18})`
```

---

## B. 首页（DreamEntry / Home Surface）配色快照

### B1) 首页主题 token（主真相）
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/styles/theme.css:29`

```css
--tarot-home-rose: #f3bddf;
--tarot-home-plum: #c69ad1;
--tarot-home-violet: #ae8dff;
--tarot-home-cosmic: #7f52d8;
--tarot-home-pearl: #fff5fb;
--tarot-home-sky-top: #25172d;
--tarot-home-sky-mid: #3d2547;
--tarot-home-sky-bottom: #60486d;
--tarot-home-base-deep: #241528;
--tarot-home-base-void: #160d1a;
--tarot-home-veil-soft: rgba(18, 10, 21, 0.14);
--tarot-home-veil-mid: rgba(20, 11, 24, 0.3);
--tarot-home-veil-strong: rgba(17, 10, 20, 0.56);
--tarot-home-fog-blue: rgba(255, 245, 251, 0.12);
--tarot-home-fog-blue-strong: rgba(240, 199, 234, 0.18);
--tarot-home-fog-plum: rgba(243, 189, 223, 0.2);
--tarot-home-fog-plum-strong: rgba(174, 141, 255, 0.22);
--tarot-home-sheen: rgba(255, 255, 255, 0.18);
--tarot-home-glass: rgba(69, 45, 80, 0.42);
--tarot-home-glass-soft: rgba(86, 58, 96, 0.34);
--tarot-home-glass-strong: rgba(49, 29, 58, 0.58);
--tarot-home-glass-border: rgba(255, 245, 251, 0.18);
--tarot-home-glass-border-strong: rgba(255, 245, 251, 0.26);
--tarot-home-glass-border-soft: rgba(255, 245, 251, 0.1);
--tarot-home-text-title: rgba(255, 246, 252, 0.98);
--tarot-home-text-body: rgba(251, 236, 248, 0.88);
--tarot-home-text-meta: rgba(251, 236, 248, 0.64);
--tarot-home-shadow: rgba(28, 16, 34, 0.22);
--tarot-home-shadow-deep: rgba(18, 10, 22, 0.38);
--tarot-home-ring: rgba(255, 245, 251, 0.08);
--tarot-home-video-scrim: rgba(13, 9, 17, 0.24);
```

### B2) 首页共享背景层（Home/Gallery/My）
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/styles/scenes.css:5`

```css
.shared-home-surface,
.app-root .dream-gallery-scene,
.app-root .my-dreams-scene {
  background:
    linear-gradient(
      180deg,
      var(--tarot-home-veil-soft) 0%,
      rgba(20, 11, 24, 0.18) 14%,
      var(--tarot-home-veil-mid) 54%,
      var(--tarot-home-veil-strong) 100%
    ),
    radial-gradient(circle at 50% -6%, rgba(255, 255, 255, 0.18), transparent 28%),
    radial-gradient(circle at 16% 10%, var(--tarot-home-fog-plum), transparent 28%),
    radial-gradient(circle at 84% 16%, var(--tarot-home-fog-blue), transparent 30%),
    radial-gradient(circle at 48% 92%, rgba(174, 141, 255, 0.18), transparent 40%),
    linear-gradient(
      180deg,
      var(--tarot-home-sky-top) 0%,
      var(--tarot-home-sky-mid) 22%,
      var(--tarot-home-sky-bottom) 54%,
      var(--tarot-home-base-deep) 76%,
      var(--tarot-home-base-void) 100%
    );
}
```

### B3) 首页模块页面级雾层
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/components/HomePage.module.css:18`

```css
.page::before {
  background:
    radial-gradient(78% 52% at 12% 8%, rgba(243, 189, 223, 0.18) 0%, rgba(243, 189, 223, 0) 62%),
    radial-gradient(66% 54% at 86% 16%, rgba(255, 245, 251, 0.16) 0%, rgba(255, 245, 251, 0) 68%),
    radial-gradient(76% 58% at 54% 96%, rgba(174, 141, 255, 0.18) 0%, rgba(174, 141, 255, 0) 70%);
}
```

### B4) 首页场景入口底色（App Root）
- Source: `/Users/zs/Code/frontend/app/tarot-divination-frontend/src/index.css:102`

```css
.app-root.scene-dreamEntry,
.app-root.scene-gallery,
.app-root.scene-myDreams {
  background:
    radial-gradient(circle at 18% 14%, rgba(243, 189, 223, 0.16), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255, 245, 251, 0.12), transparent 24%),
    radial-gradient(circle at 50% 76%, rgba(174, 141, 255, 0.18), transparent 42%), linear-gradient(180deg, #1a0f1f 0%, #291731 34%, #493055 68%, #23142a 100%);
}
```

---

## C. 使用建议（后续改色）
1. 起始页改色优先改 A1/A2/A3，不先动算法参数。
2. 首页改色优先改 B1 token，再观察 B2/B3 是否需要局部微调。
3. 若只要“快速回滚”，先从 B1 与 A1 恢复，再细调门体与星云。
