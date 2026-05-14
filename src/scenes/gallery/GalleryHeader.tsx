import styles from './GalleryScene.module.css'

interface GalleryHeaderProps {
  searchValue: string
  onSearchValueChange: (value: string) => void
}

export function GalleryHeader({
  searchValue,
  onSearchValueChange,
}: GalleryHeaderProps) {
  return (
    <header className={styles.headerBlock} aria-label="圈子标题与搜索">
      <p className={styles.headerEyebrow}>银月札记 · Circle Flow</p>
      <h1 className={styles.headerTitle}>灵感潮汐</h1>
      <p className={styles.headerSubtitle}>
        今晚的月相，适合轻声说出你真正想确认的事。
      </p>
      <label className={styles.searchWrap}>
        <span className={styles.searchIcon} aria-hidden>
          <svg viewBox="0 0 24 24" role="presentation">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </span>
        <input
          type="search"
          value={searchValue}
          placeholder="搜索塔罗师、牌阵或灵感关键词"
          onChange={(event) => onSearchValueChange(event.target.value)}
          aria-label="搜索圈子内容"
        />
      </label>
    </header>
  )
}
