import { useMemo, useState } from 'react'
import type { EnterTransitionPhase } from '../hooks/useEnterTransition'
import { ASSISTANT_QUESTIONS, createRefinedPrompt } from '../services/dreamAssistantService'
import type { RawDreamInput } from '../types/dream'

interface DreamEntrySceneProps {
  active: boolean
  enterTransitionActive?: boolean
  enterTransitionPhase?: EnterTransitionPhase
  phase: 'dreamEntry' | 'assistantRefine'
  keyboardOpen: boolean
  initialInput: RawDreamInput
  initialRefinedText: string
  onPhaseChange: (phase: 'dreamEntry' | 'assistantRefine') => void
  onVisualize: (payload: { rawInput: RawDreamInput; refinedText: string }) => void
}

export function DreamEntryScene({
  active,
  enterTransitionActive = false,
  enterTransitionPhase = 'idle',
  phase,
  keyboardOpen,
  initialInput,
  initialRefinedText,
  onPhaseChange,
  onVisualize,
}: DreamEntrySceneProps) {
  const [input, setInput] = useState(initialInput)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [refinedText, setRefinedText] = useState(initialRefinedText)

  const autoRefined = useMemo(() => createRefinedPrompt(input), [input])

  const currentQuestion = ASSISTANT_QUESTIONS[questionIndex]
  const isRefineEditor = questionIndex >= ASSISTANT_QUESTIONS.length
  const stageKey =
    phase === 'dreamEntry'
      ? 'memory'
      : isRefineEditor
        ? 'refined'
        : currentQuestion?.id ?? 'assistant'
  const isEnterPreview = enterTransitionActive && !active

  const updateField = (field: keyof RawDreamInput, value: string) => {
    setInput((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const proceedFromMemory = () => {
    setQuestionIndex(0)
    onPhaseChange('assistantRefine')
  }

  const moveNext = () => {
    if (questionIndex >= ASSISTANT_QUESTIONS.length - 1) {
      setQuestionIndex(ASSISTANT_QUESTIONS.length)
      if (!refinedText.trim()) {
        setRefinedText(autoRefined.text)
      }
      return
    }

    setQuestionIndex((previous) => previous + 1)
  }

  const moveBack = () => {
    if (isRefineEditor) {
      setQuestionIndex(ASSISTANT_QUESTIONS.length - 1)
      return
    }

    if (questionIndex === 0) {
      onPhaseChange('dreamEntry')
      return
    }

    setQuestionIndex((previous) => previous - 1)
  }

  const submit = () => {
    onVisualize({
      rawInput: input,
      refinedText: refinedText.trim() || autoRefined.text,
    })
  }

  const panelClassName = [
    'scene-panel',
    'dream-entry-scene',
    active ? 'is-active' : '',
    isEnterPreview ? 'is-enter-preview' : '',
    isEnterPreview && enterTransitionPhase !== 'idle'
      ? `enter-transition-phase-${enterTransitionPhase}`
      : '',
    phase === 'assistantRefine' ? 'is-refining' : '',
    keyboardOpen ? 'is-keyboard-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={panelClassName}>
      <div className="entry-shell">
        <div className="entry-shell-glow entry-shell-glow-a" aria-hidden />
        <div className="entry-shell-glow entry-shell-glow-b" aria-hidden />
        <div className="entry-shell-grain" aria-hidden />
        <header className="entry-header">
          <p className="entry-eyebrow">Dream Assistant</p>
          <h2>Let&apos;s reconstruct the dream together</h2>
          <p>
            Trace fragments first, then we will distill a cinematic description for
            visualization.
          </p>
        </header>

        <div key={stageKey} className="entry-stage">
          {phase === 'dreamEntry' ? (
            <div className="entry-memory-step">
              <label htmlFor="dream-memory-input">What do you remember most vividly?</label>
              <textarea
                id="dream-memory-input"
                value={input.memory}
                onChange={(event) => updateField('memory', event.target.value)}
                placeholder="A corridor made of moonlight, an old friend calling my name..."
                rows={5}
              />
              <p className="entry-whisper">
                Whisper fragments first. Precision can come later.
              </p>
              <div className="entry-memory-actions entry-mobile-sticky">
                <button type="button" className="ghost-chip">
                  Voice Soon
                </button>
                <button
                  type="button"
                  className="primary-pill"
                  onClick={proceedFromMemory}
                  disabled={input.memory.trim().length < 8}
                >
                  Begin Guidance
                </button>
              </div>
            </div>
          ) : (
            <div className="assistant-refine-step">
              {!isRefineEditor && currentQuestion ? (
                <>
                  <div className="assistant-progress">
                    <span>
                      {questionIndex + 1} / {ASSISTANT_QUESTIONS.length}
                    </span>
                    <div className="assistant-progress-bar">
                      <div
                        className="assistant-progress-bar-fill"
                        style={{
                          width: `${((questionIndex + 1) / ASSISTANT_QUESTIONS.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="assistant-question-title">{currentQuestion.title}</p>
                  <label htmlFor={`assistant-${currentQuestion.id}`} className="assistant-question">
                    {currentQuestion.prompt}
                  </label>
                  <input
                    id={`assistant-${currentQuestion.id}`}
                    type="text"
                    value={input[currentQuestion.id]}
                    onChange={(event) => updateField(currentQuestion.id, event.target.value)}
                    placeholder={currentQuestion.placeholder}
                  />
                  <div className="assistant-chips">
                    {currentQuestion.chips.map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        className="ghost-chip"
                        onClick={() => updateField(currentQuestion.id, chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="assistant-actions entry-mobile-sticky">
                    <button type="button" className="secondary-pill" onClick={moveBack}>
                      Back
                    </button>
                    <button type="button" className="primary-pill" onClick={moveNext}>
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="assistant-question-title">Refined dream prompt</p>
                  <p className="assistant-refined-help">
                    Edit this distilled version before generation.
                  </p>
                  <textarea
                    value={refinedText || autoRefined.text}
                    onChange={(event) => setRefinedText(event.target.value)}
                    rows={8}
                  />
                  <div className="assistant-summary">
                    <span>{autoRefined.summary}</span>
                  </div>
                  <div className="assistant-actions entry-mobile-sticky">
                    <button type="button" className="secondary-pill" onClick={moveBack}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="primary-pill"
                      onClick={submit}
                      disabled={!(refinedText.trim() || autoRefined.text.trim())}
                    >
                      Visualize Dream
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
