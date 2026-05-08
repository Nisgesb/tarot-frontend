import * as THREE from 'three'
import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, createPortal, type ThreeElements, useFrame, useThree } from '@react-three/fiber'
import {
  Image,
  MeshTransmissionMaterial,
  Preload,
  Scroll,
  ScrollControls,
  Text,
  useFBO,
  useGLTF,
  useScroll,
} from '@react-three/drei'
import { easing } from 'maath'

export type FluidGlassMode = 'lens' | 'bar' | 'cube'

export type FluidGlassNavItem = {
  label: string
  link: string
}

export type FluidGlassMaterialProps = {
  scale?: number
  ior?: number
  thickness?: number
  anisotropy?: number
  chromaticAberration?: number
  [key: string]: unknown
}

export type FluidGlassBarProps = FluidGlassMaterialProps & {
  navItems?: FluidGlassNavItem[]
}

export type FluidGlassProps = {
  mode?: FluidGlassMode
  lensProps?: FluidGlassMaterialProps
  barProps?: FluidGlassBarProps
  cubeProps?: FluidGlassMaterialProps
  showDemoContent?: boolean
  ambientMode?: 'none' | 'tarot'
  clearColor?: THREE.ColorRepresentation
}

const MODEL_PATHS = {
  lens: '/library/fluid-glass/3d/lens.glb',
  bar: '/library/fluid-glass/3d/bar.glb',
  cube: '/library/fluid-glass/3d/cube.glb',
} as const

const IMAGE_PATHS = {
  first: '/library/fluid-glass/demo/cs1.webp',
  second: '/library/fluid-glass/demo/cs2.webp',
  third: '/library/fluid-glass/demo/cs3.webp',
} as const

const DEFAULT_BAR_NAV_ITEMS: FluidGlassNavItem[] = [
  { label: 'Overview', link: '' },
  { label: 'Stories', link: '' },
  { label: 'Contact', link: '' },
]

const NAV_DEVICE_CONFIG = {
  mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
  tablet: { max: 1023, spacing: 0.24, fontSize: 0.045 },
  desktop: { max: Infinity, spacing: 0.3, fontSize: 0.045 },
} as const

const TYPO_DEVICE_CONFIG = {
  mobile: { fontSize: 0.2 },
  tablet: { fontSize: 0.4 },
  desktop: { fontSize: 0.6 },
} as const

type MeshProps = ThreeElements['mesh']

type ModeWrapperProps = MeshProps & {
  children?: ReactNode
  glb: string
  geometryKey: string
  lockToBottom?: boolean
  followPointer?: boolean
  modeProps?: FluidGlassMaterialProps
  clearColor?: THREE.ColorRepresentation
}

type GLTFNodes = {
  nodes: Record<string, THREE.Object3D>
}

function pickGeometry(nodes: Record<string, THREE.Object3D>, geometryKey: string) {
  const node = nodes[geometryKey]

  if (!node || !(node instanceof THREE.Mesh)) {
    return undefined
  }

  return node.geometry
}

function setImageZoom(object: THREE.Object3D | undefined, zoom: number) {
  if (!object || !(object instanceof THREE.Mesh)) {
    return
  }

  const material = object.material

  if (Array.isArray(material)) {
    material.forEach((single) => {
      const mutable = single as THREE.Material & { zoom?: number }
      if (typeof mutable.zoom === 'number') {
        mutable.zoom = zoom
      }
    })
    return
  }

  const mutable = material as THREE.Material & { zoom?: number }
  if (typeof mutable.zoom === 'number') {
    mutable.zoom = zoom
  }
}

export function FluidGlass({
  mode = 'lens',
  lensProps = {},
  barProps = {},
  cubeProps = {},
  showDemoContent = true,
  ambientMode = 'tarot',
  clearColor = '#160f28',
}: FluidGlassProps) {
  const Wrapper = mode === 'bar' ? Bar : mode === 'cube' ? Cube : Lens
  const rawOverrides = mode === 'bar' ? barProps : mode === 'cube' ? cubeProps : lensProps

  const { navItems = DEFAULT_BAR_NAV_ITEMS, ...modeProps } = rawOverrides as FluidGlassBarProps

  if (!showDemoContent) {
    return (
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
        <Wrapper modeProps={modeProps} clearColor={clearColor}>
          {ambientMode === 'tarot' ? <AmbientBackdrop mode={mode} /> : null}
          <Preload />
        </Wrapper>
      </Canvas>
    )
  }

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
      <ScrollControls damping={0.2} pages={3} distance={0.4}>
        {mode === 'bar' ? <NavItems items={navItems} /> : null}
        <Wrapper modeProps={modeProps} clearColor={clearColor}>
          <Scroll>
            <Typography />
            <Images />
          </Scroll>
          <Scroll html />
          <Preload />
        </Wrapper>
      </ScrollControls>
    </Canvas>
  )
}

