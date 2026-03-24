import { useCallback, useEffect, useRef, useState } from 'react'

const AUDIO_STORAGE_KEY = 'dreamkeeper.audio-muted.v1'

interface AmbientAudioState {
  muted: boolean
  ready: boolean
  activate: () => Promise<void>
  toggleMuted: () => Promise<void>
}

function readInitialMuted() {
  if (typeof window === 'undefined') {
    return true
  }

  const rawValue = window.localStorage.getItem(AUDIO_STORAGE_KEY)
  return rawValue ? rawValue === 'true' : true
}

export function useAmbientAudio(): AmbientAudioState {
  const [muted, setMuted] = useState(readInitialMuted)
  const [ready, setReady] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const outputRef = useRef<GainNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)
  const lfoGainRef = useRef<GainNode | null>(null)
  const toneARef = useRef<OscillatorNode | null>(null)
  const toneBRef = useRef<OscillatorNode | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(muted))
    }
  }, [muted])

  const ensureAudioGraph = useCallback(async () => {
    if (contextRef.current && outputRef.current) {
      if (contextRef.current.state === 'suspended') {
        await contextRef.current.resume()
      }

      return
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext

    if (!AudioContextClass) {
      return
    }

    const context = new AudioContextClass()
    const output = context.createGain()
    output.gain.value = muted ? 0 : 0.012
    output.connect(context.destination)

    const toneA = context.createOscillator()
    toneA.type = 'sine'
    toneA.frequency.value = 164

    const toneB = context.createOscillator()
    toneB.type = 'triangle'
    toneB.frequency.value = 246

    const toneAGain = context.createGain()
    toneAGain.gain.value = 0.36
    const toneBGain = context.createGain()
    toneBGain.gain.value = 0.22

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 540
    filter.Q.value = 0.3

    const lfo = context.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.07
    const lfoGain = context.createGain()
    lfoGain.gain.value = 26

    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    toneA.connect(toneAGain)
    toneB.connect(toneBGain)
    toneAGain.connect(filter)
    toneBGain.connect(filter)
    filter.connect(output)

    toneA.start()
    toneB.start()
    lfo.start()

    contextRef.current = context
    outputRef.current = output
    lfoRef.current = lfo
    lfoGainRef.current = lfoGain
    toneARef.current = toneA
    toneBRef.current = toneB

    setReady(true)
  }, [muted])

  useEffect(() => {
    const output = outputRef.current

    if (!output) {
      return
    }

    const context = contextRef.current

    if (!context) {
      return
    }

    output.gain.cancelScheduledValues(context.currentTime)
    output.gain.linearRampToValueAtTime(muted ? 0 : 0.012, context.currentTime + 0.35)
  }, [muted])

  useEffect(() => {
    return () => {
      toneARef.current?.stop()
      toneBRef.current?.stop()
      lfoRef.current?.stop()
      contextRef.current?.close()
    }
  }, [])

  const activate = useCallback(async () => {
    await ensureAudioGraph()
  }, [ensureAudioGraph])

  const toggleMuted = useCallback(async () => {
    await ensureAudioGraph()
    setMuted((previous) => !previous)
  }, [ensureAudioGraph])

  return {
    muted,
    ready,
    activate,
    toggleMuted,
  }
}
