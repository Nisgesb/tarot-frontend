import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BlurFilter,
  Container,
  Filter,
  ParticleContainer,
  Rectangle,
  Renderer,
  Sprite,
  Texture,
} from 'pixi.js'
import { loadLeonSans } from '../utils/leonLoader'
import type { LeonSansInstance } from '../utils/leonLoader'

const DROP_TEXTURE_URL = '/textures/drop-alpha.png'
const PARTICLE_TOTAL = 10000
const REVEAL_START_DELAY_MS = 100
const PIXEL_RATIO = 2
const MIN_BASE_SIZE = 8
const DEFAULT_BASE_SIZE = 93

type DebugColor = 'white' | 'black' | 'red'

interface DebugSettings {
  text: string
  baseSize: number
  tracking: number
  leading: number
  weight: number
  blur: number
  threshold: number
  color: DebugColor
  revealDuration: number
  revealDelayMs: number
}

const DEFAULT_DEBUG_SETTINGS: Omit<DebugSettings, 'text'> = {
  baseSize: DEFAULT_BASE_SIZE,
  tracking: 0,
  leading: 0.8,
  weight: 5.65,
  blur: 1.8,
  threshold: 0.23,
  color: 'white',
  revealDuration: 2930,
  revealDelayMs: 0.31,
}

const THRESHOLD_FRAGMENT = [
  'precision mediump float;',
  'varying vec2 vTextureCoord;',
  'uniform sampler2D uSampler;',
  'uniform float threshold;',
  'uniform float mr;',
  'uniform float mg;',
  'uniform float mb;',
  'void main(void)',
  '{',
  '    vec4 color = texture2D(uSampler, vTextureCoord);',
  '    vec3 mcolor = vec3(mr, mg, mb);',
  '    if (color.a > threshold) {',
  '       gl_FragColor = vec4(mcolor, 1.0);',
  '    } else {',
  '       gl_FragColor = vec4(vec3(0.0), 0.0);',
  '    }',
  '}',
].join('\n')

interface HeroHeadlineMetaballOverlayProps {
  text: string
  onUnsupported?: () => void
}

interface ParticleState {
  sprite: Sprite
  baseScale: number
  delayMs: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function easeOutCirc(value: number) {
  if (value <= 0) {
    return 0
  }
  if (value >= 1) {
    return 1
  }
  return Math.sqrt(1 - Math.pow(value - 1, 2))
}

function getResponsiveSize(baseSize: number, width: number, height: number) {
  let ratio = Math.sqrt(width * width + height * height) / 1800
  if (ratio > 1) {
    ratio = 1
  } else if (ratio < 0.5) {
    ratio = 0.5
  }

  return baseSize * ratio
}

function getResponsiveWeight(size: number) {
  const safeSize = clamp(size, MIN_BASE_SIZE, 1000)

  if (safeSize > 400) {
    return ((1.5 - 3) / (1000 - 400)) * (safeSize - 400) + 3
  }

  return ((3 - 6) / (400 - MIN_BASE_SIZE)) * (safeSize - MIN_BASE_SIZE) + 6
}

function getColorUniform(color: DebugColor) {
  if (color === 'red') {
    return { mr: 244 / 255, mg: 46 / 255, mb: 33 / 255 }
  }
  if (color === 'black') {
    return { mr: 0, mg: 0, mb: 0 }
  }
  return { mr: 1, mg: 1, mb: 1 }
}

async function ensureTexture(texture: Texture) {
  if (texture.baseTexture.valid) {
    return
  }

  await new Promise<void>((resolve) => {
    const handleReady = () => {
      resolve()
    }

    texture.baseTexture.once('loaded', handleReady)
    texture.baseTexture.once('error', handleReady)
  })
}

function destroyContainer(container: Container | null) {
  if (!container) {
    return
  }

  container.destroy({ children: true })
}

export function HeroHeadlineMetaballOverlay({
  text,
  onUnsupported,
}: HeroHeadlineMetaballOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onUnsupportedRef = useRef(onUnsupported)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(() => ({
    ...DEFAULT_DEBUG_SETTINGS,
    text,
  }))
  const debugSettingsRef = useRef(debugSettings)
  const runtimeControlRef = useRef<{
    applySettings: (options?: { replay?: boolean }) => void
    replay: () => void
  } | null>(null)

  useEffect(() => {
    setDebugSettings((previous) => {
      const next = {
        ...previous,
        text,
      }
      debugSettingsRef.current = next
      runtimeControlRef.current?.applySettings({ replay: true })
      return next
    })
  }, [text])

  useEffect(() => {
    onUnsupportedRef.current = onUnsupported
  }, [onUnsupported])

  useEffect(() => {
    debugSettingsRef.current = debugSettings
  }, [debugSettings])

  const updateDebugSettings = (
    patch: Partial<DebugSettings>,
    options?: { replay?: boolean },
  ) => {
    setDebugSettings((previous) => {
      const next = {
        ...previous,
        ...patch,
      }
      debugSettingsRef.current = next
      runtimeControlRef.current?.applySettings(options)
      return next
    })
  }

  const replayReveal = () => {
    runtimeControlRef.current?.replay()
  }

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return undefined
    }

