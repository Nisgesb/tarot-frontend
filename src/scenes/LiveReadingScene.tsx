import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  facingModeFromDeviceLabel,
  facingModeFromLocalTrack,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type VideoTrack,
} from 'livekit-client'
import {
  createCallJoinToken,
  createCallSession,
  endCallSession,
  getOnlineReaders,
  getTarotDecks,
  isLiveReadingApiError,
  submitRevealEvent,
} from '../services/liveReadingApi'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/toast'
import { checkAppPermission, requestAppPermissions } from '../platform/permissionCenter'
import { getRuntimePlatform, isNativeApp } from '../platform/runtime'
import type {
  AuthPayload,
  CardRevealPayload,
  CallSession,
  EffectPreset,
  ReaderSummary,
  TarotDeckSummary,
} from '../types/liveReading'
import styles from './LiveReadingScene.module.css'

interface LiveReadingSceneProps {
  active: boolean
  auth: AuthPayload | null
  onGoHome: () => void
  onGoLogin: () => void
  onLogout: () => void | Promise<void>
}

interface VideoTileData {
  id: string
  label: string
  track: VideoTrack | null
  isLocal: boolean
  mirrorPreview: boolean
}

const EFFECT_TITLES: Record<EffectPreset, string> = {
  'misty-dawn': '晨雾启示',
  'arcane-spark': '秘仪火花',
  'bloom-aura': '丰盛绽放',
  'regal-gold': '王者领域',
  'cosmic-star': '星辉降临',
  'cosmic-moon': '月幕低语',
  'echo-rise': '回响上升',
  'halo-world': '世界光环',
}

type LiveReadingRuntimeSource =
  | 'capacitor-ios'
  | 'capacitor-android'
  | 'system-browser'
  | 'wechat-webview'
  | 'third-party-webview'
  | 'unknown-web'

interface LiveReadingRuntimeInfo {
  source: LiveReadingRuntimeSource
  label: string
  isNativeApp: boolean
  isSecureContext: boolean
  hasMediaDevicesApi: boolean
  supportsGetUserMedia: boolean
}

type LiveReadingFailureStage =
  | 'bootstrap-readers-decks'
  | 'login-refresh'
  | 'create-session'
  | 'join-token'
  | 'room-connect'
  | 'local-media-publish'
  | 'remote-subscribe'

type MediaPermissionState = PermissionState | 'unsupported'
type MediaProbeStatus = 'idle' | 'running' | 'success' | 'error'
type MediaProbeTrigger = 'auto' | 'manual'
type CameraFacingMode = 'user' | 'environment'

interface LiveReadingFailureDetail {
  stage: LiveReadingFailureStage
  stageLabel: string
  runtimeLabel: string
  secureContext: boolean
  hasMediaDevicesApi: boolean
  supportsGetUserMedia: boolean
  errorName: string
  message: string
  code: string | null
  status: number | null
  method: string | null
  path: string | null
  url: string | null
  timestamp: string
}

interface LiveReadingStageError extends Error {
  name: 'LiveReadingStageError'
  detail: LiveReadingFailureDetail
}

interface MediaDiagnosticsResult {
  hasNavigator: boolean
  hasMediaDevicesApi: boolean
  getUserMediaFunctionType: string
  getUserMediaCallable: boolean
  cameraPermission: MediaPermissionState
  microphonePermission: MediaPermissionState
  probeStatus: MediaProbeStatus
  probeErrorName: string | null
  probeErrorMessage: string | null
  lastCheckedAt: string | null
  lastProbeTriggeredBy: MediaProbeTrigger | null
}

interface MediaPublicationSummary {
  localCameraPublished: boolean
  localMicrophonePublished: boolean
  remoteParticipantCount: number
  remoteCameraPublishedCount: number
  remoteCameraSubscribedCount: number
}

function resolveFailureStageLabel(stage: LiveReadingFailureStage) {
  switch (stage) {
    case 'bootstrap-readers-decks':
      return 'readers/decks bootstrap'
    case 'login-refresh':
      return '登录后资源刷新'
    case 'create-session':
      return 'createSession'
    case 'join-token':
      return 'join-token'
    case 'room-connect':
      return '房间连接'
    case 'local-media-publish':
      return '本地媒体发布'
    case 'remote-subscribe':
      return '远端订阅'
    default:
      return stage
  }
}

function createStageError(detail: LiveReadingFailureDetail): LiveReadingStageError {
  const error = new Error(detail.message) as LiveReadingStageError
  error.name = 'LiveReadingStageError'
  error.detail = detail
  return error
}

function isLiveReadingStageError(error: unknown): error is LiveReadingStageError {
  if (!(error instanceof Error)) {
    return false
  }

  const candidate = error as Partial<LiveReadingStageError>
  return candidate.name === 'LiveReadingStageError' && !!candidate.detail
}

function resolveErrorMessage(exception: unknown, fallbackMessage: string) {
  if (exception instanceof Error && exception.message.trim().length > 0) {
    return exception.message
  }

  return fallbackMessage
}

function resolveErrorName(exception: unknown) {
  if (exception instanceof Error && exception.name.trim().length > 0) {
    return exception.name
  }

  return 'UnknownError'
}

function formatPermissionState(state: MediaPermissionState) {
  if (state === 'unsupported') {
    return '不支持查询'
  }

  if (state === 'granted') {
    return 'granted'
  }

  if (state === 'denied') {
    return 'denied'
  }

  return 'prompt'
}

function normalizeFacingMode(mode: string | undefined | null): CameraFacingMode | null {
  if (mode === 'environment') {
    return 'environment'
  }

  if (mode === 'user' || mode === 'left' || mode === 'right') {
    return 'user'
  }

  return null
}

