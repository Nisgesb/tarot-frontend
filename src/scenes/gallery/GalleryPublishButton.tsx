import styles from './GalleryScene.module.css'

export function GalleryPublishButton() {
  return (
    <button
      type="button"
      className={styles.publishButton}
      aria-label="发布动态（UI 占位）"
    >
      <span aria-hidden>✶</span>
      <span>发布</span>
    </button>
  )
}
