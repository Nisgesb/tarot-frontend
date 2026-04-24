const DEGREE = Math.PI / 180

const toRadians = (degrees: number) => degrees * DEGREE
const toDegrees = (radians: number) => radians / DEGREE
const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360

export type ArcSide = 'lower' | 'upper'

export interface ArcLayoutConfig {
  count: number
  radius: number
  startAngle: number
  endAngle: number
  centerX: number
  centerY: number
  arcSide: ArcSide
  rotationScale?: number
}

export interface ArcLayoutPoint {
  index: number
  x: number
  y: number
  rotation: number
  slotIndex?: number
  outward: {
    x: number
    y: number
  }
  depthBias: number
  relative?: number
}

export function wrapIndex(index: number, count: number) {
  if (count <= 0) {
    return 0
  }

  return ((index % count) + count) % count
}

export function shortestCircularDelta(index: number, centerIndex: number, count: number) {
  if (count <= 0) {
    return 0
  }

  const half = count / 2
  let delta = index - centerIndex

  while (delta <= -half) {
    delta += count
  }

  while (delta > half) {
    delta -= count
  }

  return delta
}

function signedAngleDelta(from: number, to: number) {
  let delta = normalizeDegrees(to) - normalizeDegrees(from)

  if (delta > 180) {
    delta -= 360
  }

  if (delta < -180) {
    delta += 360
  }

  return delta
}

function getCardRotation(angleDegrees: number, arcSide: ArcSide, rotationScale = 1) {
  const middleAngle = arcSide === 'lower' ? 90 : 270
  const deltaFromMiddle = signedAngleDelta(middleAngle, angleDegrees)

  const baseRotation = arcSide === 'lower' ? -deltaFromMiddle : deltaFromMiddle

  return baseRotation * rotationScale
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t

export function createArcLayout(config: ArcLayoutConfig) {
  const { count, radius, startAngle, endAngle, centerX, centerY, arcSide, rotationScale = 1 } = config
  const start = toRadians(startAngle)
  const end = toRadians(endAngle)
  const midpoint = (count - 1) / 2

  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1)
    const angle = lerp(start, end, t)
    const angleDegrees = toDegrees(angle)
    const normalX = Math.cos(angle)
    const normalY = Math.sin(angle)

    return {
      index,
      x: centerX + normalX * radius,
      y: centerY + normalY * radius,
      rotation: getCardRotation(angleDegrees, arcSide, rotationScale),
      outward: {
        x: normalX,
        y: normalY,
      },
      depthBias: count - Math.abs(index - midpoint),
    } satisfies ArcLayoutPoint
  })
}

export interface WindowedArcLayoutConfig extends ArcLayoutConfig {
  centerIndex: number
  visibleCount: number
  overscan?: number
}

export interface WindowSlotLayoutConfig extends ArcLayoutConfig {
  centerIndex: number
  visibleCount: number
  slotOffset: number
  depthBias?: number
  slotIndex?: number
}

export interface WindowTrackSlotLayoutConfig extends Omit<ArcLayoutConfig, 'count'> {
  trackIndex: number
  slotCount: number
  slotIndex: number
  visibleCount: number
  depthBias?: number
}

export function getWindowTrackSlotLayout(config: WindowTrackSlotLayoutConfig): ArcLayoutPoint {
  const {
    trackIndex,
    slotCount,
    slotIndex,
    visibleCount,
    radius,
    startAngle,
    endAngle,
    centerX,
    centerY,
    arcSide,
    rotationScale = 1,
    depthBias,
  } = config

  const safeVisibleCount = Math.max(3, visibleCount | 0)
  const stepAngle = (endAngle - startAngle) / (safeVisibleCount - 1)
  const middleAngle = lerp(startAngle, endAngle, 0.5)
  const relative = shortestCircularDelta(slotIndex, trackIndex, slotCount)
  const angleDegrees = middleAngle + relative * stepAngle
  const angle = toRadians(angleDegrees)
  const outwardX = Math.cos(angle)
  const outwardY = Math.sin(angle)

  return {
    index: slotIndex,
    relative,
    slotIndex,
    x: centerX + outwardX * radius,
    y: centerY + outwardY * radius,
    rotation: getCardRotation(angleDegrees, arcSide, rotationScale),
    outward: {
      x: outwardX,
      y: outwardY,
    },
    depthBias: depthBias ?? safeVisibleCount - Math.abs(relative),
  }
}

export function getWindowSlotLayout(config: WindowSlotLayoutConfig): ArcLayoutPoint {
  const {
    centerIndex,
    visibleCount,
    slotOffset,
    radius,
    startAngle,
    endAngle,
    centerX,
    centerY,
    arcSide,
    rotationScale = 1,
    depthBias,
    slotIndex,
  } = config
  const safeVisibleCount = Math.max(3, visibleCount | 0)
  const stepAngle = (endAngle - startAngle) / (safeVisibleCount - 1)
  const middleAngle = lerp(startAngle, endAngle, 0.5)
  const anchor = Math.floor(centerIndex)
  const fraction = centerIndex - anchor
  const relative = slotOffset - fraction
  const angleDegrees = middleAngle + relative * stepAngle
  const angle = toRadians(angleDegrees)
  const outwardX = Math.cos(angle)
  const outwardY = Math.sin(angle)

  return {
    index: 0,
    relative,
    slotIndex,
    x: centerX + outwardX * radius,
    y: centerY + outwardY * radius,
    rotation: getCardRotation(angleDegrees, arcSide, rotationScale),
    outward: {
      x: outwardX,
      y: outwardY,
    },
    depthBias: depthBias ?? safeVisibleCount - Math.abs(relative),
  }
}

export function createWindowedArcLayout(config: WindowedArcLayoutConfig) {
  const {
    count,
    centerIndex,
    visibleCount,
    overscan = 0,
    radius,
    startAngle,
    endAngle,
    centerX,
    centerY,
    arcSide,
    rotationScale = 1,
  } = config

  const safeVisibleCount = Math.max(3, visibleCount | 0)
  const safeOverscan = Math.max(0, overscan | 0)
  const baseRenderCount = safeVisibleCount + safeOverscan * 2
  const renderCount = baseRenderCount % 2 === 0 ? baseRenderCount + 1 : baseRenderCount
  const halfWindow = (renderCount - 1) / 2
  const anchor = Math.floor(centerIndex)
  const items = Array.from({ length: renderCount }, (_, slotIndex) => {
    const logicalOffset = slotIndex - halfWindow
    const index = wrapIndex(anchor + logicalOffset, count)
    const point = getWindowSlotLayout({
      count,
      radius,
      startAngle,
      endAngle,
      centerX,
      centerY,
      arcSide,
      rotationScale,
      centerIndex,
      visibleCount: safeVisibleCount,
      slotOffset: logicalOffset,
      depthBias: renderCount - Math.abs(logicalOffset),
      slotIndex,
    })

    return {
      ...point,
      index,
    } satisfies ArcLayoutPoint
  })

  return items
}
