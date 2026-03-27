import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AudioToggle } from './components/AudioToggle'
import { DreamPortal } from './components/DreamPortal'
import { HeroOverlay } from './components/HeroOverlay'
import { MotionControlDock } from './components/MotionControlDock'
import { MotionDebugPanel } from './components/MotionDebugPanel'
import { MotionPermissionPrompt } from './components/MotionPermissionPrompt'
import { NebulaBackground } from './components/NebulaBackground'
import type { NebulaCompositionFrame } from './components/NebulaBackground'
import { PortalTransition } from './components/PortalTransition'
import type { PortalTransitionOrigin } from './components/PortalTransition'
import { StarField } from './components/StarField'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useKeyboardAwareViewport } from './hooks/useKeyboardAwareViewport'
import { useEnterTransition } from './hooks/useEnterTransition'
import { DEFAULT_MOTION_TUNING, useMotionInput } from './hooks/useMotionInput'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useSceneMachine } from './hooks/useSceneMachine'
import { useSafeAreaInsets } from './hooks/useSafeAreaInsets'
import { useViewportProfile } from './hooks/useViewportProfile'
import { MobileAppShell } from './layout/MobileAppShell'
import type { MotionProfile, MotionTuning } from './motion/types'
import { exportCanvasResult } from './platform/exportShareAdapter'
import { createDreamRecordFromRefined } from './services/dreamGenerationService'
import { getGalleryDreams } from './services/galleryService'
import {
  loadDreamRecords,
  saveDreamRecords,
  upsertDreamRecord,
} from './services/dreamStorageService'
import { DreamEntryScene } from './scenes/DreamEntryScene'
import { DreamGalleryScene } from './scenes/DreamGalleryScene'
import { DreamInsightsLoader } from './scenes/DreamInsightsLoader'
import { DreamResultScene } from './scenes/DreamResultScene'
import { MyDreamsScene } from './scenes/MyDreamsScene'
import { EMPTY_RAW_DREAM_INPUT } from './types/dream'
import type { DreamRecord, RawDreamInput } from './types/dream'

const ORB_ZOOM_MS = 560
const MOTION_TUNING_KEY = 'motion-debug-tuning-v1'

function loadMotionTuning(): MotionTuning {
  if (typeof window === 'undefined') {
    return DEFAULT_MOTION_TUNING
  }

  try {
    const raw = window.localStorage.getItem(MOTION_TUNING_KEY)

    if (!raw) {
      return DEFAULT_MOTION_TUNING
    }

    const parsed = JSON.parse(raw) as Partial<MotionTuning>

    return {
      phoneTiltGain: Number(parsed.phoneTiltGain ?? DEFAULT_MOTION_TUNING.phoneTiltGain),
      phoneTiltLowPassBoost: Number(
        parsed.phoneTiltLowPassBoost ?? DEFAULT_MOTION_TUNING.phoneTiltLowPassBoost,
      ),
      nativeCalibrationRange: Number(
        parsed.nativeCalibrationRange ?? DEFAULT_MOTION_TUNING.nativeCalibrationRange,
      ),
      nativeAbsoluteBlend: Number(
        parsed.nativeAbsoluteBlend ?? DEFAULT_MOTION_TUNING.nativeAbsoluteBlend,
      ),
      tiltMaxDeltaBoost: Number(
        parsed.tiltMaxDeltaBoost ?? DEFAULT_MOTION_TUNING.tiltMaxDeltaBoost,
      ),
    }
  } catch {
    return DEFAULT_MOTION_TUNING
  }
}

function resolveBackgroundSpeed(scene: string) {
  switch (scene) {
    case 'hero':
      return 1.58
    case 'entering':
      return 3.12
    case 'dreamEntry':
      return 0.88
    case 'assistantRefine':
      return 0.94
    case 'generating':
      return 0.66
    case 'gallery':
    case 'myDreams':
      return 1.24
    case 'result':
    case 'inspectDream':
      return 0.82
    default:
      return 1
  }
}

