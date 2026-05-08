import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { DreamPortal } from './components/DreamPortal'
import { AuthGatePrompt } from './components/AuthGatePrompt'
import { HeroOverlay } from './components/HeroOverlay'
import { MotionDebugPanel } from './components/MotionDebugPanel'
import { MotionPermissionPrompt } from './components/MotionPermissionPrompt'
import { NebulaBackground } from './components/NebulaBackground'
import type { NebulaCompositionFrame } from './components/NebulaBackground'
import { PrimaryBottomNav, type PrimaryBottomNavTab } from './components/PrimaryBottomNav'
import { PortalTransition } from './components/PortalTransition'
import type { PortalTransitionOrigin } from './components/PortalTransition'
import { SoftPageTransitionOverlay } from './components/SoftPageTransitionOverlay'
import { StarField } from './components/StarField'
import { useKeyboardAwareViewport } from './hooks/useKeyboardAwareViewport'
import { useEnterTransition } from './hooks/useEnterTransition'
import { DEFAULT_MOTION_TUNING, useMotionInput } from './hooks/useMotionInput'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useSceneMachine } from './hooks/useSceneMachine'
import { useSafeAreaInsets } from './hooks/useSafeAreaInsets'
import { useViewportProfile } from './hooks/useViewportProfile'
import type { DeviceClass } from './hooks/useViewportProfile'
import { MobileAppShell } from './layout/MobileAppShell'
import type { MotionProfile, MotionSceneTuning, MotionTuning } from './motion/types'
import { Toast } from './components/toast'
import { exportCanvasResult } from './platform/exportShareAdapter'
import { createDreamRecordFromRefined } from './services/dreamGenerationService'
import { getGalleryDreams } from './services/galleryService'
import {
  loadStoredAuth,
  loginWithEmail,
  logoutAuth,
  refreshAuth,
  registerWithEmail,
  saveStoredAuth,
  sendRegisterCode,
} from './services/liveReadingApi'
import { encryptPassword } from './services/passwordCryptoService'
import {
  loadDreamRecords,
  saveDreamRecords,
  upsertDreamRecord,
} from './services/dreamStorageService'
import {
  AuthScene,
  type AuthSubmitPayload,
  type SendRegisterCodeResult,
} from './scenes/AuthScene'
import { DreamEntryScene } from './scenes/DreamEntryScene'
import { DreamGalleryScene } from './scenes/DreamGalleryScene'
import { DreamInsightsLoader } from './scenes/DreamInsightsLoader'
import { DreamResultScene } from './scenes/DreamResultScene'
import { AiReadingScene } from './scenes/AiReadingScene'
import { FeatureLandingScene } from './scenes/FeatureLandingScene'
import { LiveReadingScene } from './scenes/LiveReadingScene'
import { MyDreamsScene } from './scenes/MyDreamsScene'
import { EMPTY_RAW_DREAM_INPUT } from './types/dream'
import type { DreamRecord, RawDreamInput } from './types/dream'
import type { AuthPayload } from './types/liveReading'

const ORB_ZOOM_MS = 560
const SHOW_HERO_ON_BOOT = import.meta.env.VITE_SHOW_HERO_ON_BOOT !== 'false'
const MOTION_TUNING_KEY = 'motion-debug-tuning-v1'
const SCENE_TUNING_KEY = 'motion-debug-scene-v1'
const MOTION_ONBOARDING_KEY = 'motion-onboarding-complete'
const MOTION_LAST_PERMISSION_KEY = 'motion-last-permission'

const DEFAULT_SCENE_TUNING: MotionSceneTuning = {
  nebulaTimeScale: 2.06,
  nebulaMotionX: 1,
  nebulaMotionY: 1,
  starSpeed: 1,
  portalMotionX: 3.64,
  portalMotionY: 3.36,
}

type MotionLastPermissionChoice = 'unknown' | 'granted' | 'denied' | 'skipped' | 'unsupported'
type ProtectedPath = '/archive' | '/gallery' | '/live-reading'

const DEFAULT_AUTH_RETURN_PATH = '/dream/new'

function extractPathname(path: string) {
  if (!path.startsWith('/')) {
    return DEFAULT_AUTH_RETURN_PATH
  }

  const queryStart = path.indexOf('?')
  return queryStart >= 0 ? path.slice(0, queryStart) : path
}