function resolveFacingModeFromDeviceLabel(label: string): CameraFacingMode | null {
  const inferredByLiveKit = normalizeFacingMode(facingModeFromDeviceLabel(label)?.facingMode)

  if (inferredByLiveKit) {
    return inferredByLiveKit
  }

  const normalizedLabel = label.trim().toLowerCase()

  if (normalizedLabel.length === 0) {
    return null
  }

  if (/front|user|facetime|前置|前摄/.test(normalizedLabel)) {
    return 'user'
  }

  if (/back|rear|environment|后置|后摄|主摄/.test(normalizedLabel)) {
    return 'environment'
  }

  return null
}

function resolveLocalCameraFacingMode(
  participant: Participant,
  fallbackFacingMode: CameraFacingMode,
): CameraFacingMode {
  const localTrack = getCameraVideoTrack(participant)

  if (!localTrack) {
    return fallbackFacingMode
  }

  const inferredMode = facingModeFromLocalTrack(localTrack.mediaStreamTrack, {
    defaultFacingMode: fallbackFacingMode,
  }).facingMode

  return normalizeFacingMode(inferredMode) ?? fallbackFacingMode
}

function resolveCameraSwitchTarget(
  devices: MediaDeviceInfo[],
  currentDeviceId: string | undefined,
  currentFacingMode: CameraFacingMode,
) {
  const desiredFacingMode: CameraFacingMode =
    currentFacingMode === 'user' ? 'environment' : 'user'
  const candidates = devices
    .map((device) => ({
      device,
      facingMode: resolveFacingModeFromDeviceLabel(device.label),
    }))
    .filter(({ device }) => {
      if (!currentDeviceId) {
        return true
      }

      return device.deviceId !== currentDeviceId
    })

  const preferred = candidates.find((candidate) => candidate.facingMode === desiredFacingMode)

  if (preferred) {
    return {
      deviceId: preferred.device.deviceId,
      nextFacingMode: desiredFacingMode,
    }
  }

  const fallback = candidates[0]

  if (!fallback) {
    return null
  }

  return {
    deviceId: fallback.device.deviceId,
    nextFacingMode: fallback.facingMode ?? desiredFacingMode,
  }
}

function createInitialMediaDiagnostics(runtimeInfo: LiveReadingRuntimeInfo): MediaDiagnosticsResult {
  const hasNavigator = typeof navigator !== 'undefined'
  const mediaDevices = hasNavigator ? navigator.mediaDevices : undefined
  const getUserMediaFunctionType = typeof mediaDevices?.getUserMedia

  return {
    hasNavigator,
    hasMediaDevicesApi: !!mediaDevices,
    getUserMediaFunctionType,
    getUserMediaCallable: getUserMediaFunctionType === 'function',
    cameraPermission: 'unsupported',
    microphonePermission: 'unsupported',
    probeStatus: runtimeInfo.supportsGetUserMedia ? 'idle' : 'error',
    probeErrorName: runtimeInfo.supportsGetUserMedia ? null : 'NotSupportedError',
    probeErrorMessage: runtimeInfo.supportsGetUserMedia ? null : 'getUserMedia 不可用',
    lastCheckedAt: null,
    lastProbeTriggeredBy: null,
  }
}

async function queryMediaPermission(name: 'camera' | 'microphone'): Promise<MediaPermissionState> {
  try {
    const snapshot = await checkAppPermission(name)

    if (snapshot.state === 'granted') {
      return 'granted'
    }

    if (snapshot.state === 'denied') {
      return 'denied'
    }

    if (snapshot.state === 'promptable') {
      return 'prompt'
    }

    return 'unsupported'
  } catch {
    return 'unsupported'
  }
}

function detectLiveReadingRuntime(): LiveReadingRuntimeInfo {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const userAgent = hasNavigator ? navigator.userAgent : ''
  const isNative = isNativeApp()
  const isSecure = hasWindow ? window.isSecureContext : true
  const hasMediaDevicesApi =
    hasNavigator &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'

  if (isNative) {
    const platform = getRuntimePlatform()
    const source: LiveReadingRuntimeSource =
      platform === 'android' ? 'capacitor-android' : 'capacitor-ios'
    const label = platform === 'android' ? 'Capacitor Android' : 'Capacitor iOS'

    return {
      source,
      label,
      isNativeApp: true,
      isSecureContext: true,
      hasMediaDevicesApi,
      supportsGetUserMedia: hasMediaDevicesApi,
    }
  }

  const isWechat = /MicroMessenger/i.test(userAgent)
  const isIos = /\b(iPhone|iPad|iPod)\b/i.test(userAgent)
  const isAndroid = /\bAndroid\b/i.test(userAgent)
  const isIosWebView = isIos && /AppleWebKit/i.test(userAgent) && !/Safari/i.test(userAgent)
  const isAndroidWebView = /\bwv\b/i.test(userAgent) || /; wv\)/i.test(userAgent)

  if (isWechat) {
    return {
      source: 'wechat-webview',
      label: '微信 WebView',
      isNativeApp: false,
      isSecureContext: isSecure,
      hasMediaDevicesApi,
      supportsGetUserMedia: hasMediaDevicesApi && isSecure,
    }
  }

  if (isIosWebView || isAndroidWebView) {
    return {
      source: 'third-party-webview',
      label: isAndroid ? '第三方 Android WebView' : '第三方 iOS WebView',
      isNativeApp: false,
      isSecureContext: isSecure,
      hasMediaDevicesApi,
      supportsGetUserMedia: hasMediaDevicesApi && isSecure,
    }
  }

  if (isIos || isAndroid) {
    return {
      source: 'system-browser',
      label: isAndroid ? '系统浏览器(Android)' : '系统浏览器(iOS)',
      isNativeApp: false,
      isSecureContext: isSecure,
      hasMediaDevicesApi,
      supportsGetUserMedia: hasMediaDevicesApi && isSecure,
    }
  }

  return {
    source: 'unknown-web',
    label: 'Web 运行时(未识别)',
    isNativeApp: false,
    isSecureContext: isSecure,
    hasMediaDevicesApi,
    supportsGetUserMedia: hasMediaDevicesApi && isSecure,
  }
}