const ModeWrapper = memo(function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps = {},
  clearColor = '#160f28',
  ...props
}: ModeWrapperProps) {
  const ref = useRef<THREE.Mesh>(null)
  const { nodes } = useGLTF(glb) as unknown as GLTFNodes
  const buffer = useFBO()
  const { viewport: vp } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  const geoWidthRef = useRef(1)

  const geometry = pickGeometry(nodes, geometryKey)

  useEffect(() => {
    if (!geometry) {
      return
    }

    geometry.computeBoundingBox()
    const boundingBox = geometry.boundingBox

    if (!boundingBox) {
      return
    }

    geoWidthRef.current = boundingBox.max.x - boundingBox.min.x || 1
  }, [geometry])

  useFrame((state, delta) => {
    const meshRef = ref.current

    if (!meshRef) {
      return
    }

    const { gl, viewport, pointer, camera } = state
    const currentViewport = viewport.getCurrentViewport(camera, [0, 0, 15])

    const destX = followPointer ? (pointer.x * currentViewport.width) / 2 : 0
    const destY = lockToBottom
      ? -currentViewport.height / 2 + 0.2
      : followPointer
        ? (pointer.y * currentViewport.height) / 2
        : 0

    easing.damp3(meshRef.position, [destX, destY, 15], 0.15, delta)

    if (modeProps.scale == null) {
      const maxWorld = currentViewport.width * 0.9
      const desired = maxWorld / geoWidthRef.current
      meshRef.scale.setScalar(Math.min(0.15, desired))
    }

    gl.setRenderTarget(buffer)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.setClearColor(clearColor, 1)
  })

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = modeProps

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      {geometry ? (
        <mesh
          ref={ref}
          scale={scale ?? 0.15}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={geometry}
          {...props}
        >
          <MeshTransmissionMaterial
            buffer={buffer.texture}
            ior={ior ?? 1.15}
            thickness={thickness ?? 5}
            anisotropy={anisotropy ?? 0.01}
            chromaticAberration={chromaticAberration ?? 0.1}
            {...(typeof extraMat === 'object' && extraMat !== null
              ? (extraMat as Record<string, unknown>)
              : {})}
          />
        </mesh>
      ) : null}
    </>
  )
})

function Lens({
  modeProps,
  clearColor,
  ...props
}: { modeProps?: FluidGlassMaterialProps; clearColor?: THREE.ColorRepresentation } & MeshProps) {
  return (
    <ModeWrapper
      glb={MODEL_PATHS.lens}
      geometryKey="Cylinder"
      followPointer
      modeProps={modeProps}
      clearColor={clearColor}
      {...props}
    />
  )
}

function Cube({
  modeProps,
  clearColor,
  ...props
}: { modeProps?: FluidGlassMaterialProps; clearColor?: THREE.ColorRepresentation } & MeshProps) {
  return (
    <ModeWrapper
      glb={MODEL_PATHS.cube}
      geometryKey="Cube"
      followPointer
      modeProps={modeProps}
      clearColor={clearColor}
      {...props}
    />
  )
}

function Bar({
  modeProps = {},
  clearColor,
  ...props
}: { modeProps?: FluidGlassMaterialProps; clearColor?: THREE.ColorRepresentation } & MeshProps) {
  const defaultMat = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 0.25,
  }

  return (
    <ModeWrapper
      glb={MODEL_PATHS.bar}
      geometryKey="Cube"
      lockToBottom
      followPointer={false}
      modeProps={{ ...defaultMat, ...modeProps }}
      clearColor={clearColor}
      {...props}
    />
  )
}

