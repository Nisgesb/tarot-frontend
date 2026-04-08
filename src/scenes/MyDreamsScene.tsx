import { OrbFieldCanvas } from '../components/OrbFieldCanvas'
import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'

function formatArchiveDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '最近记录'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

interface MyDreamsSceneProps {
  active: boolean
  dreams: DreamRecord[]
  title?: string
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  motionProfile?: MotionProfile
  performanceTier: PerformanceTier
  pointerCoarse: boolean
  onGoHome: () => void
  onGoGallery: () => void
  onStartNew: () => void
  onSelectDream: (
    dream: DreamRecord,
    origin: {
      x: number
      y: number
      color: string
      radius: number
    },
  ) => void
}

export function MyDreamsScene({
  active,
  dreams,
  title = '我的',
  reducedMotion,
  motionRef,
  motionProfile = { x: 1, y: 1 },
  performanceTier,
  pointerCoarse,
  onGoHome,
  onGoGallery,
  onStartNew,
  onSelectDream,
}: MyDreamsSceneProps) {
  const latestDream = [...dreams].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null
  const className = [
    'scene-panel',
    'my-dreams-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      {active && dreams.length > 0 ? (
        <OrbFieldCanvas
          className="explore-orb-canvas"
          dreams={dreams}
          active={active}
          reducedMotion={reducedMotion}
          motionRef={motionRef}
          motionProfile={motionProfile}
          performanceTier={performanceTier}
          pointerCoarse={pointerCoarse}
          onSelect={onSelectDream}
        />
      ) : null}
      <div className="explore-scene-scrim" aria-hidden />
      <div className="explore-scene-shell">
        <header className="explore-topbar">
          <button type="button" className="topbar-link explore-nav-link" onClick={onGoHome}>
            首页
          </button>
          <button type="button" className="topbar-link explore-nav-link" onClick={onGoGallery}>
            圈子
          </button>
        </header>

        <div className="explore-hero">
          <p className="explore-eyebrow">Dream Archive</p>
          <h1 className="explore-title">Archive</h1>
          <p className="explore-subtitle">
            把每一次抽牌、图像与直觉提示留在这里，回到最有感觉的那场梦里。
          </p>
        </div>

        {dreams.length === 0 ? (
          <div className="explore-empty-card">
            <p className="explore-card-label">EMPTY ARCHIVE</p>
            <h2>这里还没有被保存的梦境</h2>
            <p>
              完成第一次梦境可视化之后，它会出现在这里，成为你之后反复回看的个人牌库。
            </p>
            <button type="button" className="primary-pill explore-primary-action" onClick={onStartNew}>
              开始记录
            </button>
          </div>
        ) : (
          <>
            <div className="explore-summary-grid">
              <article className="explore-summary-card">
                <p className="explore-card-label">SAVED</p>
                <p className="explore-card-value">{dreams.length}</p>
                <p className="explore-card-copy">已保存梦境</p>
              </article>
              <article className="explore-summary-card explore-summary-card-accent">
                <p className="explore-card-label">LATEST</p>
                <p className="explore-card-value explore-card-value-title">
                  {latestDream?.title ?? title}
                </p>
                <p className="explore-card-copy">
                  {latestDream ? formatArchiveDate(latestDream.createdAt) : '最近记录'}
                </p>
              </article>
            </div>

            <div className="explore-floating-note">
              <p>{dreams.length} saved dreams</p>
              <p>轻触光球聚焦，再次点击重新进入那场梦</p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