    let disposed = false
    let rafId = 0
    let resizeRafId = 0
    let resizeObserver: ResizeObserver | null = null
    let renderer: Renderer | null = null
    let stage: Container | null = null
    let particleLayer: ParticleContainer | null = null
    let blurFilter: BlurFilter | null = null
    let thresholdFilter: Filter | null = null
    let thresholdUniforms: { threshold: number; mr: number; mg: number; mb: number } | null = null
    let leon: LeonSansInstance | null = null
    let leonUpdateHandler: (() => void) | null = null
    const particles: ParticleState[] = []
    let viewWidth = 0
    let viewHeight = 0
    let revealStartTime = 0
    let missingPathFrameCount = 0
    let forceSyncUntil = 0

    const reportUnsupported = () => {
      onUnsupportedRef.current?.()
    }

    const resetReveal = () => {
      revealStartTime = performance.now() + REVEAL_START_DELAY_MS
      for (let index = 0; index < particles.length; index += 1) {
        particles[index].sprite.scale.set(0)
      }
    }

    const updateParticles = () => {
      if (!leon || !particleLayer) {
        return
      }

      const total = Math.min(leon.paths.length, particles.length)
      if (total <= 0) {
        missingPathFrameCount += 1
        if (missingPathFrameCount > 90) {
          reportUnsupported()
        }
        return
      }

      missingPathFrameCount = 0
      const settings = debugSettingsRef.current
      const weight = settings.weight

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index]

        if (index < total) {
          const path = leon.paths[index]
          particle.baseScale = (path.type === 'a' ? weight * 0.025 : weight * 0.01) * leon.scale
          particle.delayMs = index * settings.revealDelayMs
          particle.sprite.x = path.x
          particle.sprite.y = path.y
          continue
        }

