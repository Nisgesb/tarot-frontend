import type { CSSProperties, ReactNode } from 'react'
import { GlassSurface, type GlassSurfaceProps } from './library/GlassSurface/GlassSurface'
import styles from './GlassPanel.module.css'

type GlassPanelProps = Omit<
  GlassSurfaceProps,
  'children' | 'style' | 'className' | 'contentClassName' | 'contentStyle'
> & {
  children?: ReactNode
  className?: string
  contentClassName?: string
  style?: CSSProperties
  contentStyle?: CSSProperties
  fill?: boolean
}

export function GlassPanel({
  children,
  width = '100%',
  height = 'auto',
  borderRadius = 28,
  brightness = 58,
  opacity = 0.84,
  blur = 10,
  displace = 0,
  backgroundOpacity = 0.14,
  saturation = 1.28,
  distortionScale = -160,
  redOffset = 0,
  greenOffset = 12,
  blueOffset = 22,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  className = '',
  contentClassName = '',
  style,
  contentStyle,
  fill = false,
}: GlassPanelProps) {
  const panelClassName = [styles.panel, fill ? styles.panelFill : '', className]
    .filter(Boolean)
    .join(' ')
  const contentClassNames = [styles.content, fill ? styles.contentFill : '', contentClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <GlassSurface
      width={width}
      height={height}
      borderRadius={borderRadius}
      brightness={brightness}
      opacity={opacity}
      blur={blur}
      displace={displace}
      backgroundOpacity={backgroundOpacity}
      saturation={saturation}
      distortionScale={distortionScale}
      redOffset={redOffset}
      greenOffset={greenOffset}
      blueOffset={blueOffset}
      xChannel={xChannel}
      yChannel={yChannel}
      mixBlendMode={mixBlendMode}
      className={panelClassName}
      contentClassName={contentClassNames}
      style={style}
      contentStyle={contentStyle}
    >
      {children}
    </GlassSurface>
  )
}

export default GlassPanel
