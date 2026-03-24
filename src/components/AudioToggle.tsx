interface AudioToggleProps {
  muted: boolean
  onToggle: () => void
}

export function AudioToggle({ muted, onToggle }: AudioToggleProps) {
  return (
    <button
      type="button"
      className={`audio-toggle ${muted ? 'is-muted' : 'is-active'}`}
      aria-label={muted ? 'Enable ambient audio' : 'Mute ambient audio'}
      onClick={onToggle}
    >
      <span className="audio-toggle-pulse" aria-hidden />
      <span className="audio-toggle-icon" aria-hidden>
        <span className="audio-dot" />
        <span className="audio-wave audio-wave-a" />
        <span className="audio-wave audio-wave-b" />
      </span>
      <span className="audio-toggle-label">{muted ? 'Sound Off' : 'Sound On'}</span>
    </button>
  )
}
