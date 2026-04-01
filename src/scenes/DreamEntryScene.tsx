import { useMemo, useState } from 'react'
import { ServicesStackedCards } from '../components/ServicesStackedCards'
import type { EnterTransitionPhase } from '../hooks/useEnterTransition'
import { ASSISTANT_QUESTIONS, createRefinedPrompt } from '../services/dreamAssistantService'
import type { RawDreamInput } from '../types/dream'

interface DreamEntrySceneProps {
  active: boolean
  phase: 'dreamEntry' | 'assistantRefine'
  keyboardOpen: boolean
  initialInput: RawDreamInput
  initialRefinedText: string
  homeIntroActive: boolean
  homeIntroPhase: EnterTransitionPhase
  onPhaseChange: (phase: 'dreamEntry' | 'assistantRefine') => void
  onVisualize: (payload: { rawInput: RawDreamInput; refinedText: string }) => void
}

export function DreamEntryScene({
  active,
  phase,
  keyboardOpen,
  initialInput,
  initialRefinedText,
  homeIntroActive,
  homeIntroPhase,
  onPhaseChange,
  onVisualize,
}: DreamEntrySceneProps) {
  const [input, setInput] = useState(initialInput)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [refinedText, setRefinedText] = useState(initialRefinedText)
  const [homeScrollContainer, setHomeScrollContainer] = useState<HTMLDivElement | null>(null)

  const autoRefined = useMemo(() => createRefinedPrompt(input), [input])

  const currentQuestion = ASSISTANT_QUESTIONS[questionIndex]
  const isRefineEditor = questionIndex >= ASSISTANT_QUESTIONS.length
  const stageKey =
    phase === 'dreamEntry'
      ? 'home'
      : isRefineEditor
        ? 'refined'
        : currentQuestion?.id ?? 'assistant'

  const updateField = (field: keyof RawDreamInput, value: string) => {
    setInput((previous) => ({
      ...previous,
      [field]: value,
    }))
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
    'scene-template-form',
    'dream-entry-scene',
    active ? 'is-active' : '',
    phase === 'assistantRefine' ? 'is-refining' : 'is-home',
    keyboardOpen ? 'is-keyboard-open' : '',
    homeIntroActive && phase === 'dreamEntry' ? 'home-intro-active' : '',
    homeIntroActive && phase === 'dreamEntry' && homeIntroPhase !== 'idle'
      ? `home-intro-phase-${homeIntroPhase}`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={panelClassName}>
      {phase === 'dreamEntry' ? (
        <div className="home-scene-shell" key={stageKey} ref={setHomeScrollContainer}>
          <div className="home-scene-content">
            <header className="home-scene-copy">
              <p className="home-scene-eyebrow">Dreamkeeper Tarot</p>
              <h2 className="home-scene-title">抽取一张牌，捕捉今晚的潜意识引力。</h2>
              <p className="home-scene-subtitle">
                拖拽卡面感受直觉流向，停在最有回应的那张，开始本次梦境占卜。
              </p>
            </header>

            <button
              type="button"
              className="primary-pill home-scene-cta"
              onClick={() => onPhaseChange('assistantRefine')}
            >
              Start Reading
            </button>

            <ServicesStackedCards
              scrollContainer={homeScrollContainer}
              className="home-scene-stacked-cards"
              ariaLabel="Tarot services stacked cards"
            />
          </div>
        </div>
      ) : (
        <div className="entry-shell" key={stageKey}>
          <div className="entry-shell-glow entry-shell-glow-a" aria-hidden />
          <div className="entry-shell-glow entry-shell-glow-b" aria-hidden />
          <div className="entry-shell-grain" aria-hidden />

          <header className="entry-header entry-assistant-header">
            <p className="entry-eyebrow">Dream Assistant</p>
            <h2>引导式梦境解析</h2>
            <p>完善细节后即可生成本次梦境视觉。</p>
          </header>

          <div className="entry-stage">
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
          </div>
        </div>
      )}
    </section>
  )
}