        particle.baseScale = 0
        particle.delayMs = 0
        particle.sprite.x = -1000
        particle.sprite.y = -1000
        particle.sprite.scale.set(0)
      }
    }

    const applyDebugSettings = (options?: { replay?: boolean }) => {
      const settings = debugSettingsRef.current

      if (blurFilter) {
        blurFilter.blur = settings.blur
      }

      if (thresholdUniforms) {
        thresholdUniforms.threshold = settings.threshold
        const color = getColorUniform(settings.color)
        thresholdUniforms.mr = color.mr
        thresholdUniforms.mg = color.mg
        thresholdUniforms.mb = color.mb
      }

      if (leon) {
        leon.text = settings.text
        leon.tracking = settings.tracking
        leon.leading = settings.leading
        leon.size = getResponsiveSize(settings.baseSize, viewWidth, viewHeight)
      }

      positionLeon()
      updateParticles()
      if (options?.replay) {
        forceSyncUntil = performance.now() + 500
        resetReveal()
      }
    }

    const positionLeon = () => {
      if (!leon) {
        return
      }

      const x = (viewWidth - leon.rect.w) / 2
      const y = (viewHeight - leon.rect.h) / 2
      leon.position(x, y)
    }

    const applyReveal = (time: number) => {
      const elapsed = time - revealStartTime
      const duration = Math.max(1, debugSettingsRef.current.revealDuration)
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index]
        if (particle.baseScale <= 0) {
          continue
        }

        const progress = clamp((elapsed - particle.delayMs) / duration, 0, 1)
        const scale = particle.baseScale * easeOutCirc(progress)
        particle.sprite.scale.set(scale)
      }
    }

    const resizeScene = () => {
      if (!renderer || !stage) {
        return
      }

      const rect = host.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.round(rect.width))
      const nextHeight = Math.max(1, Math.round(rect.height))

      viewWidth = nextWidth
      viewHeight = nextHeight
      renderer.resize(viewWidth, viewHeight)
      stage.filterArea = new Rectangle(0, 0, viewWidth, viewHeight)
      applyDebugSettings({ replay: true })
    }

    const tick = (time: number) => {
      if (disposed || !renderer || !stage) {
        return
      }

      positionLeon()
      if (time <= forceSyncUntil) {
        updateParticles()
      }
      applyReveal(time)

      renderer.render(stage)
      rafId = window.requestAnimationFrame(tick)
    }

    runtimeControlRef.current = {
      applySettings: (options) => {
        applyDebugSettings(options)
      },
      replay: () => {
        applyDebugSettings({ replay: true })
      },
    }

    const init = async () => {
      const LeonSans = await loadLeonSans()

      if (disposed) {
        return
      }

      if (!LeonSans) {
        reportUnsupported()
        return
      }

      const rect = host.getBoundingClientRect()
      viewWidth = Math.max(1, Math.round(rect.width))
      viewHeight = Math.max(1, Math.round(rect.height))

      try {
        renderer = new Renderer({
          width: viewWidth,
          height: viewHeight,
          antialias: true,
          autoDensity: true,
          resolution: PIXEL_RATIO,
          powerPreference: 'high-performance',
          backgroundAlpha: 0,
        })
      } catch {
        reportUnsupported()
        return
      }

      const canvas = renderer.view as HTMLCanvasElement
      canvas.className = 'hero-headline-metaball-canvas'
      host.appendChild(canvas)

      stage = new Container()
      stage.alpha = 1

      const settings = debugSettingsRef.current
      const color = getColorUniform(settings.color)

      blurFilter = new BlurFilter(settings.blur)
      blurFilter.autoFit = true
      thresholdUniforms = {
        threshold: settings.threshold,
        mr: color.mr,
        mg: color.mg,
        mb: color.mb,
      }
      thresholdFilter = new Filter(undefined, THRESHOLD_FRAGMENT, thresholdUniforms)

      stage.filters = [blurFilter, thresholdFilter]
      stage.filterArea = new Rectangle(0, 0, viewWidth, viewHeight)

      const texture = Texture.from(DROP_TEXTURE_URL)
      await ensureTexture(texture)

      if (disposed || !stage) {
        return
      }

      particleLayer = new ParticleContainer(PARTICLE_TOTAL, {
        position: true,
        scale: true,
        rotation: false,
        uvs: false,
        alpha: false,
        vertices: false,
      })
      stage.addChild(particleLayer)

      for (let index = 0; index < PARTICLE_TOTAL; index += 1) {
        const sprite = new Sprite(texture)
        sprite.anchor.set(0.5)
        sprite.x = viewWidth / 2
        sprite.y = viewHeight / 2
        sprite.scale.set(0)
        particleLayer.addChild(sprite)
        particles.push({
          sprite,
          baseScale: 0,
          delayMs: 0,
        })
      }

      leon = new LeonSans({
        text: settings.text,
        size: getResponsiveSize(settings.baseSize, viewWidth, viewHeight),
        weight: 700,
        pathGap: -1,
        isPath: true,
        tracking: settings.tracking,
        leading: settings.leading,
      })

      leonUpdateHandler = () => {
        updateParticles()
      }
      leon.on?.('update', leonUpdateHandler)

      resizeObserver = new ResizeObserver(() => {
        window.cancelAnimationFrame(resizeRafId)
        resizeRafId = window.requestAnimationFrame(resizeScene)
      })
      resizeObserver.observe(host)

      applyDebugSettings({ replay: true })
      rafId = window.requestAnimationFrame(tick)
    }

    void init().catch(() => {
      reportUnsupported()
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(rafId)
      window.cancelAnimationFrame(resizeRafId)
      resizeObserver?.disconnect()
      resizeObserver = null
      runtimeControlRef.current = null

      const view = renderer?.view as HTMLCanvasElement | undefined
      if (view && view.parentElement === host) {
        host.removeChild(view)
      }

      if (stage) {
        stage.filters = null
      }
      thresholdFilter?.destroy()
      blurFilter?.destroy()
      if (leon && leonUpdateHandler && leon.off) {
        leon.off('update', leonUpdateHandler)
      }
      destroyContainer(stage)
      renderer?.destroy(true)
      leon?.dispose?.()
    }
  }, [text])

  const debugControls = (
    <>
      <button
        type="button"
        className="metaball-debug-toggle"
        onClick={() => {
          setDebugOpen((value) => !value)
        }}
      >
        {debugOpen ? 'HIDE DEBUG' : 'DEBUG'}
      </button>

      {debugOpen ? (
        <div className="metaball-debug-panel">
          <div className="metaball-debug-title">METABALL DEBUG</div>

          <label className="metaball-debug-row">
            <span>Text</span>
            <textarea
              value={debugSettings.text}
              onChange={(event) => {
                updateDebugSettings({ text: event.target.value }, { replay: true })
              }}
              rows={2}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Size {Math.round(debugSettings.baseSize)}</span>
            <input
              type="range"
              min={MIN_BASE_SIZE}
              max={1000}
              step={1}
              value={debugSettings.baseSize}
              onChange={(event) => {
                const baseSize = Number(event.target.value)
                updateDebugSettings(
                  {
                    baseSize,
                    weight: getResponsiveWeight(baseSize),
                  },
                  { replay: true },
                )
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Tracking {debugSettings.tracking.toFixed(1)}</span>
            <input
              type="range"
              min={-6}
              max={10}
              step={0.1}
              value={debugSettings.tracking}
              onChange={(event) => {
                updateDebugSettings({ tracking: Number(event.target.value) }, { replay: true })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Leading {debugSettings.leading.toFixed(1)}</span>
            <input
              type="range"
              min={-8}
              max={10}
              step={0.1}
              value={debugSettings.leading}
              onChange={(event) => {
                updateDebugSettings({ leading: Number(event.target.value) }, { replay: true })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Weight {debugSettings.weight.toFixed(2)}</span>
            <input
              type="range"
              min={1}
              max={9}
              step={0.01}
              value={debugSettings.weight}
              onChange={(event) => {
                updateDebugSettings({ weight: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Blur {debugSettings.blur.toFixed(1)}</span>
            <input
              type="range"
              min={0}
              max={24}
              step={0.1}
              value={debugSettings.blur}
              onChange={(event) => {
                updateDebugSettings({ blur: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Threshold {debugSettings.threshold.toFixed(2)}</span>
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.01}
              value={debugSettings.threshold}
              onChange={(event) => {
                updateDebugSettings({ threshold: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Delay {debugSettings.revealDelayMs.toFixed(2)}ms</span>
            <input
              type="range"
              min={0}
              max={4}
              step={0.01}
              value={debugSettings.revealDelayMs}
              onChange={(event) => {
                updateDebugSettings({ revealDelayMs: Number(event.target.value) }, { replay: true })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Duration {Math.round(debugSettings.revealDuration)}ms</span>
            <input
              type="range"
              min={300}
              max={6000}
              step={10}
              value={debugSettings.revealDuration}
              onChange={(event) => {
                updateDebugSettings({ revealDuration: Number(event.target.value) }, { replay: true })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>Color</span>
            <select
              value={debugSettings.color}
              onChange={(event) => {
                updateDebugSettings({ color: event.target.value as DebugColor })
              }}
            >
              <option value="white">white</option>
              <option value="black">black</option>
              <option value="red">red</option>
            </select>
          </label>

          <button
            type="button"
            className="metaball-debug-replay"
            onClick={() => {
              replayReveal()
            }}
          >
            Replay
          </button>
        </div>
      ) : null}
    </>
  )

  return (
    <>
      <div className="hero-headline-metaball" ref={hostRef} aria-hidden="true" />
      {typeof document !== 'undefined'
        ? createPortal(debugControls, document.body)
        : debugControls}
    </>
  )
}