function resolveStarSpeed(scene: string) {
  switch (scene) {
    case 'hero':
      return 1.48
    case 'entering':
      return 2.64
    case 'dreamEntry':
    case 'assistantRefine':
      return 0.92
    case 'generating':
      return 0.52
    case 'gallery':
    case 'myDreams':
      return 1.08
    default:
      return 1
  }
}

function resolveNebulaComposition(scene: string): NebulaCompositionFrame {
  switch (scene) {
    case 'hero':
      return { offsetX: 0.108, offsetY: 0.014, scale: 0.76 }
    case 'entering':
      return { offsetX: 0.098, offsetY: 0.008, scale: 0.74 }
    default:
      return { offsetX: 0.072, offsetY: 0.046, scale: 0.84 }
  }
}

function findDreamById(
  dreamId: string | null,
  myDreams: DreamRecord[],
  galleryDreams: DreamRecord[],
) {
  if (!dreamId) {
    return null
  }

  return myDreams.find((dream) => dream.id === dreamId) ??
    galleryDreams.find((dream) => dream.id === dreamId) ??
    null
}

function resolveMotionProfile(scene: string, base: MotionProfile): MotionProfile {
  switch (scene) {
    case 'entering':
      return { x: base.x * 1.14, y: base.y * 1.1 }
    case 'generating':
      return { x: base.x * 0.62, y: base.y * 0.6 }
    case 'result':
    case 'inspectDream':
      return { x: base.x * 0.8, y: base.y * 0.78 }
    case 'gallery':
    case 'myDreams':
      return { x: base.x * 1.2, y: base.y * 1.16 }
    default:
      return base
  }
}

