import { useMemo, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'
import { GalleryCard } from './gallery/GalleryCard'
import { GalleryHeader } from './gallery/GalleryHeader'
import { GalleryPublishButton } from './gallery/GalleryPublishButton'
import { GalleryTab } from './gallery/GalleryTab'
import { GalleryTodayMood } from './gallery/GalleryTodayMood'
import {
  GALLERY_FEED_BY_TAB,
  GALLERY_TABS,
  TODAY_MOOD_ENTRIES,
  type GalleryTabKey,
} from './gallery/galleryMockData'
import styles from './gallery/GalleryScene.module.css'

interface DreamGallerySceneProps {
  active: boolean
  dreams: DreamRecord[]
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  motionProfile?: MotionProfile
  performanceTier: PerformanceTier
  pointerCoarse: boolean
  onGoHome: () => void
  onGoMyDreams: () => void
  onSelectDream: (
    dream: DreamRecord,
    origin: {
      x: number
      y: number
      color: string
      radius: number
    },
  ) => void
  onRandomDream: () => void
}

export function DreamGalleryScene({
  active,
}: DreamGallerySceneProps) {
  const className = [
    'scene-panel',
    'dream-gallery-scene',
    styles.scene,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<GalleryTabKey>('tarotReaders')
  const [switchingTab, setSwitchingTab] = useState(false)

  const feedCards = useMemo(
    () => GALLERY_FEED_BY_TAB[activeTab],
    [activeTab],
  )

  const visibleCards = feedCards.slice(0, 2)

  const handleTabChange = (tab: GalleryTabKey) => {
    if (tab === activeTab) {
      return
    }

    setSwitchingTab(true)
    window.setTimeout(() => {
      setActiveTab(tab)
      setSwitchingTab(false)
    }, 180)
  }

  return (
    <section className={className} aria-label="圈子页面">
      <div className={styles.shell}>
        <GalleryHeader
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
        />
        <GalleryTab tabs={GALLERY_TABS} activeTab={activeTab} onChange={handleTabChange} />
        <GalleryTodayMood entries={TODAY_MOOD_ENTRIES} />
        <section className={styles.feedTransition} aria-label="圈子信息流">
          <div
            className={[
              styles.feedTrack,
              switchingTab ? styles.feedTrackSwitching : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {visibleCards[0] ? <GalleryCard card={visibleCards[0]} index={0} /> : null}
            {visibleCards[1] ? (
              <div className={styles.feedCardPeek}>
                <GalleryCard card={visibleCards[1]} index={1} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <GalleryPublishButton />
    </section>
  )
}
