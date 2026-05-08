import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import styles from './GooeySwitch.module.css'

const DEFAULT_SIZE = 200
const DEFAULT_OFF_COLOR = '#9CA3AF'
const DEFAULT_ON_COLOR = '#34D399'
const DEFAULT_BLOB_COLOR = '#1F2937'
const DEFAULT_ICON_COLOR = '#FFFFFF'
const DEFAULT_THRESHOLD = 0.5

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function interpolate(
  value: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
) {
  if (inputRange.length !== outputRange.length || inputRange.length === 0) {
    return 0
  }

  if (value <= inputRange[0]) {
    return outputRange[0]
  }

  const lastIndex = inputRange.length - 1
  if (value >= inputRange[lastIndex]) {
    return outputRange[lastIndex]
  }

  for (let index = 0; index < lastIndex; index += 1) {
    const inputStart = inputRange[index]
    const inputEnd = inputRange[index + 1]

    if (value < inputStart || value > inputEnd) {
      continue
    }

    const outputStart = outputRange[index]
    const outputEnd = outputRange[index + 1]
    const ratio = (value - inputStart) / (inputEnd - inputStart)
    return outputStart + (outputEnd - outputStart) * ratio
  }

  return outputRange[lastIndex]
}

export interface GooeySwitchProps {
  active?: boolean
  onToggle?: (active: boolean) => void
  size?: number
  inactiveColor?: string
  activeColor?: string
  trackColor?: string
  iconTint?: string
  toggleThreshold?: number
  isDisabled?: boolean
  showIcons?: boolean
  blur?: number
  gooey?: number
  className?: string
  ariaLabel?: string
  renderActiveIcon?: ReactNode
  renderInactiveIcon?: ReactNode
}

