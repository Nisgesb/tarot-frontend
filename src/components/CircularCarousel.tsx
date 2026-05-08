import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react'
import styles from './CircularCarousel.module.css'

const DEFAULT_WIDTH_RATIO = 0.75
const DEFAULT_SPACING = 20

export type CircularCarouselProps<ItemT> = {
  data: readonly ItemT[]
  renderItem: (info: { item: ItemT; index: number }) => ReactNode
  keyExtractor?: (item: ItemT, index: number) => string
  spacing?: number
  itemWidth?: number
  horizontalSpacing?: number
  onIndexChange?: (index: number) => void
  className?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function interpolate(value: number, input: number[], output: number[]) {
  if (input.length !== output.length || input.length === 0) {
    return 0
  }

  if (value <= input[0]) {
    return output[0]
  }

  if (value >= input[input.length - 1]) {
    return output[output.length - 1]
  }

  for (let index = 0; index < input.length - 1; index += 1) {
    const start = input[index]
    const end = input[index + 1]

    if (value >= start && value <= end) {
      const progress = (value - start) / (end - start)
      return output[index] + (output[index + 1] - output[index]) * progress
    }
  }

  return output[output.length - 1]
}

export function CircularCarousel<ItemT>({
  data,
  renderItem,
  keyExtractor,
  spacing = DEFAULT_SPACING,
  itemWidth,
  horizontalSpacing,
  onIndexChange,
  className = '',
}: CircularCarouselProps<ItemT>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const previousIndexRef = useRef(-1)
  const frameRef = useRef<number | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport) {
      return
    }

    const updateWidth = () => {
      setViewportWidth(viewport.clientWidth)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)

      return () => {
        window.removeEventListener('resize', updateWidth)
      }
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(viewport)

    return () => {
      observer.disconnect()
    }
  }, [])

  const resolvedItemWidth = useMemo(() => {
    if (itemWidth) {
      return itemWidth
    }

    if (viewportWidth <= 0) {
      return 320
    }

    return viewportWidth * DEFAULT_WIDTH_RATIO
  }, [itemWidth, viewportWidth])

  const resolvedHorizontalSpacing = useMemo(() => {
    if (horizontalSpacing != null) {
      return horizontalSpacing
    }

    return Math.max((viewportWidth - resolvedItemWidth) / 2, 0)
  }, [horizontalSpacing, resolvedItemWidth, viewportWidth])

  const itemWidthWithSpacing = resolvedItemWidth + spacing
  const scrollProgress = itemWidthWithSpacing > 0 ? scrollLeft / itemWidthWithSpacing : 0

  useEffect(() => {
    const currentIndex = clamp(Math.round(scrollProgress), 0, Math.max(data.length - 1, 0))

    if (currentIndex !== previousIndexRef.current) {
      if (previousIndexRef.current !== -1) {
        onIndexChange?.(currentIndex)
      }

      previousIndexRef.current = currentIndex
    }
  }, [data.length, onIndexChange, scrollProgress])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const nextScrollLeft = event.currentTarget.scrollLeft

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setScrollLeft(nextScrollLeft)
      frameRef.current = null
    })
  }, [])

  const scrollToIndex = useCallback(
    (index: number) => {
      const viewport = viewportRef.current

      if (!viewport) {
        return
      }

      viewport.scrollTo({
        left: index * itemWidthWithSpacing,
        behavior: 'smooth',
      })
    },
    [itemWidthWithSpacing],
  )

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        onScroll={handleScroll}
        data-circular-carousel-viewport="true"
        style={
          {
            '--carousel-side-spacing': `${resolvedHorizontalSpacing}px`,
            '--carousel-spacing': `${spacing}px`,
          } as CSSProperties
        }
        aria-roledescription="carousel"
      >
        <div className={styles.track}>
          {data.map((item, index) => {
            const distance = clamp(Math.abs(index - scrollProgress), 0, 2)
            const signedDistance = clamp(index - scrollProgress, -2, 2)
            const translateY = interpolate(distance, [0, 1, 2], [0, resolvedItemWidth / 8, resolvedItemWidth / 4])
            const opacity = interpolate(distance, [0, 1, 2], [1, 0.8, 0.5])
            const scale = interpolate(distance, [0, 1, 2], [1, 0.85, 0.75])
            const blur = interpolate(distance, [0, 1, 2], [0, 12, 24])
            const rotateZ = clamp(-signedDistance * 20, -40, 40)

            return (
              <div
                key={keyExtractor?.(item, index) ?? String(index)}
                className={styles.itemContainer}
                data-carousel-index={index}
                style={{
                  width: `${resolvedItemWidth}px`,
                  opacity,
                  transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotateZ}deg)`,
                }}
                onClick={() => scrollToIndex(index)}
              >
                <div
                  className={styles.contentWrapper}
                  style={{
                    filter: `blur(${blur}px)`,
                  }}
                >
                  {renderItem({ item, index })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CircularCarousel