function App() {
  const reducedMotion = useReducedMotion()
  const viewportProfile = useViewportProfile()
  const safeAreaInsets = useSafeAreaInsets()
  const { muted, activate, toggleMuted } = useAmbientAudio()
  const { state: sceneState, actions } = useSceneMachine()

  const keyboardAware = useKeyboardAwareViewport(
    sceneState.scene === 'dreamEntry' || sceneState.scene === 'assistantRefine',
  )

  const [motionTuning, setMotionTuning] = useState<MotionTuning>(() => loadMotionTuning())

  const motion = useMotionInput({
    enabled: true,
    reducedMotion,
    pointerCoarse: viewportProfile.pointerCoarse,
    isDesktop: viewportProfile.isDesktop,
    isPhone: viewportProfile.isPhone,
    tuning: motionTuning,
  })

  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)
  const [myDreams, setMyDreams] = useState<DreamRecord[]>([])
  const [draftInput, setDraftInput] = useState<RawDreamInput>(EMPTY_RAW_DREAM_INPUT)
  const [draftRefinedText, setDraftRefinedText] = useState('')
  const [entryRenderKey, setEntryRenderKey] = useState(0)
  const [generationToken, setGenerationToken] = useState(0)
  const pendingGenerationRef = useRef<{
    rawInput: RawDreamInput
    refinedText: string
  } | null>(null)
  const zoomTimerRef = useRef<number | null>(null)
  const [orbTransition, setOrbTransition] = useState<{
    active: boolean
    origin: PortalTransitionOrigin | null
  }>({
    active: false,
    origin: null,
  })

  const completeEnterTransition = useCallback(() => {
    actions.goDreamEntry()
  }, [actions])
  const {
    state: enterTransitionState,
    start: startEnterTransition,
    reset: resetEnterTransition,
  } = useEnterTransition({
    reducedMotion,
    onComplete: completeEnterTransition,
  })

  const galleryDreams = useMemo(() => getGalleryDreams(), [])
  const activeDream = useMemo(
    () => findDreamById(sceneState.dreamId, myDreams, galleryDreams),
    [sceneState.dreamId, myDreams, galleryDreams],
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(MOTION_TUNING_KEY, JSON.stringify(motionTuning))
    } catch {
      // 忽略本地存储异常
    }
  }, [motionTuning])

  useEffect(() => {
    let cancelled = false

    const hydrateDreams = async () => {
      const saved = await loadDreamRecords()

      if (!cancelled) {
        setMyDreams((current) => {
          if (current.length === 0) {
            return saved
          }

          const knownIds = new Set(current.map((dream) => dream.id))
          const merged = [...current]

          for (const dream of saved) {
            if (!knownIds.has(dream.id)) {
              merged.push(dream)
            }
          }

          return merged
        })
      }
    }

    void hydrateDreams()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) return undefined

    const timer = window.setTimeout(() => {
      setHasAnimatedIn(true)
    }, 36)

    return () => {
      window.clearTimeout(timer)
    }
  }, [reducedMotion])

  const entered = reducedMotion || hasAnimatedIn

  useEffect(() => {
    const initializeAudio = () => {
      void activate()
    }

    window.addEventListener('pointerdown', initializeAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', initializeAudio)
    }
  }, [activate])

  useEffect(() => {
    return () => {
      if (zoomTimerRef.current) {
        window.clearTimeout(zoomTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (sceneState.scene !== 'entering') {
      resetEnterTransition()
    }
  }, [resetEnterTransition, sceneState.scene])

  useEffect(() => {
    if (sceneState.scene === 'generating' && !pendingGenerationRef.current) {
      actions.goDreamEntry(true)
    }
  }, [actions, sceneState.scene])

  const startEnterFlow = () => {
    void activate()
    motion.nudgePermissionPrompt()
    setDraftInput(EMPTY_RAW_DREAM_INPUT)
    setDraftRefinedText('')
    setEntryRenderKey((previous) => previous + 1)
    actions.startEntering()
    startEnterTransition()
  }

  const handleDreamEntryPhaseChange = (phase: 'dreamEntry' | 'assistantRefine') => {
    if (phase === 'assistantRefine') {
      actions.goAssistantRefine()
      return
    }

    actions.goDreamEntry()
  }

  const handleVisualize = (payload: { rawInput: RawDreamInput; refinedText: string }) => {
    pendingGenerationRef.current = payload
    setDraftInput(payload.rawInput)
    setDraftRefinedText(payload.refinedText)
    setGenerationToken((previous) => previous + 1)
    actions.goGenerating()
  }

  const completeGeneration = () => {
    const pending = pendingGenerationRef.current

    if (!pending) {
      actions.goDreamEntry(true)
      return
    }

    const record = createDreamRecordFromRefined(
      pending.refinedText,
      pending.rawInput,
      'user',
    )

    setMyDreams((previous) => {
      const updated = upsertDreamRecord(previous, record)
      void saveDreamRecords(updated)
      return updated
    })
    pendingGenerationRef.current = null
    actions.openResult(record.id)
  }

  const handleDreamAgain = (record: DreamRecord) => {
    setDraftInput(record.rawInput)
    setDraftRefinedText(record.refinedPrompt)
    setEntryRenderKey((previous) => previous + 1)
    actions.goDreamEntry()
  }

  const startFreshDreamEntry = () => {
    setDraftInput(EMPTY_RAW_DREAM_INPUT)
    setDraftRefinedText('')
    setEntryRenderKey((previous) => previous + 1)
    actions.goDreamEntry()
  }

  const inspectFromOrb = (
    dream: DreamRecord,
    source: 'gallery' | 'myDreams',
    origin: PortalTransitionOrigin,
  ) => {
    if (zoomTimerRef.current) {
      window.clearTimeout(zoomTimerRef.current)
    }

    setOrbTransition({
      active: true,
      origin,
    })

    const duration = reducedMotion
      ? 80
      : Math.max(420, Math.min(700, ORB_ZOOM_MS + (origin.radius ?? 80) * 0.45))

    zoomTimerRef.current = window.setTimeout(() => {
      actions.inspectDream(dream.id, source)
      setOrbTransition({
        active: false,
        origin: null,
      })
    }, duration)
  }

  const inspectFromGallery = (
    dream: DreamRecord,
    origin: PortalTransitionOrigin,
  ) => {
    inspectFromOrb(dream, 'gallery', origin)
  }

  const inspectFromMyDreams = (
    dream: DreamRecord,
    origin: PortalTransitionOrigin,
  ) => {
    inspectFromOrb(dream, 'myDreams', origin)
  }

  const openRandomGalleryDream = () => {
    const pick = galleryDreams[Math.floor(Math.random() * galleryDreams.length)]
    actions.inspectDream(pick.id, 'gallery')
  }

  const handleResultDownload = (
    record: DreamRecord,
    canvas: HTMLCanvasElement | null,
  ) => {
    const title = record.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
    const name = title ? `${title}.png` : 'dreamkeeper-poster.png'
    void exportCanvasResult(canvas, name, `Dreamkeeper: ${record.title}`)
  }

  const goBackFromInspect = () => {
    if (sceneState.inspectSource === 'myDreams') {
      actions.goMyDreams()
      return
    }

    actions.goGallery()
  }

  const rootClassName = [
    'app-root',
    entered ? 'is-booted' : '',
    `scene-${sceneState.scene}`,
    sceneState.scene === 'entering' && enterTransitionState.active
      ? 'enter-transition-active'
      : '',
    sceneState.scene === 'entering' && enterTransitionState.phase !== 'idle'
      ? `enter-phase-${enterTransitionState.phase}`
      : '',
    `motion-${motion.snapshot.source}`,
    viewportProfile.isPhone ? 'platform-phone' : 'platform-wide',
    viewportProfile.isSmallPhone ? 'platform-small-phone' : '',
    keyboardAware.keyboardOpen ? 'is-keyboard-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shellStyle: CSSProperties = {
    ...safeAreaInsets,
    '--app-dvh': `${keyboardAware.viewportHeight}px`,
  } as CSSProperties

  const nebulaProfile = resolveMotionProfile(sceneState.scene, { x: 1, y: 0.86 })
  const starProfile = resolveMotionProfile(sceneState.scene, { x: 0.95, y: 0.88 })
  const portalProfile = resolveMotionProfile(sceneState.scene, { x: 0.64, y: 0.58 })
  const resultProfile = resolveMotionProfile(sceneState.scene, { x: 0.72, y: 0.68 })
  const galleryProfile = resolveMotionProfile(sceneState.scene, { x: 0.95, y: 0.9 })

  const showFloatingAudio =
    sceneState.scene !== 'result' &&
    sceneState.scene !== 'inspectDream'
  const hasTiltSample = motion.snapshot.diagnostics.hasTiltSample
  const showMotionDock =
    viewportProfile.pointerCoarse &&
    sceneState.scene !== 'result' &&
    sceneState.scene !== 'inspectDream' &&
    (
      motion.snapshot.permissionState !== 'granted' ||
      !hasTiltSample ||
      sceneState.scene === 'dreamEntry' ||
      sceneState.scene === 'assistantRefine' ||
      sceneState.scene === 'gallery' ||
      sceneState.scene === 'myDreams'
    )
  const showMotionDebug =
    viewportProfile.pointerCoarse &&
    sceneState.scene !== 'result' &&
    sceneState.scene !== 'inspectDream'

  return (
    <MobileAppShell
      className={rootClassName}
      keyboardOffset={keyboardAware.keyboardOffset}
      style={shellStyle}
    >
      <NebulaBackground
        entered={entered}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={nebulaProfile}
        performanceTier={viewportProfile.performanceTier}
        timeScale={resolveBackgroundSpeed(sceneState.scene)}
        composition={resolveNebulaComposition(sceneState.scene)}
      />
      <StarField
        entered={entered}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={starProfile}
        performanceTier={viewportProfile.performanceTier}
        speedMultiplier={resolveStarSpeed(sceneState.scene)}
      />
      <div className="enter-inner-world-layer" aria-hidden>
        <div className="enter-inner-world-window">
          <div className="enter-inner-world-stars" />
          <div className="enter-inner-world-rim" />
          <div className="enter-inner-world-grain" />
        </div>
      </div>

      <DreamPortal
        entered={entered}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={portalProfile}
      />

      <HeroOverlay
        entered={entered}
        hidden={sceneState.scene !== 'hero' && sceneState.scene !== 'entering'}
        reducedMotion={reducedMotion}
        onEnter={startEnterFlow}
      />

      <DreamEntryScene
        key={`entry-${entryRenderKey}`}
        active={
          sceneState.scene === 'dreamEntry' || sceneState.scene === 'assistantRefine'
        }
        enterTransitionActive={
          sceneState.scene === 'entering' && enterTransitionState.active
        }
        enterTransitionPhase={enterTransitionState.phase}
        phase={sceneState.scene === 'assistantRefine' ? 'assistantRefine' : 'dreamEntry'}
        keyboardOpen={keyboardAware.keyboardOpen}
        initialInput={draftInput}
        initialRefinedText={draftRefinedText}
        onPhaseChange={handleDreamEntryPhaseChange}
        onVisualize={handleVisualize}
      />

      <DreamInsightsLoader
        key={`loader-${generationToken}`}
        active={sceneState.scene === 'generating'}
        reducedMotion={reducedMotion}
        onComplete={completeGeneration}
      />

      <DreamResultScene
        active={sceneState.scene === 'result' || sceneState.scene === 'inspectDream'}
        mode={sceneState.scene === 'result' ? 'result' : 'inspect'}
        dream={activeDream}
        inspectSource={
          sceneState.inspectSource === 'gallery' || sceneState.inspectSource === 'myDreams'
            ? sceneState.inspectSource
            : null
        }
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={resultProfile}
        performanceTier={viewportProfile.performanceTier}
        muted={muted}
        onGoHome={actions.goHome}
        onGoGallery={actions.goGallery}
        onGoMyDreams={actions.goMyDreams}
        onBackFromInspect={goBackFromInspect}
        onDreamAgain={handleDreamAgain}
        onDownload={handleResultDownload}
        onToggleAudio={() => void toggleMuted()}
      />

      <DreamGalleryScene
        active={sceneState.scene === 'gallery'}
        dreams={galleryDreams}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={galleryProfile}
        performanceTier={viewportProfile.performanceTier}
        pointerCoarse={viewportProfile.pointerCoarse}
        onGoHome={actions.goHome}
        onGoMyDreams={actions.goMyDreams}
        onSelectDream={inspectFromGallery}
        onRandomDream={openRandomGalleryDream}
      />

      <MyDreamsScene
        active={sceneState.scene === 'myDreams'}
        dreams={myDreams}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={galleryProfile}
        performanceTier={viewportProfile.performanceTier}
        pointerCoarse={viewportProfile.pointerCoarse}
        onGoHome={actions.goHome}
        onGoGallery={actions.goGallery}
        onStartNew={startFreshDreamEntry}
        onSelectDream={inspectFromMyDreams}
      />

      <PortalTransition
        mode="enter"
        active={sceneState.scene === 'entering' && enterTransitionState.active}
        phase={enterTransitionState.phase}
        reducedMotion={reducedMotion}
      />
      <PortalTransition mode="orb" active={orbTransition.active} origin={orbTransition.origin} />

      <MotionPermissionPrompt
        visible={motion.showPermissionPrompt}
        permissionState={motion.snapshot.permissionState}
        onEnable={() => {
          void motion.requestTiltPermission()
        }}
        onSkip={motion.dismissPermissionPrompt}
      />

      {showMotionDock ? (
        <MotionControlDock
          permissionState={motion.snapshot.permissionState}
          source={motion.snapshot.source}
          hasTiltSample={hasTiltSample}
          onReenable={motion.reopenMotionPrompt}
          onRecenter={motion.recenter}
        />
      ) : null}

      {showMotionDebug ? (
        <MotionDebugPanel
          tuning={motionTuning}
          permissionState={motion.snapshot.permissionState}
          source={motion.snapshot.source}
          diagnostics={motion.snapshot.diagnostics}
          onChange={(patch) => {
            setMotionTuning((previous) => ({
              ...previous,
              ...patch,
            }))
          }}
          onReset={() => {
            setMotionTuning(DEFAULT_MOTION_TUNING)
          }}
        />
      ) : null}

      {showFloatingAudio ? (
        <AudioToggle
          muted={muted}
          onToggle={() => void toggleMuted()}
          className="floating-audio-toggle"
        />
      ) : null}
    </MobileAppShell>
  )
}

export default App
