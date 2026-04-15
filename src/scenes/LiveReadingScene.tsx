import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
  loadStoredAuth,
  loginWithEmail,
  registerWithEmail,
  saveStoredAuth,
  submitRevealEvent,
} from '../services/liveReadingApi'
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
  onGoHome: () => void
}

interface VideoTileData {
  id: string
  label: string
  track: VideoTrack | null
  isLocal: boolean
}

interface SimulatorVideoFeed {
  track: MediaStreamTrack
  stop: () => void
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

function getCameraVideoTrack(participant: Participant): VideoTrack | null {
  const publication = participant.getTrackPublication(Track.Source.Camera)

  if (!publication?.track || publication.track.kind !== Track.Kind.Video) {
    return null
  }

  return publication.track as VideoTrack
}

function createSimulatorVideoFeed(label: string): SimulatorVideoFeed | null {
  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 1280

  const context = canvas.getContext('2d')

  if (!context || typeof canvas.captureStream !== 'function') {
    return null
  }

  let rafId = 0
  const startTime = performance.now()

  const render = (timestamp: number) => {
    const elapsed = (timestamp - startTime) / 1000
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.15)
    const drift = Math.sin(elapsed * 0.7) * 42

    context.clearRect(0, 0, canvas.width, canvas.height)

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#0d1a46')
    gradient.addColorStop(0.58, '#223a88')
    gradient.addColorStop(1, '#4da7eb')
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.globalAlpha = 0.28 + pulse * 0.25
    context.fillStyle = '#b0d1ff'
    context.beginPath()
    context.arc(canvas.width * 0.5 + drift, canvas.height * 0.38, 220 + pulse * 110, 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 1

    context.fillStyle = '#eaf3ff'
    context.font = "700 64px 'Outfit', sans-serif"
    context.textAlign = 'center'
    context.fillText(label, canvas.width * 0.5, canvas.height * 0.86)

    context.font = "500 34px 'Outfit', sans-serif"
    context.fillStyle = '#cfe0ff'
    context.fillText('Simulator Video Stream', canvas.width * 0.5, canvas.height * 0.91)

    rafId = requestAnimationFrame(render)
  }

  rafId = requestAnimationFrame(render)

  const stream = canvas.captureStream(20)
  const track = stream.getVideoTracks()[0]

  if (!track) {
    cancelAnimationFrame(rafId)
    return null
  }

  return {
    track,
    stop: () => {
      cancelAnimationFrame(rafId)
      track.stop()
    },
  }
}

function VideoTile({ tile }: { tile: VideoTileData }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

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
        <video ref={videoRef} autoPlay playsInline muted={tile.isLocal} className={styles.videoNode} />
      ) : (
        <div className={styles.videoPlaceholder}>等待视频流...</div>
      )}
      <div className={styles.videoLabel}>{tile.label}</div>
    </article>
  )
}