function normalizeAuthReturnPath(path: string | null | undefined) {
  if (!path || !path.startsWith('/')) {
    return DEFAULT_AUTH_RETURN_PATH
  }

  const pathname = extractPathname(path)

  if (pathname === '/login' || pathname === '/register') {
    return DEFAULT_AUTH_RETURN_PATH
  }

  return path
}

function resolveProtectedPath(path: string): ProtectedPath | null {
  const pathname = extractPathname(path)

  if (pathname === '/archive' || pathname === '/my-dreams') {
    return '/archive'
  }

  if (pathname === '/gallery') {
    return '/gallery'
  }

  if (pathname === '/live-reading') {
    return '/live-reading'
  }

  return null
}

function resolveProtectedLabel(path: ProtectedPath) {
  if (path === '/archive') {
    return '我的'
  }

  if (path === '/gallery') {
    return '圈子'
  }

  return '真人连线'
}

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

function loadSceneTuning(): MotionSceneTuning {
  if (typeof window === 'undefined') {
    return DEFAULT_SCENE_TUNING
  }

  try {
    const raw = window.localStorage.getItem(SCENE_TUNING_KEY)

    if (!raw) {
      return DEFAULT_SCENE_TUNING
    }

    const parsed = JSON.parse(raw) as Partial<MotionSceneTuning>

    return {
      nebulaTimeScale: Number(parsed.nebulaTimeScale ?? DEFAULT_SCENE_TUNING.nebulaTimeScale),
      nebulaMotionX: Number(parsed.nebulaMotionX ?? DEFAULT_SCENE_TUNING.nebulaMotionX),
      nebulaMotionY: Number(parsed.nebulaMotionY ?? DEFAULT_SCENE_TUNING.nebulaMotionY),
      starSpeed: Number(parsed.starSpeed ?? DEFAULT_SCENE_TUNING.starSpeed),
      portalMotionX: Number(parsed.portalMotionX ?? DEFAULT_SCENE_TUNING.portalMotionX),
      portalMotionY: Number(parsed.portalMotionY ?? DEFAULT_SCENE_TUNING.portalMotionY),
    }
  } catch {
    return DEFAULT_SCENE_TUNING
  }
}

function loadMotionOnboardingComplete() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(MOTION_ONBOARDING_KEY) === 'true'
  } catch {
    return false
  }
}

function loadMotionLastPermission(): MotionLastPermissionChoice {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  try {
    const value = window.localStorage.getItem(MOTION_LAST_PERMISSION_KEY)

    if (
      value === 'granted' ||
      value === 'denied' ||
      value === 'skipped' ||
      value === 'unsupported'
    ) {
      return value
    }
  } catch {
    return 'unknown'
  }

  return 'unknown'
}

