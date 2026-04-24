import { getFeatureLandingConfigBySlug, type FeatureLandingSlug } from '../config/homeMenu'
import { DailyFortuneScene } from './DailyFortuneScene'

interface FeatureLandingSceneProps {
  active: boolean
  featureSlug: FeatureLandingSlug | null
  onGoHome: () => void
}

export function FeatureLandingScene({
  active,
  featureSlug,
  onGoHome,
}: FeatureLandingSceneProps) {
  if (featureSlug === 'daily-fortune') {
    return (
      <DailyFortuneScene
        active={active}
        onGoHome={onGoHome}
      />
    )
  }

  const className = [
    'scene-panel',
    'scene-template-form',
    'feature-landing-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const feature = getFeatureLandingConfigBySlug(featureSlug)

  return (
    <section className={className}>
      <div className="entry-shell feature-landing-shell">
        <div className="entry-shell-glow entry-shell-glow-a" aria-hidden />
        <div className="entry-shell-glow entry-shell-glow-b" aria-hidden />
        <div className="entry-shell-grain" aria-hidden />

        <header className="entry-header feature-landing-header">
          <p className="entry-eyebrow">Dreamkeeper Tarot</p>
          <h2>{feature?.label ?? '功能页面'}</h2>
          <p>{feature?.description ?? '该页面内容正在准备中。'}</p>
        </header>

        <div className="entry-stage feature-landing-stage">
          <div className="feature-landing-status">
            <p className="feature-landing-status-label">当前状态</p>
            <p className="feature-landing-status-value">{feature?.status ?? '筹备中'}</p>
          </div>
          <div className="feature-landing-note">
            <p>{feature?.subtitle ?? '即将开放'}</p>
            <p>
              该入口已经独立保留，后续会直接在这里继续扩展，不再改动首页导航结构。
            </p>
          </div>
          <div className="assistant-actions entry-mobile-sticky">
            <button type="button" className="primary-pill" onClick={onGoHome}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