function resolveUnsupportedMediaMessage(runtimeInfo: LiveReadingRuntimeInfo) {
  if (runtimeInfo.source === 'wechat-webview') {
    return `当前运行时为${runtimeInfo.label}，不支持本页面实时音视频采集。请改用系统浏览器或 Capacitor App 打开后重试。`
  }

  if (runtimeInfo.source === 'third-party-webview') {
    return `当前运行时为${runtimeInfo.label}，媒体采集能力受容器限制。请改用系统浏览器或 Capacitor App 打开后重试。`
  }

  if (!runtimeInfo.isSecureContext) {
    return `当前运行时为${runtimeInfo.label}，且页面不在安全上下文（HTTPS）中，浏览器已禁用摄像头/麦克风。`
  }

  if (runtimeInfo.source === 'capacitor-ios' || runtimeInfo.source === 'capacitor-android') {
    return `当前运行时为${runtimeInfo.label}，但未检测到可用的媒体采集接口。请检查容器权限与系统隐私设置后重试。`
  }

  return `当前运行时为${runtimeInfo.label}，未检测到可用的摄像头/麦克风采集能力。请检查浏览器权限与系统设置后重试。`
}

function getCameraVideoTrack(participant: Participant): VideoTrack | null {
  const publication = participant.getTrackPublication(Track.Source.Camera)

  if (!publication?.track || publication.track.kind !== Track.Kind.Video) {
    return null
  }

  return publication.track as VideoTrack
}

function VideoTile({ tile }: { tile: VideoTileData }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoClassName = [styles.videoNode, tile.mirrorPreview ? styles.videoNodeMirror : '']
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    const node = videoRef.current

    if (!node || !tile.track) {
      return
    }

    tile.track.attach(node)

    return () => {
      tile.track?.detach(node)
    }
  }, [tile.track])

  return (
    <article className={styles.videoTile}>
      {tile.track ? (
        <video ref={videoRef} autoPlay playsInline muted={tile.isLocal} className={videoClassName} />
      ) : (
        <div className={styles.videoPlaceholder}>等待视频流...</div>
      )}
      <div className={styles.videoLabel}>{tile.label}</div>
    </article>
  )
}

