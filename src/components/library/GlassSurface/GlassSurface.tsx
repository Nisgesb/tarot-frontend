import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import styles from './GlassSurface.module.css'

type GlassChannel = 'R' | 'G' | 'B'

type GlassSurfaceStyle = CSSProperties & {
  '--glass-frost'?: number
  '--glass-saturation'?: number
  '--filter-id'?: string
}

export type GlassSurfaceProps = {
  children?: ReactNode
  width?: number | string
  height?: number | string
  borderRadius?: number
  borderWidth?: number
  brightness?: number
  opacity?: number
  blur?: number
  displace?: number
  backgroundOpacity?: number
  saturation?: number
  distortionScale?: number
  redOffset?: number
  greenOffset?: number
  blueOffset?: number
  xChannel?: GlassChannel
  yChannel?: GlassChannel
  mixBlendMode?: CSSProperties['mixBlendMode']
  className?: string
  style?: CSSProperties
  contentClassName?: string
  contentStyle?: CSSProperties
}

function supportsSvgFilters(filterId: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isFirefox = /Firefox/.test(navigator.userAgent)

  if (isWebkit || isFirefox) {
    return false
  }

  const div = document.createElement('div')
  div.style.backdropFilter = `url(#${filterId})`

  return div.style.backdropFilter !== ''
}

export function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  className = '',
  style = {},
  contentClassName = '',
  contentStyle,
}: GlassSurfaceProps) {
  const uniqueId = useId().replace(/:/g, '-')
  const filterId = `glass-filter-${uniqueId}`
  const redGradId = `red-grad-${uniqueId}`
  const blueGradId = `blue-grad-${uniqueId}`

  // Resolve support on first render to avoid one-frame fallback flash.
  const [svgSupported, setSvgSupported] = useState(() => supportsSvgFilters(filterId))

  const containerRef = useRef<HTMLDivElement>(null)
  const feImageRef = useRef<SVGFEImageElement>(null)
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null)
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null)
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null)
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null)

  const generateDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    const actualWidth = rect?.width || 400
    const actualHeight = rect?.height || 200
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5)

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode:${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`
  }, [blueGradId, borderRadius, borderWidth, blur, brightness, mixBlendMode, opacity, redGradId])

  const updateDisplacementMap = useCallback(() => {
    if (!feImageRef.current) {
      return
    }

    feImageRef.current.setAttribute('href', generateDisplacementMap())
  }, [generateDisplacementMap])

  useEffect(() => {
    updateDisplacementMap()

    const channels = [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ]

    channels.forEach(({ ref, offset }) => {
      if (!ref.current) {
        return
      }

      ref.current.setAttribute('scale', String(distortionScale + offset))
      ref.current.setAttribute('xChannelSelector', xChannel)
      ref.current.setAttribute('yChannelSelector', yChannel)
    })

    if (gaussianBlurRef.current) {
      gaussianBlurRef.current.setAttribute('stdDeviation', String(displace))
    }
  }, [
    displace,
    distortionScale,
    greenOffset,
    redOffset,
    blueOffset,
    xChannel,
    yChannel,
    updateDisplacementMap,
  ])

  useEffect(() => {
    const container = containerRef.current

    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      window.setTimeout(() => {
        updateDisplacementMap()
      }, 0)
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [updateDisplacementMap])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateDisplacementMap()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [updateDisplacementMap, width, height])

  useEffect(() => {
    setSvgSupported(supportsSvgFilters(filterId))
  }, [filterId])

  const containerStyle: GlassSurfaceStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    '--filter-id': `url(#${filterId})`,
  }

  const composedClassName = [
    styles.glassSurface,
    svgSupported ? styles.glassSurfaceSvg : styles.glassSurfaceFallback,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={containerRef} className={composedClassName} style={containerStyle}>
      <svg className={styles.glassSurfaceFilter} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage
              ref={feImageRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />

            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />

            <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />

            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      <div
        className={[styles.glassSurfaceContent, contentClassName].filter(Boolean).join(' ')}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  )
}

export default GlassSurface