export function GooeySwitch({
  active,
  onToggle,
  size = DEFAULT_SIZE,
  inactiveColor = DEFAULT_OFF_COLOR,
  activeColor = DEFAULT_ON_COLOR,
  trackColor = DEFAULT_BLOB_COLOR,
  iconTint = DEFAULT_ICON_COLOR,
  toggleThreshold = DEFAULT_THRESHOLD,
  isDisabled = false,
  showIcons = true,
  blur,
  gooey = 35,
  className = '',
  ariaLabel = '切换',
  renderActiveIcon,
  renderInactiveIcon,
}: GooeySwitchProps) {
  const [internalActive, setInternalActive] = useState<boolean>(Boolean(active))
  const isControlled = active !== undefined
  const currentActive = isControlled ? Boolean(active) : internalActive
  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const progressRef = useRef(currentActive ? 1 : 0)
  const pointerRef = useRef<{
    pointerId: number
    startX: number
    startProgress: number
    moved: boolean
  } | null>(null)
  const filterId = `gooey-switch-${useId().replace(/:/g, '-')}`
  const progress = dragging && dragProgress !== null ? dragProgress : currentActive ? 1 : 0

  const {
    switchWidth,
    switchHeight,
    blobRadius,
    sideBlobRadius,
    iconSize,
    xIconSize,
    blurAmount,
    leftX,
    rightX,
    centerY,
    bridgeHeight,
    dragRange,
  } = useMemo(() => {
    const switchWidthValue = size
    const switchHeightValue = size * 0.6
    const blobRadiusValue = size * 0.22
    const sideBlobRadiusValue = blobRadiusValue * 0.82
    const iconSizeValue = size * 0.12
    const xIconSizeValue = size * 0.1
    const blurAmountValue = blur ?? size * 0.1
    const leftXValue = switchWidthValue * 0.28
    const rightXValue = switchWidthValue * 0.72
    const centerYValue = switchHeightValue / 2
    const bridgeHeightValue = switchHeightValue * 0.35

    return {
      switchWidth: switchWidthValue,
      switchHeight: switchHeightValue,
      blobRadius: blobRadiusValue,
      sideBlobRadius: sideBlobRadiusValue,
      iconSize: iconSizeValue,
      xIconSize: xIconSizeValue,
      blurAmount: blurAmountValue,
      leftX: leftXValue,
      rightX: rightXValue,
      centerY: centerYValue,
      bridgeHeight: bridgeHeightValue,
      dragRange: rightXValue - leftXValue,
    }
  }, [blur, size])

  const commitToggle = (nextValue: boolean) => {
    if (!isControlled) {
      setInternalActive(nextValue)
    }

    onToggle?.(nextValue)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      return
    }

    const startProgress = progress

    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startProgress,
      moved: false,
    }
    progressRef.current = startProgress
    setDragProgress(startProgress)
    setDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointerState = pointerRef.current

    if (!pointerState || pointerState.pointerId !== event.pointerId) {
      return
    }

    const delta = event.clientX - pointerState.startX
    const nextProgress = clampValue(pointerState.startProgress + delta / dragRange, 0, 1)

    if (!pointerState.moved && Math.abs(delta) > 2) {
      pointerState.moved = true
    }

    progressRef.current = nextProgress
    setDragProgress(nextProgress)
  }

  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const pointerState = pointerRef.current

    if (!pointerState || pointerState.pointerId !== event.pointerId) {
      return
    }

    pointerRef.current = null
    setDragging(false)
    setDragProgress(null)
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (cancelled) {
      return
    }

    const nextValue = pointerState.moved
      ? progressRef.current > toggleThreshold
      : !currentActive

    if (nextValue !== currentActive) {
      commitToggle(nextValue)
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointer(event, false)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    finishPointer(event, true)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      return
    }

    if (event.key !== ' ' && event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    const nextValue = !currentActive
    commitToggle(nextValue)
  }

  const mainX = interpolate(progress, [0, 1], [leftX, rightX])
  const stretchX = interpolate(progress, [0, 0.2, 0.5, 0.8, 1], [1, 1.108, 1.18, 1.108, 1])
  const stretchY = interpolate(progress, [0, 0.2, 0.5, 0.8, 1], [1, 0.928, 0.88, 0.928, 1])
  const mainRx = blobRadius * stretchX
  const mainRy = blobRadius * stretchY
  const innerRx = Math.max(1, mainRx - 1)
  const innerRy = Math.max(1, mainRy - 1)
  const bridgeX = progress <= 0.5 ? leftX : mainX
  const bridgeWidth = progress <= 0.5 ? mainX - leftX : rightX - mainX
  const bridgeScaleY = interpolate(progress, [0, 0.25, 0.5, 0.75, 1], [0.6, 1, 0.8, 1, 0.6])
  const bridgeRealHeight = bridgeHeight * bridgeScaleY
  const bridgeY = centerY - bridgeRealHeight / 2
  const activeOpacity = interpolate(progress, [0.6, 1], [0, 1])
  const inactiveOpacity = interpolate(progress, [0, 0.4], [1, 0])
  const iconTranslateX = interpolate(progress, [0, 1], [-switchWidth * 0.22, switchWidth * 0.22])
  const iconScaleX = interpolate(progress, [0, 0.2, 0.5, 0.8, 1], [1, 1.08, 1.12, 1.08, 1])
  const iconScaleY = interpolate(progress, [0, 0.2, 0.5, 0.8, 1], [1, 0.94, 0.9, 0.94, 1])

  const rootClassName = [styles.root, dragging ? styles.dragging : '', className]
    .filter(Boolean)
    .join(' ')
  const controlStyle = {
    '--gooey-width': `${switchWidth}px`,
    '--gooey-height': `${switchHeight}px`,
    '--gooey-opacity': isDisabled ? 0.5 : 1,
  } as CSSProperties
  const gooLayerStyle = {
    filter: `url(#${filterId})`,
  } as CSSProperties
  const mainIconSize = `${iconSize}px`
  const inactiveIconSize = `${xIconSize}px`

  return (
    <div className={rootClassName} style={controlStyle}>
      <svg className={styles.filterSvg} aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={blurAmount} result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values={`1 0 0 0 0
                       0 1 0 0 0
                       0 0 1 0 0
                       0 0 0 ${gooey} -14`}
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <button
        type="button"
        className={styles.control}
        role="switch"
        aria-checked={currentActive}
        aria-label={ariaLabel}
        disabled={isDisabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.gooLayer} style={gooLayerStyle}>
          <span
            className={styles.sideBlob}
            style={{
              left: `${leftX - sideBlobRadius}px`,
              top: `${centerY - sideBlobRadius}px`,
              width: `${sideBlobRadius * 2}px`,
              height: `${sideBlobRadius * 2}px`,
              backgroundColor: trackColor,
            }}
          />
          <span
            className={styles.sideBlob}
            style={{
              left: `${rightX - sideBlobRadius}px`,
              top: `${centerY - sideBlobRadius}px`,
              width: `${sideBlobRadius * 2}px`,
              height: `${sideBlobRadius * 2}px`,
              backgroundColor: trackColor,
            }}
          />
          <span
            className={styles.bridge}
            style={{
              left: `${bridgeX}px`,
              top: `${bridgeY}px`,
              width: `${Math.max(0, bridgeWidth)}px`,
              height: `${bridgeRealHeight}px`,
              borderRadius: `${bridgeRealHeight / 2}px`,
              backgroundColor: trackColor,
            }}
          />
          <span
            className={styles.mainShadowBlob}
            style={{
              left: `${mainX - mainRx}px`,
              top: `${centerY - mainRy}px`,
              width: `${mainRx * 2}px`,
              height: `${mainRy * 2}px`,
              borderRadius: `${mainRy}px / ${mainRx}px`,
              backgroundColor: trackColor,
            }}
          />
        </div>

        <span
          className={styles.mainCore}
          style={{
            left: `${mainX - innerRx}px`,
            top: `${centerY - innerRy}px`,
            width: `${innerRx * 2}px`,
            height: `${innerRy * 2}px`,
            borderRadius: `${innerRy}px / ${innerRx}px`,
            backgroundColor: currentActive ? activeColor : inactiveColor,
            transition: dragging ? 'none' : undefined,
          }}
        />

        {showIcons ? (
          <span
            className={styles.iconContainer}
            style={{
              width: `${blobRadius * 2}px`,
              height: `${blobRadius * 2}px`,
              left: `${mainX - blobRadius}px`,
              top: `${centerY - blobRadius}px`,
              transform: `translateX(${iconTranslateX}px) scale(${iconScaleX}, ${iconScaleY})`,
              transition: dragging ? 'none' : undefined,
            }}
          >
            <span
              className={styles.iconActive}
              style={{
                opacity: activeOpacity,
                transform: `scale(${interpolate(progress, [0.6, 1], [0.5, 1])})`,
                fontSize: mainIconSize,
                color: iconTint,
              }}
            >
              {renderActiveIcon ?? '✓'}
            </span>
            <span
              className={styles.iconInactive}
              style={{
                opacity: inactiveOpacity,
                transform: `scale(${interpolate(progress, [0, 0.4], [1, 0.5])})`,
                fontSize: inactiveIconSize,
                color: iconTint,
              }}
            >
              {renderInactiveIcon ?? '×'}
            </span>
          </span>
        ) : null}
      </button>
    </div>
  )
}

export default GooeySwitch