export function LiveReadingScene({
  active,
  auth,
  onGoHome,
  onGoLogin,
  onLogout,
}: LiveReadingSceneProps) {
  const [readers, setReaders] = useState<ReaderSummary[]>([])
  const [decks, setDecks] = useState<TarotDeckSummary[]>([])
  const [selectedReaderId, setSelectedReaderId] = useState<string | null>(null)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [joinSessionId, setJoinSessionId] = useState('')
  const [session, setSession] = useState<CallSession | null>(null)
  const [participantRole, setParticipantRole] = useState<'USER' | 'READER' | null>(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomState, setRoomState] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle')
  const [, setTrackVersion] = useState(0)
  const [activeEffect, setActiveEffect] = useState<EffectPreset | null>(null)
  const [lastReveal, setLastReveal] = useState<CardRevealPayload | null>(null)
  const [failureDetail, setFailureDetail] = useState<LiveReadingFailureDetail | null>(null)
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('user')
  const [cameraSwitching, setCameraSwitching] = useState(false)
  const [cameraSwitchSupported, setCameraSwitchSupported] = useState(false)
  const runtimeInfo = useMemo(() => detectLiveReadingRuntime(), [])
  const [mediaDiagnostics, setMediaDiagnostics] = useState<MediaDiagnosticsResult>(() =>
    createInitialMediaDiagnostics(runtimeInfo),
  )
  const supportsGetUserMedia = runtimeInfo.isSecureContext && mediaDiagnostics.getUserMediaCallable
  const unsupportedMediaMessage = useMemo(
    () => resolveUnsupportedMediaMessage(runtimeInfo),
    [runtimeInfo],
  )

  const roomRef = useRef<Room | null>(null)
  const effectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!error) {
      return
    }

    Toast.show(error, {
      type: 'error',
      position: 'top',
    })
  }, [error])

  const captureFailure = useCallback(
    (
      stage: LiveReadingFailureStage,
      exception: unknown,
      fallbackMessage: string,
    ): LiveReadingFailureDetail => {
      if (isLiveReadingStageError(exception)) {
        setFailureDetail(exception.detail)
        return exception.detail
      }

      const detail: LiveReadingFailureDetail = {
        stage,
        stageLabel: resolveFailureStageLabel(stage),
        runtimeLabel: runtimeInfo.label,
        secureContext: runtimeInfo.isSecureContext,
        hasMediaDevicesApi: runtimeInfo.hasMediaDevicesApi,
        supportsGetUserMedia: runtimeInfo.supportsGetUserMedia,
        errorName: resolveErrorName(exception),
        message: resolveErrorMessage(exception, fallbackMessage),
        code: null,
        status: null,
        method: null,
        path: null,
        url: null,
        timestamp: new Date().toISOString(),
      }

      if (isLiveReadingApiError(exception)) {
        detail.code = exception.code
        detail.status = exception.status
        detail.method = exception.method
        detail.path = exception.path
        detail.url = exception.url
      }

      setFailureDetail(detail)
      console.error('[LiveReading][Failure]', detail, exception)

      return detail
    },
    [
      runtimeInfo.hasMediaDevicesApi,
      runtimeInfo.isSecureContext,
      runtimeInfo.label,
      runtimeInfo.supportsGetUserMedia,
    ],
  )

  const runMediaDiagnostics = useCallback(async (trigger: MediaProbeTrigger, runProbe: boolean) => {
    const hasNavigator = typeof navigator !== 'undefined'
    const mediaDevices = hasNavigator ? navigator.mediaDevices : undefined
    const getUserMediaFunctionType = typeof mediaDevices?.getUserMedia
    const getUserMediaCallable = getUserMediaFunctionType === 'function'

    const [cameraPermission, microphonePermission] = await Promise.all([
      queryMediaPermission('camera'),
      queryMediaPermission('microphone'),
    ])

    setMediaDiagnostics((current) => ({
      ...current,
      hasNavigator,
      hasMediaDevicesApi: !!mediaDevices,
      getUserMediaFunctionType,
      getUserMediaCallable,
      cameraPermission,
      microphonePermission,
      probeStatus: runProbe
        ? getUserMediaCallable
          ? 'running'
          : 'error'
        : current.probeStatus,
      probeErrorName: runProbe
        ? getUserMediaCallable
          ? null
          : 'NotSupportedError'
        : current.probeErrorName,
      probeErrorMessage: runProbe
        ? getUserMediaCallable
          ? null
          : 'navigator.mediaDevices.getUserMedia 不可用'
        : current.probeErrorMessage,
      lastCheckedAt: new Date().toISOString(),
      lastProbeTriggeredBy: trigger,
    }))

    if (!runProbe) {
      console.info('[LiveReading][MediaProbe]', {
        trigger,
        hasNavigator,
        hasMediaDevicesApi: !!mediaDevices,
        getUserMediaFunctionType,
        getUserMediaCallable,
        cameraPermission,
        microphonePermission,
      })
      return
    }

    if (!mediaDevices || !getUserMediaCallable) {
      return
    }

    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: true })
      stream.getTracks().forEach((track) => track.stop())
      const checkedAt = new Date().toISOString()

      setMediaDiagnostics((current) => ({
        ...current,
        probeStatus: 'success',
        probeErrorName: null,
        probeErrorMessage: null,
        lastCheckedAt: checkedAt,
        lastProbeTriggeredBy: trigger,
      }))

      console.info('[LiveReading][MediaProbe]', {
        trigger,
        hasNavigator,
        hasMediaDevicesApi: !!mediaDevices,
        getUserMediaFunctionType,
        getUserMediaCallable,
        cameraPermission,
        microphonePermission,
        probeStatus: 'success',
        checkedAt,
      })
    } catch (exception) {
      const checkedAt = new Date().toISOString()
      const errorName = resolveErrorName(exception)
      const errorMessage = resolveErrorMessage(exception, 'getUserMedia 调用失败')

      setMediaDiagnostics((current) => ({
        ...current,
        probeStatus: 'error',
        probeErrorName: errorName,
        probeErrorMessage: errorMessage,
        lastCheckedAt: checkedAt,
        lastProbeTriggeredBy: trigger,
      }))

      console.error('[LiveReading][MediaProbe]', {
        trigger,
        hasNavigator,
        hasMediaDevicesApi: !!mediaDevices,
        getUserMediaFunctionType,
        getUserMediaCallable,
        cameraPermission,
        microphonePermission,
        probeStatus: 'error',
        errorName,
        errorMessage,
        checkedAt,
      })
    }
  }, [])

  const selectedReader = useMemo(
    () => readers.find((reader) => reader.id === selectedReaderId) ?? null,
    [readers, selectedReaderId],
  )

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  )

  const mediaPublicationSummary: MediaPublicationSummary = (() => {
    const room = roomRef.current

    if (!room) {
      return {
        localCameraPublished: false,
        localMicrophonePublished: false,
        remoteParticipantCount: 0,
        remoteCameraPublishedCount: 0,
        remoteCameraSubscribedCount: 0,
      }
    }

    const localCameraPublication = room.localParticipant.getTrackPublication(Track.Source.Camera)
    const localMicrophonePublication = room.localParticipant.getTrackPublication(Track.Source.Microphone)
    let remoteCameraPublishedCount = 0
    let remoteCameraSubscribedCount = 0

    room.remoteParticipants.forEach((participant) => {
      const cameraPublication = participant.getTrackPublication(Track.Source.Camera)

      if (cameraPublication) {
        remoteCameraPublishedCount += 1
      }

      if (cameraPublication?.track && cameraPublication.track.kind === Track.Kind.Video) {
        remoteCameraSubscribedCount += 1
      }
    })

    return {
      localCameraPublished: !!localCameraPublication && !localCameraPublication.isMuted,
      localMicrophonePublished: !!localMicrophonePublication && !localMicrophonePublication.isMuted,
      remoteParticipantCount: room.remoteParticipants.size,
      remoteCameraPublishedCount,
      remoteCameraSubscribedCount,
    }
  })()

  const refreshCameraFacingState = useCallback(
    async (room: Room, fallbackFacingMode: CameraFacingMode) => {
      setCameraFacingMode(resolveLocalCameraFacingMode(room.localParticipant, fallbackFacingMode))

      try {
        const devices = await Room.getLocalDevices('videoinput', false)
        setCameraSwitchSupported(devices.length > 1)
      } catch {
        setCameraSwitchSupported(false)
      }
    },
    [],
  )

  const videoTiles = (() => {
    const room = roomRef.current

    if (!room) {
      return []
    }

    const tiles: VideoTileData[] = []

    tiles.push({
      id: room.localParticipant.identity,
      label: `${
        participantRole === 'READER' ? '你（占卜师）' : '你'
      } · ${cameraFacingMode === 'user' ? '前置镜像' : '后置非镜像'}`,
      track: getCameraVideoTrack(room.localParticipant),
      isLocal: true,
      mirrorPreview: cameraFacingMode === 'user',
    })

    room.remoteParticipants.forEach((participant) => {
      tiles.push({
        id: participant.identity,
        label: participant.name || participant.identity,
        track: getCameraVideoTrack(participant),
        isLocal: false,
        mirrorPreview: false,
      })
    })

    return tiles
  })()

  const bootstrapLiveReading = useCallback(async () => {
    const [readerList, deckList] = await Promise.all([getOnlineReaders(), getTarotDecks()])
    setReaders(readerList)
    setDecks(deckList)

    if (!selectedReaderId && readerList.length > 0) {
      setSelectedReaderId(readerList[0].id)
    }

    if (!selectedDeckId && deckList.length > 0) {
      setSelectedDeckId(deckList[0].id)
    }
  }, [selectedDeckId, selectedReaderId])

  useEffect(() => {
    if (!active) {
      return
    }

    void runMediaDiagnostics('auto', false)
  }, [active, runMediaDiagnostics])

  useEffect(() => {
    if (!active) {
      return
    }

    void bootstrapLiveReading().catch((exception: unknown) => {
      const detail = captureFailure('bootstrap-readers-decks', exception, '加载连线资源失败')
      setError(`[${detail.stageLabel}] ${detail.message}`)
    })
  }, [active, bootstrapLiveReading, captureFailure])

  useEffect(() => {
    if (!active || !auth) {
      return
    }

    void bootstrapLiveReading().catch((exception: unknown) => {
      const detail = captureFailure('login-refresh', exception, '登录后资源刷新失败')
      setError(`[${detail.stageLabel}] ${detail.message}`)
    })
  }, [active, auth, bootstrapLiveReading, captureFailure])

  useEffect(() => {
    if (active) {
      return
    }

    roomRef.current?.disconnect()
    roomRef.current = null
    setTrackVersion((value) => value + 1)
    setRoomState('idle')
    setError(null)
    setFailureDetail(null)
    setCameraSwitchSupported(false)
    setCameraFacingMode('user')
    setCameraSwitching(false)
  }, [active])

  useEffect(() => {
    return () => {
      if (effectTimerRef.current) {
        window.clearTimeout(effectTimerRef.current)
      }

      roomRef.current?.disconnect()
      roomRef.current = null
    }
  }, [])

  const applyEffect = (effectPreset: EffectPreset) => {
    setActiveEffect(effectPreset)

    if (effectTimerRef.current) {
      window.clearTimeout(effectTimerRef.current)
    }

    effectTimerRef.current = window.setTimeout(() => {
      setActiveEffect(null)
    }, 3400)
  }

  const connectRoom = async (sessionId: string, token: string) => {
    if (!supportsGetUserMedia) {
      const detail = captureFailure(
        'local-media-publish',
        new Error(unsupportedMediaMessage),
        unsupportedMediaMessage,
      )
      throw createStageError(detail)
    }

    let join: Awaited<ReturnType<typeof createCallJoinToken>>

    try {
      join = await createCallJoinToken(token, sessionId)
    } catch (exception) {
      const detail = captureFailure('join-token', exception, 'join-token 获取失败')
      throw createStageError(detail)
    }

    setParticipantRole(join.participantRole)
    setSession(join.session)
    setRoomState('connecting')

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })

    room.on(RoomEvent.ParticipantConnected, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.ParticipantDisconnected, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.TrackSubscribed, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.TrackUnsubscribed, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.LocalTrackPublished, () => {
      setTrackVersion((value) => value + 1)
      void refreshCameraFacingState(room, cameraFacingMode)
    })
    room.on(RoomEvent.LocalTrackUnpublished, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, exception) => {
      const detail = captureFailure(
        'remote-subscribe',
        exception ?? new Error(`远端轨道订阅失败: ${trackSid}`),
        '远端订阅失败',
      )
      const participantIdentity = participant?.identity ?? 'unknown-participant'
      setError(`[${detail.stageLabel}] ${detail.message} (${participantIdentity}/${trackSid})`)
    })

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === 'connected') {
        setRoomState('connected')
      } else if (state === 'disconnected') {
        setRoomState('disconnected')
      }
    })

    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const raw = new TextDecoder().decode(payload)
        const message = JSON.parse(raw) as CardRevealPayload

        if (message.type !== 'card_reveal') {
          return
        }

        setLastReveal(message)
        applyEffect(message.effectPreset)
      } catch {
        // Ignore malformed data packets.
      }
    })

    try {
      await room.connect(join.livekit.url, join.livekit.token)
    } catch (exception) {
      room.disconnect()
      setParticipantRole(null)
      setSession(null)
      setRoomState('idle')
      const detail = captureFailure('room-connect', exception, '房间连接失败')
      throw createStageError(detail)
    }

    try {
      await room.localParticipant.setCameraEnabled(true)
      await room.localParticipant.setMicrophoneEnabled(true)
      setMicEnabled(true)
      setCamEnabled(true)
      await refreshCameraFacingState(room, 'user')
    } catch (exception) {
      room.disconnect()
      setParticipantRole(null)
      setSession(null)
      setRoomState('idle')
      const detail = captureFailure(
        'local-media-publish',
        exception,
        '未能启用真实摄像头/麦克风，请检查系统权限后重试。',
      )
      throw createStageError(detail)
    }

    roomRef.current?.disconnect()
    roomRef.current = room
    setTrackVersion((value) => value + 1)
  }

  const startCall = async () => {
    if (!auth || !selectedReader || !selectedDeck) {
      return
    }

    setError(null)
    setFailureDetail(null)
    setBusy(true)

    try {
      const permissionResult = await requestAppPermissions(['camera', 'microphone'])
      const cameraGranted = permissionResult.camera.state === 'granted'
      const microphoneGranted = permissionResult.microphone.state === 'granted'

      if (!cameraGranted || !microphoneGranted) {
        const detail = captureFailure(
          'local-media-publish',
          new Error('请先授权摄像头与麦克风后再开始真人连线。'),
          '请先授权摄像头与麦克风后再开始真人连线。',
        )
        throw createStageError(detail)
      }

      const created = await createCallSession(auth.accessToken, selectedReader.id, selectedDeck.id)
      setSession(created)
      await connectRoom(created.id, auth.accessToken)
    } catch (exception) {
      if (isLiveReadingStageError(exception)) {
        const detail = exception.detail
        setFailureDetail(detail)
        setError(`[${detail.stageLabel}] ${detail.message}`)
      } else {
        const detail = captureFailure('create-session', exception, '创建会话失败')
        setError(`[${detail.stageLabel}] ${detail.message}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const joinCallBySessionId = async () => {
    if (!auth || !joinSessionId.trim()) {
      return
    }

    setError(null)
    setFailureDetail(null)
    setBusy(true)

    try {
      await connectRoom(joinSessionId.trim(), auth.accessToken)
    } catch (exception) {
      if (isLiveReadingStageError(exception)) {
        const detail = exception.detail
        setFailureDetail(detail)
        setError(`[${detail.stageLabel}] ${detail.message}`)
      } else {
        const detail = captureFailure('join-token', exception, '加入会话失败')
        setError(`[${detail.stageLabel}] ${detail.message}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const toggleMicrophone = async () => {
    const room = roomRef.current

    if (!room) {
      return
    }

    if (!supportsGetUserMedia) {
      setError(unsupportedMediaMessage)
      return
    }

    const next = !micEnabled

    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      setMicEnabled(next)
    } catch (exception) {
      const detail = captureFailure('local-media-publish', exception, '切换麦克风失败')
      setError(`[${detail.stageLabel}] ${detail.message}`)
    }
  }

  const toggleCamera = async () => {
    const room = roomRef.current

    if (!room) {
      return
    }

    if (!supportsGetUserMedia) {
      setError(unsupportedMediaMessage)
      return
    }

    const next = !camEnabled

    try {
      await room.localParticipant.setCameraEnabled(next)
      setCamEnabled(next)

      if (next) {
        await refreshCameraFacingState(room, cameraFacingMode)
      }

      setTrackVersion((value) => value + 1)
    } catch (exception) {
      const detail = captureFailure('local-media-publish', exception, '切换摄像头失败')
      setError(`[${detail.stageLabel}] ${detail.message}`)
    }
  }

  const switchCameraFacing = async () => {
    const room = roomRef.current

    if (!room) {
      return
    }

    if (!supportsGetUserMedia) {
      setError(unsupportedMediaMessage)
      return
    }

    setError(null)
    setCameraSwitching(true)

    try {
      const devices = await Room.getLocalDevices('videoinput', false)

      if (devices.length < 2) {
        setCameraSwitchSupported(false)
        throw new Error('当前设备未检测到可切换的前后摄像头。')
      }

      setCameraSwitchSupported(true)

      const target = resolveCameraSwitchTarget(
        devices,
        room.getActiveDevice('videoinput'),
        cameraFacingMode,
      )

      if (!target) {
        throw new Error('当前摄像头不可切换，请检查系统权限后重试。')
      }

      await room.switchActiveDevice('videoinput', target.deviceId)
      await refreshCameraFacingState(room, target.nextFacingMode)
      setTrackVersion((value) => value + 1)
    } catch (exception) {
      const detail = captureFailure('local-media-publish', exception, '切换前后摄失败')
      setError(`[${detail.stageLabel}] ${detail.message}`)
    } finally {
      setCameraSwitching(false)
    }
  }

  const handleReveal = async () => {
    if (!auth || !session?.drawnCard) {
      return
    }

    const payload: CardRevealPayload = {
      type: 'card_reveal',
      sessionId: session.id,
      cardId: session.drawnCard.id,
      archetype: session.drawnCard.archetype,
      effectPreset: session.drawnCard.effectPreset,
      triggeredBy: auth.user.id,
      ts: Date.now(),
    }

    setLastReveal(payload)
    applyEffect(payload.effectPreset)

    const room = roomRef.current

    if (room) {
      const bytes = new TextEncoder().encode(JSON.stringify(payload))
      await room.localParticipant.publishData(bytes, {
        topic: 'card_reveal',
        reliable: true,
      })
    }

    await submitRevealEvent(auth.accessToken, session.id, payload)
  }

  const leaveCall = async () => {
    if (!auth || !session) {
      return
    }

    setBusy(true)

    try {
      await endCallSession(auth.accessToken, session.id)
    } catch {
      // Ignore server shutdown errors on leave.
    }

    roomRef.current?.disconnect()
    roomRef.current = null
    setTrackVersion((value) => value + 1)
    setSession(null)
    setParticipantRole(null)
    setRoomState('idle')
    setBusy(false)
    setActiveEffect(null)
    setLastReveal(null)
    setFailureDetail(null)
    setError(null)
    setCameraSwitchSupported(false)
    setCameraFacingMode('user')
    setCameraSwitching(false)
  }

  const signOut = async () => {
    roomRef.current?.disconnect()
    roomRef.current = null
    setSession(null)
    setParticipantRole(null)
    setTrackVersion((value) => value + 1)
    setFailureDetail(null)
    setError(null)
    setCameraSwitchSupported(false)
    setCameraFacingMode('user')
    setCameraSwitching(false)
    try {
      await onLogout()
    } catch (exception) {
      console.warn('[LiveReading][Logout]', exception)
    }
  }

  const className = [
    'scene-panel',
    'scene-template-form',
    styles.liveReadingScene,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={onGoHome}
            aria-label="返回首页"
          >
            ←
          </button>
          <p className={styles.eyebrow}>LIVE READING</p>
          {auth ? (
            <button type="button" className={styles.outlineButton} onClick={() => void signOut()}>
              退出
            </button>
          ) : (
            <span className={styles.placeholderAction} />
          )}
        </header>

        <GlassPanel
          borderRadius={14}
          backgroundOpacity={0.12}
          saturation={1.24}
          className={styles.runtimeHintGlass}
          contentClassName={styles.runtimeHintPanel}
        >
          <p className={styles.runtimeHint}>
            运行时：{runtimeInfo.label} · 上下文：
            {runtimeInfo.isSecureContext ? '安全' : '非安全'} · 媒体能力：
            {supportsGetUserMedia ? '可用' : '不可用'}
          </p>
        </GlassPanel>
        <GlassPanel
          borderRadius={16}
          backgroundOpacity={0.12}
          saturation={1.24}
          className={styles.runtimeDiagnosticsGlass}
          contentClassName={styles.runtimeDiagnostics}
        >
          <div className={styles.runtimeDiagnosticsHeader}>
            <p>媒体诊断</p>
            <button
              type="button"
              className={styles.runtimeDiagnosticsButton}
              onClick={() => void runMediaDiagnostics('manual', true)}
              disabled={mediaDiagnostics.probeStatus === 'running'}
            >
              {mediaDiagnostics.probeStatus === 'running' ? '诊断中...' : '执行探测'}
            </button>
          </div>
          <p>navigator.mediaDevices：{mediaDiagnostics.hasMediaDevicesApi ? '存在' : '不存在'}</p>
          <p>
            getUserMedia：
            {mediaDiagnostics.getUserMediaCallable
              ? '存在且可调用'
              : `不可用（${mediaDiagnostics.getUserMediaFunctionType}）`}
          </p>
          <p>
            摄像头权限：{formatPermissionState(mediaDiagnostics.cameraPermission)} · 麦克风权限：
            {formatPermissionState(mediaDiagnostics.microphonePermission)}
          </p>
          <p>
            当前摄像头：{cameraFacingMode === 'user' ? '前置' : '后置'} · 本地预览：
            {cameraFacingMode === 'user' ? '镜像' : '非镜像'} · 前后摄切换：
            {cameraSwitchSupported ? '可切换' : '不可切换'}
          </p>
          <p>
            本地媒体发布：摄像头
            {mediaPublicationSummary.localCameraPublished ? '已发布' : '未发布'} · 麦克风
            {mediaPublicationSummary.localMicrophonePublished ? '已发布' : '未发布'}
          </p>
          <p>
            远端订阅：参与者 {mediaPublicationSummary.remoteParticipantCount} · 摄像头已发布{' '}
            {mediaPublicationSummary.remoteCameraPublishedCount} · 已订阅{' '}
            {mediaPublicationSummary.remoteCameraSubscribedCount}
          </p>
          {mediaDiagnostics.probeStatus === 'success' ? (
            <p>getUserMedia 探测：调用成功（已立即释放本地流）</p>
          ) : null}
          {mediaDiagnostics.probeStatus === 'error' ? (
            <p>
              getUserMedia 探测：{mediaDiagnostics.probeErrorName ?? 'UnknownError'} ·{' '}
              {mediaDiagnostics.probeErrorMessage ?? '未知错误'}
            </p>
          ) : null}
          {mediaDiagnostics.lastCheckedAt ? (
            <p>
              最近检查：{mediaDiagnostics.lastCheckedAt}（
              {mediaDiagnostics.lastProbeTriggeredBy === 'manual' ? '手动' : '自动'}）
            </p>
          ) : null}
        </GlassPanel>

        {!auth ? (
          <GlassPanel
            borderRadius={26}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={`${styles.panelGlass} ${styles.authPanelGlass}`}
            contentClassName={styles.authPanel}
          >
            <h2>真人连线占卜</h2>
            <p>当前真人连线已接入全局认证，请先在登录页完成认证后再进入。</p>
            <div className={styles.modeSwitch}>
              <button type="button" className={styles.modeActive} onClick={onGoLogin}>
                去登录
              </button>
            </div>
            <p className={styles.helperText}>
              固定测试用户：123@123.com / 123123
            </p>
          </GlassPanel>
        ) : !session ? (
          <GlassPanel
            borderRadius={26}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={`${styles.panelGlass} ${styles.setupPanelGlass}`}
            contentClassName={styles.setupPanel}
          >
            {auth.user.role === 'READER' ? (
              <div className={styles.block}>
                <h3>占卜师加入会话</h3>
                <label className={styles.fieldLabel}>
                  会话号
                  <input
                    value={joinSessionId}
                    onChange={(event) => setJoinSessionId(event.target.value)}
                    placeholder="输入用户端展示的会话号"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </label>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={joinCallBySessionId}
                  disabled={busy || !joinSessionId.trim()}
                >
                  {busy ? '正在加入...' : '按会话号加入'}
                </button>
              </div>
            ) : null}

            <div className={styles.block}>
              <h3>选择占卜师</h3>
              <div className={styles.readerGrid}>
                {readers.map((reader) => (
                  <button
                    type="button"
                    key={reader.id}
                    className={
                      selectedReaderId === reader.id ? styles.readerCardActive : styles.readerCard
                    }
                    onClick={() => setSelectedReaderId(reader.id)}
                  >
                    <img
                      src={reader.avatarUrl ?? '/favicon.svg'}
                      alt={reader.displayName}
                      className={styles.readerAvatar}
                    />
                    <div className={styles.readerMeta}>
                      <p>{reader.displayName}</p>
                      <span>{reader.specialties.join(' / ')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.block}>
              <h3>选择牌组</h3>
              <div className={styles.deckList}>
                {decks.map((deck) => (
                  <button
                    type="button"
                    key={deck.id}
                    className={selectedDeckId === deck.id ? styles.deckItemActive : styles.deckItem}
                    onClick={() => setSelectedDeckId(deck.id)}
                  >
                    <strong>{deck.name}</strong>
                    <span>{deck.description ?? '经典牌组'}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={startCall}
              disabled={busy || !selectedReader || !selectedDeck}
            >
              {busy ? '正在创建连线...' : '立即连线'}
            </button>
          </GlassPanel>
        ) : (
          <GlassPanel
            borderRadius={26}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={`${styles.panelGlass} ${styles.callPanelGlass}`}
            contentClassName={styles.callPanel}
          >
            <div className={styles.callStatusBar}>
              <p>
                房间状态：
                {roomState === 'connected'
                  ? '已连接'
                  : roomState === 'connecting'
                    ? '连接中'
                    : roomState === 'disconnected'
                      ? '已断开'
                      : '待加入'}
              </p>
              <p>会话号：{session.id.slice(0, 8)}</p>
            </div>

            <div className={styles.videoGrid}>
              {videoTiles.map((tile) => (
                <VideoTile key={tile.id} tile={tile} />
              ))}
            </div>

            {activeEffect ? (
              <div className={`${styles.effectOverlay} ${styles[`effect_${activeEffect}`]}`}>
                <p>{EFFECT_TITLES[activeEffect]}</p>
              </div>
            ) : null}

            <div className={styles.cardPanel}>
              <p className={styles.cardPanelTitle}>本次抽牌</p>
              {session.drawnCard ? (
                <div className={styles.cardMeta}>
                  <strong>{session.drawnCard.name}</strong>
                  <span>{session.drawnCard.meaningShort ?? '正在解读这张牌的能量。'}</span>
                </div>
              ) : (
                <div className={styles.cardMeta}>
                  <strong>待抽取</strong>
                  <span>进入会话后将自动抽取本次牌面。</span>
                </div>
              )}

              {participantRole === 'USER' && session.drawnCard ? (
                <button type="button" className={styles.revealButton} onClick={handleReveal}>
                  揭牌并同步特效
                </button>
              ) : (
                <p className={styles.helperText}>当前由用户端触发揭牌动作</p>
              )}

              {lastReveal ? (
                <p className={styles.revealHint}>
                  最近揭牌：{lastReveal.archetype} · {lastReveal.effectPreset}
                </p>
              ) : null}
            </div>

            <div className={styles.callActions}>
              <button type="button" className={styles.outlineButton} onClick={toggleMicrophone}>
                {micEnabled ? '关闭麦克风' : '打开麦克风'}
              </button>
              <button type="button" className={styles.outlineButton} onClick={toggleCamera}>
                {camEnabled ? '关闭摄像头' : '打开摄像头'}
              </button>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={switchCameraFacing}
                disabled={cameraSwitching || !camEnabled || !cameraSwitchSupported}
              >
                {cameraSwitching
                  ? '切换中...'
                  : cameraSwitchSupported
                    ? cameraFacingMode === 'user'
                      ? '切到后置'
                      : '切到前置'
                    : '前后摄不可切换'}
              </button>
              <button type="button" className={styles.dangerButton} onClick={leaveCall} disabled={busy}>
                挂断
              </button>
            </div>
          </GlassPanel>
        )}

        {failureDetail ? (
          <GlassPanel
            borderRadius={16}
            backgroundOpacity={0.12}
            saturation={1.22}
            className={styles.failureDetailGlass}
            contentClassName={styles.failureDetailCard}
          >
            <p className={styles.failureDetailTitle}>失败阶段：{failureDetail.stageLabel}</p>
            <p>
              错误：{failureDetail.errorName} · {failureDetail.message}
            </p>
            <p>
              请求：{failureDetail.method ?? 'N/A'} {failureDetail.path ?? '-'}
            </p>
            <p>请求 URL：{failureDetail.url ?? 'N/A'}</p>
            <p>
              状态：{failureDetail.status ?? 'network/no-status'} · 代码：
              {failureDetail.code ?? 'N/A'}
            </p>
            <p>
              运行时：{failureDetail.runtimeLabel} · 上下文：
              {failureDetail.secureContext ? '安全' : '非安全'} · mediaDevices：
              {failureDetail.hasMediaDevicesApi ? '存在' : '不存在'} · getUserMedia：
              {failureDetail.supportsGetUserMedia ? '可用' : '不可用'}
            </p>
            <p>时间：{failureDetail.timestamp}</p>
          </GlassPanel>
        ) : null}
      </div>
    </section>
  )
}
