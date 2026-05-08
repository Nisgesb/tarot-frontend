import { FluidGlass, type FluidGlassBarProps, type FluidGlassMode } from './library/FluidGlass/FluidGlass'
import styles from './FluidGlassBackdrop.module.css'

interface FluidGlassBackdropProps {
  className?: string
  mode?: FluidGlassMode
}

const BAR_PROPS: FluidGlassBarProps = {
  ior: 1.12,
  thickness: 9,
  chromaticAberration: 0.06,
  anisotropy: 0.02,
  navItems: [],
}

const LENS_PROPS = {
  scale: 0.22,
  ior: 1.15,
  thickness: 5,
  chromaticAberration: 0.08,
  anisotropy: 0.01,
}

const CUBE_PROPS = {
  scale: 0.18,
  ior: 1.18,
  thickness: 5,
  chromaticAberration: 0.08,
  anisotropy: 0.02,
}

export function FluidGlassBackdrop({
  className = '',
  mode = 'bar',
}: FluidGlassBackdropProps) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')} aria-hidden="true">
      <FluidGlass
        mode={mode}
        showDemoContent={false}
        ambientMode="tarot"
        clearColor="#140d25"
        lensProps={LENS_PROPS}
        barProps={BAR_PROPS}
        cubeProps={CUBE_PROPS}
      />
    </div>
  )
}

export default FluidGlassBackdrop
