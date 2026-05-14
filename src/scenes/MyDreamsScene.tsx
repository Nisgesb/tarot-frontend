import { useState } from 'react'
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
    },) => void
}

export function MyDreamsScene({
  active,
  dreams,
  reducedMotion,
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
  ].filter(Boolean)
    .join(' ')

  const totalDraws = Math.max(36, dreams.length * 3)
  const collectionCount = Math.max(12, Math.round(dreams.length * 0.8))
  const streakDays = Math.max(7, Math.min(31, dreams.length + 2))
  const notesCount = Math.max(18, dreams.length * 2)
  const [profileFlipped, setProfileFlipped] = useState(false)

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
    { id: 'records', title: '我的记录', subtitle: '查看你的运势与抽牌历史', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>, onClick: handleOpenLatest },
    { id: 'collection', title: '收藏牌阵', subtitle: '管理你收藏的牌阵', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8"/><path d="M12 3v4a1 1 0 0 0 1 1h4"/></svg>, onClick: onGoGallery },
    { id: 'checkin', title: '每日签到', subtitle: '签到获取能量与奖励', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14l2 2 4-4"/></svg>, onClick: onStartNew },
    { id: 'vip', title: '会员中心', subtitle: '解锁专属特权与优惠', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4 2.5 7-6-4.5-6 4.5 2.5-7L2 9h7l3-7z"/></svg>, onClick: onGoHome },
    { id: 'notice', title: '消息通知', subtitle: '系统消息与活动提醒', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, onClick: onGoGallery },
    { id: 'settings', title: '设置', subtitle: '账号与隐私设置', icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, onClick: onGoHome },
  ] as const

  return (
    <section className={className} aria-label="我的页面">
      <div className={styles.shell}>
        <article
          className={[
            styles.profileCardShell,
            active && !reducedMotion ? styles.cardEntrance : '',
            active && !reducedMotion ? styles.cardEntranceProfile : '',
          ].filter(Boolean).join(' ')}
        >
          <div
            className={`${styles.profileCard} ${profileFlipped ? styles.profileCardFlipped : ''}`}
            onClick={() => setProfileFlipped((current) => !current)}
          >
            <div className={`${styles.profileFace} ${styles.profileFaceFront}`}>
              <div className={styles.profileFaceTop}>
                <div className={styles.avatarWrap}>
                  <img src="/media/auth-eye-open.png" alt="头像" />
                </div>
                <div className={styles.profileBody}>
                  <div className={styles.nameRow}>
                    <h3>月光旅人</h3>
                    <button
                      type="button"
                      aria-label="编辑资料"
                      className={styles.iconTinyButton}
                      onClick={(event) => {
                        event.stopPropagation()
                        onStartNew()
                      }}
                    >
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="m4 16.9 8.7-8.7 3.4 3.4-8.7 8.7H4v-3.4Z" />
                        <path d="m14 6.8 1.8-1.8a1.8 1.8 0 0 1 2.6 0l.6.6a1.8 1.8 0 0 1 0 2.6L17.2 10" />
                      </svg>
                    </button>
                  </div>
                  <p className={styles.profileStatus}>塔罗旅程进行中</p>
                  <div className={styles.tags}>
                    <span>天秤座</span>
                    <span>Lv.6</span>
                    <span>今日能量稳定</span>
                  </div>
                </div>
              </div>
              <div className={styles.progressRow}>
                <p>经验值 860 / 1200</p>
                <div className={styles.progressTrack}>
                  <span className={styles.progressBar} />
                </div>
              </div>
              <button
                type="button"
                className={styles.editButton}
                onClick={(event) => {
                  event.stopPropagation()
                  onStartNew()
                }}
              >
                编辑资料
              </button>
              <span className={styles.flipHint}>点击翻面</span>
            </div>

            <div className={`${styles.profileFace} ${styles.profileFaceBack}`}>
              <div className={styles.statsStrip} aria-label="我的数据概览">
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
              </div>
            </div>
          </div>
        </article>

        <section
          className={[
            styles.featureCard,
            active && !reducedMotion ? styles.cardEntrance : '',
            active && !reducedMotion ? styles.cardEntranceFeature : '',
          ].filter(Boolean).join(' ')}
          aria-label="我的功能"
        >
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

        <section
          className={[
            styles.archiveCard,
            active && !reducedMotion ? styles.cardEntrance : '',
            active && !reducedMotion ? styles.cardEntranceArchive : '',
          ].filter(Boolean).join(' ')}
          aria-label="我的占卜档案"
        >
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