export function LiveReadingScene({ active, onGoHome }: LiveReadingSceneProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState<AuthPayload | null>(() => loadStoredAuth())
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
  const supportsGetUserMedia =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'

  const roomRef = useRef<Room | null>(null)
  const simulatorVideoFeedRef = useRef<SimulatorVideoFeed | null>(null)
  const effectTimerRef = useRef<number | null>(null)

  const selectedReader = useMemo(
    () => readers.find((reader) => reader.id === selectedReaderId) ?? null,
    [readers, selectedReaderId],
  )

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  )

  const videoTiles = (() => {
    const room = roomRef.current

    if (!room) {
      return []
    }

    const tiles: VideoTileData[] = []

    tiles.push({
      id: room.localParticipant.identity,
      label: participantRole === 'READER' ? '你（占卜师）' : '你',
      track: getCameraVideoTrack(room.localParticipant),
      isLocal: true,
    })

    room.remoteParticipants.forEach((participant) => {
      tiles.push({
        id: participant.identity,
        label: participant.name || participant.identity,
        track: getCameraVideoTrack(participant),
        isLocal: false,
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

    void bootstrapLiveReading().catch((exception: unknown) => {
      const message = exception instanceof Error ? exception.message : '加载连线资源失败'
      setError(message)
    })
  }, [active, bootstrapLiveReading])

  useEffect(() => {
    if (!active || !auth) {
      return
    }

    void bootstrapLiveReading().catch((exception: unknown) => {
      const message = exception instanceof Error ? exception.message : '加载占卜师列表失败'
      setError(message)
    })
  }, [active, auth, bootstrapLiveReading])

  useEffect(() => {
    if (active) {
      return
    }

    if (simulatorVideoFeedRef.current) {
      simulatorVideoFeedRef.current.stop()
      simulatorVideoFeedRef.current = null
    }

    roomRef.current?.disconnect()
    roomRef.current = null
    setTrackVersion((value) => value + 1)
    setRoomState('idle')
  }, [active])

  useEffect(() => {
    return () => {
      if (effectTimerRef.current) {
        window.clearTimeout(effectTimerRef.current)
      }

      if (simulatorVideoFeedRef.current) {
        simulatorVideoFeedRef.current.stop()
        simulatorVideoFeedRef.current = null
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
    const join = await createCallJoinToken(token, sessionId)
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
    room.on(RoomEvent.LocalTrackPublished, () => setTrackVersion((value) => value + 1))
    room.on(RoomEvent.LocalTrackUnpublished, () => setTrackVersion((value) => value + 1))

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

    await room.connect(join.livekit.url, join.livekit.token)

    if (supportsGetUserMedia) {
      await room.localParticipant.setCameraEnabled(true)
      await room.localParticipant.setMicrophoneEnabled(true)
      setMicEnabled(true)
      setCamEnabled(true)
      if (simulatorVideoFeedRef.current) {
        simulatorVideoFeedRef.current.stop()
        simulatorVideoFeedRef.current = null
      }
    } else {
      setMicEnabled(false)

      const simulatorFeed = createSimulatorVideoFeed(
        join.participantRole === 'READER' ? 'Reader Simulator' : 'User Simulator',
      )

      if (simulatorFeed) {
        await room.localParticipant.publishTrack(simulatorFeed.track, {
          source: Track.Source.Camera,
          name: 'simulator-camera',
        })
        simulatorVideoFeedRef.current?.stop()
        simulatorVideoFeedRef.current = simulatorFeed
        setCamEnabled(true)
        setError('当前为模拟器模式：已启用虚拟视频流用于双端联调')
      } else {
        setCamEnabled(false)
        setError('当前环境不支持摄像头/麦克风采集，已降级为仅信令与特效同步模式')
      }
    }

    roomRef.current?.disconnect()
    roomRef.current = room
    setTrackVersion((value) => value + 1)
  }

  const submitAuth = async () => {
    setError(null)
    setBusy(true)

    try {
      const payload =
        authMode === 'register'
          ? await registerWithEmail(email, password)
          : await loginWithEmail(email, password)

      setAuth(payload)
      saveStoredAuth(payload)
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : '登录失败'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const startCall = async () => {
    if (!auth || !selectedReader || !selectedDeck) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      const created = await createCallSession(auth.accessToken, selectedReader.id, selectedDeck.id)
      setSession(created)
      await connectRoom(created.id, auth.accessToken)
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : '创建会话失败'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const joinCallBySessionId = async () => {
    if (!auth || !joinSessionId.trim()) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      await connectRoom(joinSessionId.trim(), auth.accessToken)
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : '加入会话失败'
      setError(message)
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
      setError('当前环境不支持麦克风采集')
      return
    }

    const next = !micEnabled
    await room.localParticipant.setMicrophoneEnabled(next)
    setMicEnabled(next)
  }

  const toggleCamera = async () => {
    const room = roomRef.current

    if (!room) {
      return
    }

    if (!supportsGetUserMedia) {
      if (simulatorVideoFeedRef.current) {
        await room.localParticipant.unpublishTrack(simulatorVideoFeedRef.current.track, true)
        simulatorVideoFeedRef.current.stop()
        simulatorVideoFeedRef.current = null
        setCamEnabled(false)
        setTrackVersion((value) => value + 1)
        return
      }

      const simulatorFeed = createSimulatorVideoFeed(
        participantRole === 'READER' ? 'Reader Simulator' : 'User Simulator',
      )

      if (!simulatorFeed) {
        setError('当前环境不支持摄像头采集')
        return
      }

      await room.localParticipant.publishTrack(simulatorFeed.track, {
        source: Track.Source.Camera,
        name: 'simulator-camera',
      })
      simulatorVideoFeedRef.current = simulatorFeed
      setCamEnabled(true)
      setTrackVersion((value) => value + 1)
      return
    }

    const next = !camEnabled
    await room.localParticipant.setCameraEnabled(next)
    setCamEnabled(next)
    setTrackVersion((value) => value + 1)
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
    if (simulatorVideoFeedRef.current) {
      simulatorVideoFeedRef.current.stop()
      simulatorVideoFeedRef.current = null
    }
    setTrackVersion((value) => value + 1)
    setSession(null)
    setParticipantRole(null)
    setRoomState('idle')
    setBusy(false)
    setActiveEffect(null)
    setLastReveal(null)
  }

  const signOut = () => {
    roomRef.current?.disconnect()
    roomRef.current = null
    if (simulatorVideoFeedRef.current) {
      simulatorVideoFeedRef.current.stop()
      simulatorVideoFeedRef.current = null
    }
    setSession(null)
    setParticipantRole(null)
    setAuth(null)
    saveStoredAuth(null)
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
          <button type="button" className={styles.backButton} onClick={onGoHome}>
            返回首页
          </button>
          <p className={styles.eyebrow}>LIVE READING</p>
          {auth ? (
            <button type="button" className={styles.outlineButton} onClick={signOut}>
              退出
            </button>
          ) : (
            <span className={styles.placeholderAction} />
          )}
        </header>

        {!auth ? (
          <div className={styles.authPanel}>
            <h2>真人连线占卜</h2>
            <p>邮箱密码登录后可直接发起 1v1 视频咨询。</p>
            <div className={styles.modeSwitch}>
              <button
                type="button"
                className={authMode === 'login' ? styles.modeActive : styles.modeButton}
                onClick={() => setAuthMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={authMode === 'register' ? styles.modeActive : styles.modeButton}
                onClick={() => setAuthMode('register')}
              >
                注册
              </button>
            </div>
            <label className={styles.fieldLabel}>
              邮箱
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>
            <label className={styles.fieldLabel}>
              密码
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            <button type="button" className={styles.primaryButton} onClick={submitAuth} disabled={busy}>
              {busy ? '提交中...' : authMode === 'register' ? '注册并进入' : '登录并进入'}
            </button>
            <p className={styles.helperText}>占卜师测试账号：test2@123.com / test123</p>
          </div>
        ) : !session ? (
          <div className={styles.setupPanel}>
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
          </div>
        ) : (
          <div className={styles.callPanel}>
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
              <button type="button" className={styles.dangerButton} onClick={leaveCall} disabled={busy}>
                挂断
              </button>
            </div>
          </div>
        )}

        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </section>
  )
}
