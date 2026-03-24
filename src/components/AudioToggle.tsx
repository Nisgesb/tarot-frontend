interface AudioToggleProps {
  muted: boolean
  onToggle: () => void
  compact?: boolean
  className?: string
}

export function AudioToggle({
  muted,
  onToggle,
  compact = false,
  className,
}: AudioToggleProps) {
  return (
    <button
      type="button"
      className={`audio-toggle ${muted ? 'is-muted' : 'is-active'} ${compact ? 'is-compact' : ''} ${className ?? ''}`}
      aria-label={muted ? 'Enable ambient audio' : 'Mute ambient audio'}
      onClick={onToggle}
    >
      <span className="audio-toggle-pulse" aria-hidden />
      <span className="audio-toggle-icon" aria-hidden>
        <span className="audio-dot" />
        <span className="audio-wave audio-wave-a" />
        <span className="audio-wave audio-wave-b" />
      </span>
      {!compact ? <span className="audio-toggle-label">{muted ? 'Sound Off' : 'Sound On'}</span> : null}
    </button>
  )
}