function AmbientBackdrop({ mode }: { mode: FluidGlassMode }) {
  const depth = mode === 'bar' ? 4 : 0
  const accentOpacity = mode === 'bar' ? 0.34 : 0.28

  return (
    <group>
      <mesh position={[0, 0, depth - 3]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial color="#140d25" />
      </mesh>

      <mesh position={[-2.8, 0.8, depth]}>
        <planeGeometry args={[7.4, 8.6]} />
        <meshBasicMaterial color="#6f5bff" transparent opacity={accentOpacity} />
      </mesh>

      <mesh position={[3, 0.2, depth + 0.8]}>
        <planeGeometry args={[6.8, 7.4]} />
        <meshBasicMaterial color="#9b72ff" transparent opacity={0.22} />
      </mesh>

      <mesh position={[0.4, -2.6, depth + 1.2]}>
        <planeGeometry args={[10.2, 3.8]} />
        <meshBasicMaterial color="#59a0ff" transparent opacity={0.2} />
      </mesh>

      <mesh position={[-3.4, -1.8, depth + 2]}>
        <planeGeometry args={[4.2, 4.2]} />
        <meshBasicMaterial color="#ffd3f2" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

function NavItems({ items }: { items: FluidGlassNavItem[] }) {
  const group = useRef<THREE.Group>(null)
  const { viewport, camera } = useThree()

  const [device, setDevice] = useState<keyof typeof NAV_DEVICE_CONFIG>(() => {
    const width = window.innerWidth
    return width <= NAV_DEVICE_CONFIG.mobile.max
      ? 'mobile'
      : width <= NAV_DEVICE_CONFIG.tablet.max
        ? 'tablet'
        : 'desktop'
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setDevice(
        width <= NAV_DEVICE_CONFIG.mobile.max
          ? 'mobile'
          : width <= NAV_DEVICE_CONFIG.tablet.max
            ? 'tablet'
            : 'desktop',
      )
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  const { spacing, fontSize } = NAV_DEVICE_CONFIG[device]

  useFrame(() => {
    if (!group.current) {
      return
    }

    const currentViewport = viewport.getCurrentViewport(camera, [0, 0, 15])
    group.current.position.set(0, -currentViewport.height / 2 + 0.2, 15.1)

    group.current.children.forEach((child, index) => {
      child.position.x = (index - (items.length - 1) / 2) * spacing
    })
  })

  const handleNavigate = (link: string) => {
    if (!link) {
      return
    }

    window.location.assign(link)
  }

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          renderOrder={10}
          onClick={(event) => {
            event.stopPropagation()
            handleNavigate(link)
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          {label}
        </Text>
      ))}
    </group>
  )
}

function Images() {
  const group = useRef<THREE.Group>(null)
  const data = useScroll()
  const { height } = useThree((state) => state.viewport)

  useFrame(() => {
    if (!group.current || group.current.children.length < 5) {
      return
    }

    setImageZoom(group.current.children[0], 1 + data.range(0, 1 / 3) / 3)
    setImageZoom(group.current.children[1], 1 + data.range(0, 1 / 3) / 3)
    setImageZoom(group.current.children[2], 1 + data.range(1.15 / 3, 1 / 3) / 2)
    setImageZoom(group.current.children[3], 1 + data.range(1.15 / 3, 1 / 3) / 2)
    setImageZoom(group.current.children[4], 1 + data.range(1.15 / 3, 1 / 3) / 2)
  })

  return (
    <group ref={group}>
      <Image position={[-2, 0, 0]} scale={[3, height / 1.1]} url={IMAGE_PATHS.first} />
      <Image position={[2, 0, 3]} scale={3} url={IMAGE_PATHS.second} />
      <Image position={[-2.05, -height, 6]} scale={[1, 3]} url={IMAGE_PATHS.third} />
      <Image position={[-0.6, -height, 9]} scale={[1, 2]} url={IMAGE_PATHS.first} />
      <Image position={[0.75, -height, 10.5]} scale={1.5} url={IMAGE_PATHS.second} />
    </group>
  )
}

function Typography() {
  const [device, setDevice] = useState<keyof typeof TYPO_DEVICE_CONFIG>(() => {
    const width = window.innerWidth
    return width <= 639 ? 'mobile' : width <= 1023 ? 'tablet' : 'desktop'
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setDevice(width <= 639 ? 'mobile' : width <= 1023 ? 'tablet' : 'desktop')
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { fontSize } = TYPO_DEVICE_CONFIG[device]

  return (
    <Text
      position={[0, 0, 12]}
      fontSize={fontSize}
      letterSpacing={-0.05}
      outlineWidth={0}
      outlineBlur="20%"
      outlineColor="#000"
      outlineOpacity={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      React Bits
    </Text>
  )
}

useGLTF.preload(MODEL_PATHS.lens)
useGLTF.preload(MODEL_PATHS.bar)
useGLTF.preload(MODEL_PATHS.cube)

export default FluidGlass
