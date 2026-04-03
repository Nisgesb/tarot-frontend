import { useState } from 'react'
import { DesktopCardGalleryDemo } from './demos/DesktopCardGalleryDemo'
import { MobileMenuDemo } from './demos/MobileMenuDemo'
import styles from './demos/VelocitySkewDemos.module.css'

type DemoTab = 'a' | 'b'

export function VelocitySkewShowcase() {
  const [activeTab, setActiveTab] = useState<DemoTab>('a')
  const [intensity, setIntensity] = useState(35)
  const strength = intensity / 100
  const maxSkew = 2 + strength * 38
  const velocityScale = 0.15 + strength * 7.5
  const velocityDivisor = 1200 - strength * 1100

  return (
    <div className={styles.showcaseRoot}>
      <header className={styles.showcaseToolbar}>
        <h2 className={styles.showcaseTitle}>VelocitySkew</h2>
        <div className={styles.showcaseTabs} role="tablist" aria-label="VelocitySkew demos">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'a'}
            className={`${styles.showcaseTab} ${activeTab === 'a' ? styles.showcaseTabActive : ''}`}
            onClick={() => setActiveTab('a')}
          >
            A · 移动菜单（触控速度倾斜反馈）
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'b'}
            className={`${styles.showcaseTab} ${activeTab === 'b' ? styles.showcaseTabActive : ''}`}
            onClick={() => setActiveTab('b')}
          >
            B · 卡片画廊（悬停与滚动倾斜共存）
          </button>
        </div>

        <div className={styles.showcaseSliderWrap}>
          <label htmlFor="velocity-skew-max-slider" className={styles.showcaseSliderLabel}>
            倾斜强度（灵敏度）
          </label>
          <input
            id="velocity-skew-max-slider"
            className={styles.showcaseSlider}
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            onChange={(event) => setIntensity(Number(event.target.value))}
          />
          <span className={styles.showcaseSliderValue}>{intensity}%</span>
        </div>
      </header>

      {activeTab === 'a' ? (
        <MobileMenuDemo
          maxSkew={maxSkew}
          velocityScale={velocityScale}
          velocityDivisor={velocityDivisor}
        />
      ) : (
        <DesktopCardGalleryDemo
          maxSkew={maxSkew}
          velocityScale={velocityScale}
          velocityDivisor={velocityDivisor}
        />
      )}
    </div>
  )
}