function resolveBackgroundSpeed(scene: string) {
  switch (scene) {
    case 'hero':
      return 1.58
    case 'entering':
      return 3.12
    case 'dreamEntry':
      return 0.88
    case 'aiReading':
    case 'assistantRefine':
    case 'featureLanding':
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
    case 'aiReading':
    case 'assistantRefine':
    case 'featureLanding':
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

function resolveNebulaComposition(
  scene: string,
  deviceClass: DeviceClass,
): NebulaCompositionFrame {
  switch (deviceClass) {
    case 'phone-sm':
    case 'phone':
      return { offsetX: 0, offsetY: 0, scale: 1 }
    case 'tablet-portrait':
      return scene === 'hero' || scene === 'entering'
        ? { offsetX: 0.014, offsetY: 0.012, scale: 0.93 }
        : { offsetX: 0.008, offsetY: 0.02, scale: 0.95 }
    case 'tablet-landscape':
      return scene === 'hero' || scene === 'entering'
        ? { offsetX: 0.022, offsetY: 0.01, scale: 0.88 }
        : { offsetX: 0.016, offsetY: 0.018, scale: 0.91 }
    case 'desktop-wide':
      return scene === 'hero'
        ? { offsetX: 0.112, offsetY: 0.016, scale: 0.74 }
        : scene === 'entering'
          ? { offsetX: 0.102, offsetY: 0.01, scale: 0.72 }
          : { offsetX: 0.076, offsetY: 0.044, scale: 0.82 }
    default:
      return scene === 'hero'
        ? { offsetX: 0.108, offsetY: 0.014, scale: 0.76 }
        : scene === 'entering'
          ? { offsetX: 0.098, offsetY: 0.008, scale: 0.74 }
          : { offsetX: 0.072, offsetY: 0.046, scale: 0.84 }
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

function scaleMotionProfile(
  base: MotionProfile,
  scaleX: number,
  scaleY: number,
): MotionProfile {
  return {
    x: base.x * scaleX,
    y: base.y * scaleY,
  }
}

function DreamHeroApp() {
  const reducedMotion = useReducedMotion()
  const viewportProfile = useViewportProfile()
  const safeAreaInsets = useSafeAreaInsets()
  const { state: sceneState, actions } = useSceneMachine()
  const liveReadingActive =
    sceneState.scene === 'featureLanding' && sceneState.featureSlug === 'live-reading'

  const keyboardAware = useKeyboardAwareViewport(
    sceneState.scene === 'dreamEntry' ||
      sceneState.scene === 'aiReading' ||
      sceneState.scene === 'assistantRefine' ||
      sceneState.scene === 'authLogin' ||
      sceneState.scene === 'authRegister' ||
      liveReadingActive,
  )

  const [motionTuning, setMotionTuning] = useState<MotionTuning>(() => loadMotionTuning())
  const [sceneTuning, setSceneTuning] = useState<MotionSceneTuning>(() => loadSceneTuning())

  const motion = useMotionInput({
    enabled: true,
    reducedMotion,
    pointerCoarse: viewportProfile.pointerCoarse,
    isDesktop: viewportProfile.isDesktop,
    isPhone: viewportProfile.isPhone,
    tuning: motionTuning,
  })
  const motionDiagnostics = motion.snapshot.diagnostics
  const requestTiltPermission = motion.requestTiltPermission
  const openTiltSettings = motion.openTiltSettings

  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)
  const [motionOnboardingComplete, setMotionOnboardingComplete] = useState(() =>
    loadMotionOnboardingComplete(),
  )
  const [motionLastPermission, setMotionLastPermission] = useState<MotionLastPermissionChoice>(() =>
    loadMotionLastPermission(),
  )
  const [motionRecoveryDismissed, setMotionRecoveryDismissed] = useState(false)
  // Do not replay home intro on hard refresh of /dream/new.
  // Keep transition only for the explicit Hero -> Enter flow.
  const [homeIntroPending, setHomeIntroPending] = useState(false)
  const [auth, setAuth] = useState<AuthPayload | null>(() => loadStoredAuth())
  const [authPending, setAuthPending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authGatePrompt, setAuthGatePrompt] = useState<{
    visible: boolean
    targetPath: ProtectedPath
    targetLabel: string
  }>({
    visible: false,
    targetPath: '/archive',
    targetLabel: '我的',
  })
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

  const {
    state: enterTransitionState,
    start: startEnterTransition,
    reset: resetEnterTransition,
  } = useEnterTransition({
    reducedMotion,
  })
  const galleryDreams = useMemo(() => getGalleryDreams(), [])
  const activeDream = useMemo(
    () => findDreamById(sceneState.dreamId, myDreams, galleryDreams),
    [sceneState.dreamId, myDreams, galleryDreams],
  )
  const authRouteMode =
    sceneState.scene === 'authLogin'
      ? 'login'
      : sceneState.scene === 'authRegister'
        ? 'register'
        : null
  const authReturnPath = useMemo(() => {
    if (!authRouteMode) {
      return DEFAULT_AUTH_RETURN_PATH
    }

    const queryStart = sceneState.path.indexOf('?')
    const search = queryStart >= 0 ? sceneState.path.slice(queryStart + 1) : ''
    const query = new URLSearchParams(search)
    return normalizeAuthReturnPath(query.get('from'))
  }, [authRouteMode, sceneState.path])

  const syncAuthState = useCallback((nextAuth: AuthPayload | null) => {
    setAuth(nextAuth)
    saveStoredAuth(nextAuth)
  }, [])

  const openAuthGatePrompt = useCallback((targetPath: ProtectedPath) => {
    setAuthGatePrompt({
      visible: true,
      targetPath,
      targetLabel: resolveProtectedLabel(targetPath),
    })
    setAuthError(null)
  }, [])

  const navigateWithAuthGate = useCallback(
    (targetPath: ProtectedPath, navigateAction: () => void) => {
      if (auth) {
        setAuthGatePrompt((previous) => ({
          ...previous,
          visible: false,
        }))
        navigateAction()
        return
      }

      openAuthGatePrompt(targetPath)
    },
    [auth, openAuthGatePrompt],
  )

  const openMyWithAuthGate = useCallback(() => {
    setAuthGatePrompt((previous) => ({
      ...previous,
      visible: false,
    }))
    actions.goArchive()
  }, [actions])

  const openCircleWithAuthGate = useCallback(() => {
    setAuthGatePrompt((previous) => ({
      ...previous,
      visible: false,
    }))
    actions.goGallery()
  }, [actions])

  const openLiveReadingWithAuthGate = useCallback(() => {
    navigateWithAuthGate('/live-reading', () => actions.goFeature('live-reading'))
  }, [actions, navigateWithAuthGate])

  const handleSubmitAuth = useCallback(
    async (payload: AuthSubmitPayload) => {
      if (!authRouteMode) {
        return
      }

      setAuthPending(true)
      setAuthError(null)

      try {
        const encryptedPassword = await encryptPassword(payload.password)
        const authPayload =
          payload.kind === 'register'
            ? await registerWithEmail({
                email: payload.email,
                ...encryptedPassword,
                birthday: payload.birthday,
                verificationCode: payload.verificationCode,
              })
            : await loginWithEmail({
                email: payload.email,
                ...encryptedPassword,
              })

        syncAuthState(authPayload)
        setAuthGatePrompt((previous) => ({
          ...previous,
          visible: false,
        }))
        actions.goPath(authReturnPath, true)
      } catch (exception) {
        const message =
          exception instanceof Error && exception.message.trim().length > 0
            ? exception.message
            : authRouteMode === 'register'
              ? '注册失败，请稍后重试。'
              : '登录失败，请稍后重试。'
        setAuthError(null)
        Toast.show(message, {
          type: 'error',
          position: 'top',
        })
      } finally {
        setAuthPending(false)
      }
    },
    [actions, authReturnPath, authRouteMode, syncAuthState],
  )

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  const handleSendRegisterCode = useCallback(async (email: string): Promise<SendRegisterCodeResult> => {
    const response = await sendRegisterCode(email)
    return {
      resendIntervalSeconds: response.resendIntervalSeconds,
      expiresInSeconds: response.expiresInSeconds,
    }
  }, [])

  const handleSwitchAuthMode = useCallback(() => {
    if (authRouteMode === 'login') {
      actions.goRegister(authReturnPath, true)
      setAuthError(null)
      return
    }

    if (authRouteMode === 'register') {
      actions.goLogin(authReturnPath, true)
      setAuthError(null)
    }
  }, [actions, authReturnPath, authRouteMode])

  const handleGoLoginFromPrompt = useCallback(() => {
    actions.goLogin(authGatePrompt.targetPath)
    setAuthGatePrompt((previous) => ({
      ...previous,
      visible: false,
    }))
  }, [actions, authGatePrompt.targetPath])

  const handleContinueAfterAuth = useCallback(() => {
    actions.goPath(authReturnPath, true)
  }, [actions, authReturnPath])

  const handleLogout = useCallback(async () => {
    const currentAuth = auth
    const currentProtectedPath = resolveProtectedPath(sceneState.path)

    if (currentProtectedPath) {
      actions.goDreamEntry(true)
    }

    if (!currentAuth) {
      syncAuthState(null)
      setAuthError(null)
      return
    }

    setAuthPending(true)
    setAuthError(null)

    try {
      await logoutAuth(currentAuth.accessToken, currentAuth.refreshToken)
    } catch (exception) {
      console.warn('[Auth][Logout]', exception)
    } finally {
      syncAuthState(null)
      setAuthPending(false)
    }
  }, [actions, auth, sceneState.path, syncAuthState])

  useEffect(() => {
    try {
      window.localStorage.setItem(MOTION_TUNING_KEY, JSON.stringify(motionTuning))
    } catch {
      // 忽略本地存储异常
    }
  }, [motionTuning])

  useEffect(() => {
    try {
      window.localStorage.setItem(SCENE_TUNING_KEY, JSON.stringify(sceneTuning))
    } catch {
      // 忽略本地存储异常
    }
  }, [sceneTuning])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MOTION_ONBOARDING_KEY,
        motionOnboardingComplete ? 'true' : 'false',
      )
    } catch {
      // 忽略本地存储异常
    }
  }, [motionOnboardingComplete])

  useEffect(() => {
    try {
      window.localStorage.setItem(MOTION_LAST_PERMISSION_KEY, motionLastPermission)
    } catch {
      // 忽略本地存储异常
    }
  }, [motionLastPermission])

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
    return () => {
      if (zoomTimerRef.current) {
        window.clearTimeout(zoomTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!enterTransitionState.active) {
      return
    }

    if (sceneState.scene === 'entering' || sceneState.scene === 'dreamEntry') {
      return
    }

    resetEnterTransition()
  }, [enterTransitionState.active, resetEnterTransition, sceneState.scene])

  useEffect(() => {
    if (SHOW_HERO_ON_BOOT) {
      return
    }

    if (sceneState.scene === 'hero') {
      actions.goDreamEntry(true)
    }
  }, [actions, sceneState.scene])

  useEffect(() => {
    if (!authGatePrompt.visible || !auth) {
      return
    }

    setAuthGatePrompt((previous) => ({
      ...previous,
      visible: false,
    }))
  }, [auth, authGatePrompt.visible])

  useEffect(() => {
    if (auth) {
      return
    }

    if (sceneState.scene !== 'featureLanding' || sceneState.featureSlug !== 'live-reading') {
      return
    }

    openAuthGatePrompt('/live-reading')
    actions.goDreamEntry(true)
  }, [actions, auth, openAuthGatePrompt, sceneState.featureSlug, sceneState.scene])

  useEffect(() => {
    const storedAuth = loadStoredAuth()

    if (!storedAuth) {
      syncAuthState(null)
      return
    }

    let cancelled = false
    setAuthPending(true)

    void refreshAuth(storedAuth.refreshToken)
      .then((nextAuth) => {
        if (cancelled) {
          return
        }

        syncAuthState(nextAuth)
      })
      .catch((exception) => {
        if (cancelled) {
          return
        }

        console.warn('[Auth][Refresh]', exception)
        syncAuthState(null)

        if (window.location.pathname === '/login' || window.location.pathname === '/register') {
          setAuthError('登录态已失效，请重新登录。')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthPending(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [syncAuthState])

  useEffect(() => {
    if (sceneState.scene !== 'dreamEntry') {
      return
    }

    if (!homeIntroPending) {
      return
    }

    startEnterTransition({
      onComplete: () => {
        setHomeIntroPending(false)
      },
    })
  }, [homeIntroPending, sceneState.scene, startEnterTransition])

  useEffect(() => {
    if (sceneState.scene === 'generating' && !pendingGenerationRef.current) {
      actions.goDreamEntry(true)
    }
  }, [actions, sceneState.scene])

  useEffect(() => {
    if (motionDiagnostics.transport !== 'native') {
      return undefined
    }

    const timer = window.setTimeout(() => {
      if (motionDiagnostics.nativePermissionState === 'granted') {
        setMotionOnboardingComplete(true)
        setMotionLastPermission('granted')
        setMotionRecoveryDismissed(false)
        return
      }

      if (motionDiagnostics.nativePermissionState === 'denied') {
        setMotionOnboardingComplete(true)
        setMotionLastPermission('denied')
        setMotionRecoveryDismissed(false)
        return
      }

      if (motionDiagnostics.nativePermissionState === 'unsupported') {
        setMotionLastPermission('unsupported')
      }
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [motionDiagnostics.nativePermissionState, motionDiagnostics.transport])

  const handleEnableMotion = useCallback(async () => {
    const granted = await requestTiltPermission()

    if (granted) {
      setMotionOnboardingComplete(true)
      setMotionLastPermission('granted')
      setMotionRecoveryDismissed(false)
      return
    }

    if (motionDiagnostics.transport === 'native') {
      if (motionDiagnostics.nativePermissionState === 'denied') {
        setMotionOnboardingComplete(true)
        setMotionLastPermission('denied')
        setMotionRecoveryDismissed(false)
        return
      }

      if (motionDiagnostics.nativePermissionState === 'notDetermined') {
        setMotionOnboardingComplete(false)
      }
    }
  }, [
    motionDiagnostics.nativePermissionState,
    motionDiagnostics.transport,
    requestTiltPermission,
  ])

  const handleSkipMotionOnboarding = useCallback(() => {
    setMotionOnboardingComplete(true)
    setMotionLastPermission('skipped')
    setMotionRecoveryDismissed(true)
  }, [])

  const handleDismissMotionRecovery = useCallback(() => {
    setMotionRecoveryDismissed(true)
  }, [])

  const handleOpenMotionSettings = useCallback(() => {
    setMotionOnboardingComplete(true)
    setMotionRecoveryDismissed(true)
    void openTiltSettings()
  }, [openTiltSettings])

  const startEnterFlow = () => {
    setDraftInput(EMPTY_RAW_DREAM_INPUT)
    setDraftRefinedText('')
    setEntryRenderKey((previous) => previous + 1)
    setHomeIntroPending(false)
    actions.startEntering()
    startEnterTransition({
      onSwap: () => {
        actions.goDreamEntry(true)
      },
    })
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
      openMyWithAuthGate()
      return
    }

    openCircleWithAuthGate()
  }

  const rootClassName = [
    'app-root',
    entered ? 'is-booted' : '',
    `scene-${sceneState.scene}`,
    sceneState.scene === 'entering' && enterTransitionState.active
      ? 'enter-transition-active'
      : '',
    enterTransitionState.active && enterTransitionState.phase !== 'idle'
      ? `enter-phase-${enterTransitionState.phase}`
      : '',
    `motion-${motion.snapshot.source}`,
    `device-${viewportProfile.deviceClass}`,
    `orientation-${viewportProfile.orientation}`,
    viewportProfile.pointerCoarse ? 'pointer-coarse' : 'pointer-fine',
    `performance-${viewportProfile.performanceTier}`,
    keyboardAware.keyboardOpen ? 'is-keyboard-open' : '',
    (
      sceneState.scene === 'dreamEntry' ||
      (sceneState.scene === 'featureLanding' && !liveReadingActive) ||
      sceneState.scene === 'gallery' ||
      sceneState.scene === 'myDreams'
    )
      ? 'has-primary-bottom-nav'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shellStyle: CSSProperties = {
    ...safeAreaInsets,
    '--app-dvh': `${keyboardAware.viewportHeight}px`,
    '--viewport-width': `${viewportProfile.width}px`,
    '--viewport-height': `${viewportProfile.height}px`,
  } as CSSProperties

  const heroLikeScene =
    sceneState.scene === 'hero' || sceneState.scene === 'entering'
  const heroHiddenByConfig = !SHOW_HERO_ON_BOOT && sceneState.scene === 'hero'
  const showMotionOnboarding =
    sceneState.scene === 'hero' &&
    motionDiagnostics.transport === 'native' &&
    !motionOnboardingComplete &&
    motionDiagnostics.nativePermissionState === 'notDetermined'
  const showMotionRecovery =
    sceneState.scene === 'hero' &&
    motionDiagnostics.transport === 'native' &&
    !showMotionOnboarding &&
    !motionRecoveryDismissed &&
    (
      motionDiagnostics.nativePermissionState === 'denied' ||
      motionLastPermission === 'skipped'
    )
  const motionPromptMode =
    motionDiagnostics.nativePermissionState === 'denied'
      ? 'denied'
      : 'skipped'
  const baseNebulaProfile = resolveMotionProfile(sceneState.scene, { x: 1, y: 0.86 })
  const baseStarProfile = resolveMotionProfile(sceneState.scene, { x: 0.95, y: 0.88 })
  const basePortalProfile = resolveMotionProfile(sceneState.scene, { x: 0.64, y: 0.58 })
  const nebulaProfile = heroLikeScene
    ? scaleMotionProfile(
        baseNebulaProfile,
        sceneTuning.nebulaMotionX,
        sceneTuning.nebulaMotionY,
      )
    : baseNebulaProfile
  const starProfile = baseStarProfile
  const portalProfile = heroLikeScene
    ? scaleMotionProfile(
        basePortalProfile,
        sceneTuning.portalMotionX,
        sceneTuning.portalMotionY,
      )
    : basePortalProfile
  const resultProfile = resolveMotionProfile(sceneState.scene, { x: 0.72, y: 0.68 })
  const galleryProfile = resolveMotionProfile(sceneState.scene, { x: 0.95, y: 0.9 })
  const nebulaTimeScale = resolveBackgroundSpeed(sceneState.scene) * (
    heroLikeScene ? sceneTuning.nebulaTimeScale : 1
  )
  const starSpeed = resolveStarSpeed(sceneState.scene) * (
    heroLikeScene ? sceneTuning.starSpeed : 1
  )

  const showMotionDebug =
    sceneState.scene === 'hero' ||
    sceneState.scene === 'entering'
  const shouldHoldHomeForIntro =
    sceneState.scene === 'dreamEntry' &&
    homeIntroPending &&
    !enterTransitionState.active
  const showPrimaryBottomNav =
    sceneState.scene === 'dreamEntry' ||
    (sceneState.scene === 'featureLanding' &&
      !liveReadingActive &&
      sceneState.featureSlug !== 'daily-fortune') ||
    sceneState.scene === 'gallery' ||
    sceneState.scene === 'myDreams'
  const allowTextInputFocus =
    sceneState.scene === 'assistantRefine' ||
    sceneState.scene === 'aiReading' ||
    sceneState.scene === 'authLogin' ||
    sceneState.scene === 'authRegister' ||
    liveReadingActive
  const showLaunchBackground =
    sceneState.scene === 'hero' || sceneState.scene === 'entering'
  const activePrimaryTab: PrimaryBottomNavTab =
    sceneState.scene === 'myDreams'
      ? 'my'
      : sceneState.scene === 'gallery'
        ? 'circle'
        : 'home'

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    if (!allowTextInputFocus) {
      const activeElement = document.activeElement

      if (activeElement instanceof HTMLElement) {
        const isFormField =
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable

        if (isFormField) {
          activeElement.blur()
        }
      }
    }

    if (sceneState.scene === 'hero' || sceneState.scene === 'entering') {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      document
        .querySelectorAll<HTMLElement>('.scene-panel, .home-scene-shell')
        .forEach((node) => {
          if (node.scrollTop !== 0) {
            node.scrollTop = 0
          }
        })
    }
  }, [allowTextInputFocus, sceneState.scene])

  return (
    <MobileAppShell
      className={rootClassName}
      keyboardOffset={keyboardAware.keyboardOffset}
      style={shellStyle}
    >
      {showLaunchBackground ? (
        <NebulaBackground
          entered={entered}
          reducedMotion={reducedMotion}
          motionRef={motion.motionRef}
          motionProfile={nebulaProfile}
          performanceTier={viewportProfile.performanceTier}
          timeScale={nebulaTimeScale}
          composition={resolveNebulaComposition(sceneState.scene, viewportProfile.deviceClass)}
        />
      ) : null}
      {showLaunchBackground ? (
        <StarField
          entered={entered}
          reducedMotion={reducedMotion}
          motionRef={motion.motionRef}
          motionProfile={starProfile}
          performanceTier={viewportProfile.performanceTier}
          speedMultiplier={starSpeed}
        />
      ) : null}

      <SoftPageTransitionOverlay
        active={enterTransitionState.active}
        phase={enterTransitionState.phase}
      />
      {showLaunchBackground ? (
        <DreamPortal
          entered={entered}
          reducedMotion={reducedMotion}
          motionRef={motion.motionRef}
          motionProfile={portalProfile}
        />
      ) : null}

      <HeroOverlay
        entered={entered}
        hidden={
          (sceneState.scene !== 'hero' && sceneState.scene !== 'entering') ||
          heroHiddenByConfig
        }
        reducedMotion={reducedMotion}
        onEnter={startEnterFlow}
      />

      <MotionPermissionPrompt
        visible={showMotionOnboarding || showMotionRecovery}
        mode={showMotionOnboarding ? 'onboarding' : motionPromptMode}
        onEnable={handleEnableMotion}
        onSkip={showMotionOnboarding ? handleSkipMotionOnboarding : handleDismissMotionRecovery}
        onOpenSettings={handleOpenMotionSettings}
      />
      {sceneState.scene === 'dreamEntry' || sceneState.scene === 'assistantRefine' ? (
        <DreamEntryScene
          key={`entry-${entryRenderKey}`}
          active
          phase={sceneState.scene === 'assistantRefine' ? 'assistantRefine' : 'dreamEntry'}
          keyboardOpen={keyboardAware.keyboardOpen}
          initialInput={draftInput}
          initialRefinedText={draftRefinedText}
          homeIntroActive={
            shouldHoldHomeForIntro ||
            (enterTransitionState.active && sceneState.scene === 'dreamEntry')
          }
          homeIntroPhase={shouldHoldHomeForIntro ? 'fadeOut' : enterTransitionState.phase}
          onPhaseChange={handleDreamEntryPhaseChange}
          onVisualize={handleVisualize}
          onOpenAiReading={actions.goAiReading}
          onOpenLiveReadingDebug={openLiveReadingWithAuthGate}
          onOpenDailyFortune={() => actions.goFeature('daily-fortune')}
        />
      ) : null}

      {authRouteMode ? (
        <AuthScene
          active
          mode={authRouteMode}
          pending={authPending}
          auth={auth}
          sourcePath={resolveProtectedPath(authReturnPath)}
          error={authError}
          onClearError={clearAuthError}
          onSubmit={handleSubmitAuth}
          onSendRegisterCode={handleSendRegisterCode}
          onSwitchMode={handleSwitchAuthMode}
          onContinue={handleContinueAfterAuth}
          onLogout={handleLogout}
          onGoHome={actions.goDreamEntry}
        />
      ) : null}

      <AiReadingScene
        active={sceneState.scene === 'aiReading'}
      />

      <DreamInsightsLoader
        key={`loader-${generationToken}`}
        active={sceneState.scene === 'generating'}
        reducedMotion={reducedMotion}
        onComplete={completeGeneration}
      />

      {liveReadingActive ? (
        <LiveReadingScene
          active
          auth={auth}
          onGoHome={actions.goDreamEntry}
          onGoLogin={() => actions.goLogin('/live-reading')}
          onLogout={handleLogout}
        />
      ) : null}

      <FeatureLandingScene
        active={sceneState.scene === 'featureLanding' && sceneState.featureSlug !== 'live-reading'}
        featureSlug={sceneState.featureSlug}
        onGoHome={actions.goDreamEntry}
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
        onGoHome={actions.goDreamEntry}
        onGoGallery={openCircleWithAuthGate}
        onGoMyDreams={openMyWithAuthGate}
        onBackFromInspect={goBackFromInspect}
        onDreamAgain={handleDreamAgain}
        onDownload={handleResultDownload}
      />

      <DreamGalleryScene
        active={sceneState.scene === 'gallery'}
        dreams={galleryDreams}
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={galleryProfile}
        performanceTier={viewportProfile.performanceTier}
        pointerCoarse={viewportProfile.pointerCoarse}
        onGoHome={actions.goDreamEntry}
        onGoMyDreams={openMyWithAuthGate}
        onSelectDream={inspectFromGallery}
        onRandomDream={openRandomGalleryDream}
      />

      <MyDreamsScene
        active={sceneState.scene === 'myDreams'}
        dreams={myDreams}
        title="我的"
        reducedMotion={reducedMotion}
        motionRef={motion.motionRef}
        motionProfile={galleryProfile}
        performanceTier={viewportProfile.performanceTier}
        pointerCoarse={viewportProfile.pointerCoarse}
        onGoHome={actions.goDreamEntry}
        onGoGallery={openCircleWithAuthGate}
        onStartNew={startFreshDreamEntry}
        onSelectDream={inspectFromMyDreams}
      />

      {showPrimaryBottomNav ? (
        <PrimaryBottomNav
          activeTab={activePrimaryTab}
          onGoMy={openMyWithAuthGate}
          onGoHome={actions.goDreamEntry}
          onGoCircle={openCircleWithAuthGate}
        />
      ) : null}

      <AuthGatePrompt
        visible={authGatePrompt.visible}
        targetLabel={authGatePrompt.targetLabel}
        onGoLogin={handleGoLoginFromPrompt}
        onDismiss={() => {
          setAuthGatePrompt((previous) => ({
            ...previous,
            visible: false,
          }))
        }}
      />

      <PortalTransition active={orbTransition.active} origin={orbTransition.origin} />

      {showMotionDebug ? (
        <MotionDebugPanel
          tuning={motionTuning}
          sceneTuning={sceneTuning}
          permissionState={motion.snapshot.permissionState}
          source={motion.snapshot.source}
          diagnostics={motion.snapshot.diagnostics}
          onChange={(patch) => {
            setMotionTuning((previous) => ({
              ...previous,
              ...patch,
            }))
          }}
          onChangeScene={(patch) => {
            setSceneTuning((previous) => ({
              ...previous,
              ...patch,
            }))
          }}
          onReset={() => {
            setMotionTuning(DEFAULT_MOTION_TUNING)
          }}
          onResetScene={() => {
            setSceneTuning(DEFAULT_SCENE_TUNING)
          }}
        />
      ) : null}

    </MobileAppShell>
  )
}

function App() {
  return <DreamHeroApp />
}

export default App
