import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'
import styles from './MyDreamsScene.module.css'

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
  onGoHome,
  onGoGallery,
  onStartNew,
  onSelectDream,
}: MyDreamsSceneProps) {
  const className = [
    'scene-panel',
    'my-dreams-scene',
    styles.scene,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const totalDraws = Math.max(36, dreams.length * 3)
  const collectionCount = Math.max(12, Math.round(dreams.length * 0.8))
  const streakDays = Math.max(7, Math.min(31, dreams.length + 2))
  const notesCount = Math.max(18, dreams.length * 2)

  const handleOpenLatest = () => {
    const latest = dreams[0]
    if (!latest) {
      onStartNew()
      return
    }

    onSelectDream(latest, {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.52,
      color: '#8d82f1',
      radius: 190,
    })
  }

  const functionRows = [
    { id: 'records', title: '我的记录', subtitle: '查看你的运势与抽牌历史', icon: '📋', onClick: handleOpenLatest },
    { id: 'collection', title: '收藏牌阵', subtitle: '管理你收藏的牌阵', icon: '🗂️', onClick: onGoGallery },
    { id: 'checkin', title: '每日签到', subtitle: '签到获取能量与奖励', icon: '📅', onClick: onStartNew },
    { id: 'vip', title: '会员中心', subtitle: '解锁专属特权与优惠', icon: '👑', onClick: onGoHome },
    { id: 'notice', title: '消息通知', subtitle: '系统消息与活动提醒', icon: '🔔', onClick: onGoGallery },
    { id: 'settings', title: '设置', subtitle: '账号与隐私设置', icon: '⬢', onClick: onGoHome },
  ] as const

  return (
    <section className={className} aria-label="我的页面">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroActions}>
            <button type="button" className={styles.heroIconButton} aria-label="消息" onClick={onGoGallery}>
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M4.5 11.6a7.5 7.5 0 1 1 3 6l-2.8.8.8-2.8a7.5 7.5 0 0 1-1-4Z" />
                <circle cx="9.5" cy="11.7" r="0.95" />
                <circle cx="12.5" cy="11.7" r="0.95" />
                <circle cx="15.5" cy="11.7" r="0.95" />
              </svg>
              <span className={styles.dot} aria-hidden />
            </button>
            <button type="button" className={styles.heroIconButton} aria-label="设置" onClick={onGoHome}>
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M13.8 3.6 15 5.8c.3.4.8.7 1.3.7h2.4v2.9l-2.2 1.2c-.4.2-.7.7-.7 1.2v.4c0 .5.3.9.7 1.2l2.2 1.2v2.9h-2.4c-.5 0-1 .3-1.3.7l-1.2 2.2h-3.6l-1.2-2.2c-.3-.4-.8-.7-1.3-.7H5.3v-2.9l2.2-1.2c.4-.3.7-.7.7-1.2v-.4c0-.5-.3-1-.7-1.2L5.3 9.4V6.5h2.4c.5 0 1-.3 1.3-.7l1.2-2.2h3.6Z" />
                <circle cx="12" cy="12" r="2.8" />
              </svg>
            </button>
          </div>
          <p className={styles.heroEyebrow}>MY SPACE</p>
          <h2 className={styles.heroTitle}>我的空间</h2>
        </header>

        <article className={styles.profileCard}>
          <div className={styles.avatarWrap}>
            <img src="/media/auth-eye-open.png" alt="头像" />
          </div>
          <div className={styles.profileBody}>
            <div className={styles.nameRow}>
              <h3>月光旅人</h3>
              <button type="button" aria-label="编辑资料" className={styles.iconTinyButton} onClick={onStartNew}>
                <svg viewBox="0 0 24 24" role="presentation">
                  <path d="m4 16.9 8.7-8.7 3.4 3.4-8.7 8.7H4v-3.4Z" />
                  <path d="m14 6.8 1.8-1.8a1.8 1.8 0 0 1 2.6 0l.6.6a1.8 1.8 0 0 1 0 2.6L17.2 10" />
                </svg>
              </button>
            </div>
            <p className={styles.profileStatus}>塔罗旅程进行中 ✨</p>
            <div className={styles.tags}>
              <span>♎ 天秤座</span>
              <span>☆ Lv.6</span>
              <span>🔮 今日能量稳定</span>
            </div>
            <div className={styles.progressRow}>
              <p>经验值 860 / 1200</p>
              <div className={styles.progressTrack}>
                <span className={styles.progressBar} />
              </div>
            </div>
          </div>
          <div className={styles.crystalVisual} aria-hidden />
          <button type="button" className={styles.editButton} onClick={onStartNew}>
            编辑资料
          </button>
        </article>

        <section className={styles.statsStrip} aria-label="我的数据概览">
          <article className={styles.statItem}>
            <p>累计抽牌</p>
            <h4>{totalDraws}</h4>
            <span>次</span>
          </article>
          <article className={styles.statItem}>
            <p>收藏牌阵</p>
            <h4>{collectionCount}</h4>
            <span>个</span>
          </article>
          <article className={styles.statItem}>
            <p>连续签到</p>
            <h4>{streakDays}</h4>
            <span>天</span>
          </article>
          <article className={styles.statItem}>
            <p>灵感记录</p>
            <h4>{notesCount}</h4>
            <span>条</span>
          </article>
        </section>

        <section className={styles.featureCard} aria-label="我的功能">
          <header className={styles.featureHeader}>
            <h3>我的功能</h3>
            <span aria-hidden>✦</span>
          </header>
          <div className={styles.featureList}>
            {functionRows.map((row) => (
              <button key={row.id} type="button" className={styles.featureRow} onClick={row.onClick}>
                <span className={styles.featureIcon} aria-hidden>{row.icon}</span>
                <div className={styles.featureText}>
                  <p className={styles.featureTitle}>{row.title}</p>
                  <p className={styles.featureSubtitle}>{row.subtitle}</p>
                </div>
                <span className={styles.featureArrow} aria-hidden>›</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.archiveCard} aria-label="我的占卜档案">
          <div className={styles.archiveCopy}>
            <h3>我的占卜档案</h3>
            <p>查看你的运势记录与抽牌足迹</p>
            <button type="button" onClick={handleOpenLatest}>立即查看</button>
          </div>
          <img src="/media/auth-eye-open.png" alt="" aria-hidden />
        </section>
      </div>
    </section>
  )
}
