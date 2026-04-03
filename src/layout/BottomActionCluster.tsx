interface BottomActionClusterProps {
  onDownload: () => void
  onDreamAgain: () => void
  onExploreGallery: () => void
}

export function BottomActionCluster({
  onDownload,
  onDreamAgain,
  onExploreGallery,
}: BottomActionClusterProps) {
  return (
    <div className="bottom-action-cluster">
      <div className="bottom-action-row">
        <button type="button" className="outline-pill" onClick={onDownload}>
          Download
        </button>
        <button type="button" className="outline-pill" onClick={onDreamAgain}>
          Dream Again
        </button>
      </div>
      <div className="bottom-action-row">
        <button type="button" className="outline-pill" onClick={onExploreGallery}>
          Explore Gallery
        </button>
      </div>
    </div>
  )
}
