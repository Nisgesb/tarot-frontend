import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CelestialTarotArcFlow,
  type CelestialTarotArcFlowRevealedCard,
} from "../components/CelestialTarotArcFlow";
import { resolveAiReadingCardFront } from "../components/CelestialTarotArcFlow/aiReadingCardFronts";
import { GlassPanel } from "../components/GlassPanel";
import {
  createAiReadingSession,
  generateAiReading,
  loadStoredAiReadingAnonymousSessionId,
  saveStoredAiReadingAnonymousSessionId,
} from "../services/aiReadingApi";
import type {
  CreateAiReadingSessionResponse,
  SpreadCardItem,
} from "../types/aiReading";
import { Toast } from "../components/toast";
import styles from "./AiReadingScene.module.css";

interface AiReadingSceneProps {
  active: boolean;
  onGoHome?: () => void;
}

function QuestionGlyph() {
  return (
    <svg viewBox="0 0 14 14" width={14} height={14} fill="none" aria-hidden>
      <path
        d="M4.5 5.4C4.5 4 5.6 3 7 3C8.4 3 9.5 4 9.5 5.4C9.5 6.6 8.7 7.2 7.7 7.6C7.2 7.8 7 8.2 7 8.7"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="10.8" r="0.85" fill="currentColor" />
    </svg>
  );
}

function Sparkle({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 0.5L6.95 4.55L11 5.5L6.95 6.45L6 10.5L5.05 6.45L1 5.5L5.05 4.55Z" />
    </svg>
  );
}

function LockGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" aria-hidden>
      <rect
        x="2.5"
        y="5.5"
        width="7"
        height="5"
        rx="1.2"
        stroke="currentColor"
        strokeWidth={1.1}
      />
      <path
        d="M4 5.5V4C4 2.9 4.9 2 6 2C7.1 2 8 2.9 8 4V5.5"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
      />
      <circle cx="6" cy="7.8" r="0.7" fill="currentColor" />
    </svg>
  );
}

function RefreshGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} fill="none" aria-hidden>
      <path
        d="M11.2 4.4A4.6 4.6 0 0 0 3 3.2L2.1 4.4"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.1 2.4V4.4H4.1"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.8 9.6A4.6 4.6 0 0 0 11 10.8L11.9 9.6"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9 11.6V9.6H9.9"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SuggestionIcon = "star" | "heart" | "work" | "leaf";

function SuggestionGlyph({ type }: { type: SuggestionIcon }) {
  if (type === "heart") {
    return (
      <svg viewBox="0 0 18 18" width={18} height={18} fill="none" aria-hidden>
        <path
          d="M9 14.6S3.2 11.3 3.2 6.9C3.2 5.2 4.4 4 6 4C7.1 4 8.2 4.7 9 5.9C9.8 4.7 10.9 4 12 4C13.6 4 14.8 5.2 14.8 6.9C14.8 11.3 9 14.6 9 14.6Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "work") {
    return (
      <svg viewBox="0 0 18 18" width={18} height={18} fill="none" aria-hidden>
        <path
          d="M5.5 6.2V4.8C5.5 4 6.1 3.4 6.9 3.4H11.1C11.9 3.4 12.5 4 12.5 4.8V6.2"
          stroke="currentColor"
          strokeWidth={1.45}
          strokeLinecap="round"
        />
        <rect
          x="3"
          y="6.2"
          width="12"
          height="8.4"
          rx="1.8"
          stroke="currentColor"
          strokeWidth={1.45}
        />
        <path
          d="M7.2 9.4H10.8"
          stroke="currentColor"
          strokeWidth={1.45}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "leaf") {
    return (
      <svg viewBox="0 0 18 18" width={18} height={18} fill="none" aria-hidden>
        <path
          d="M14.9 3.1C9.6 3.1 4.6 5.4 4.6 10.2C4.6 12.1 6 13.4 7.8 13.4C11.7 13.4 14.4 8.2 14.9 3.1Z"
          stroke="currentColor"
          strokeWidth={1.45}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.1 14.9C5.4 11.4 8 8.9 11.5 6.9"
          stroke="currentColor"
          strokeWidth={1.45}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="none" aria-hidden>
      <path
        d="M9 2.7L10.6 7.3L15.3 9L10.6 10.7L9 15.3L7.4 10.7L2.7 9L7.4 7.3L9 2.7Z"
        stroke="currentColor"
        strokeWidth={1.45}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={styles.ctaSpinner}
    >
      <circle
        cx="7"
        cy="7"
        r="5"
        stroke="currentColor"
        strokeOpacity={0.32}
        strokeWidth={1.4}
      />
      <path
        d="M12 7C12 4.24 9.76 2 7 2"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

type AiReadingPhase = "question" | "draw" | "reading";

const DRAW_COMPLETION_DELAY_MS = 1600;
const SUGGESTION_FILL_DELAY_MS = 120;
const SUGGESTION_PULSE_CLEAR_MS = 520;
const SUGGESTION_FLOW_CLEAR_MS = 170;
const QUESTION_SUGGESTION_BATCHES: Array<
  Array<{ id: string; icon: SuggestionIcon; text: string }>
> = [
  [
    {
      id: "choice",
      icon: "star",
      text: "我该如何做选择？",
    },
    {
      id: "relationship",
      icon: "heart",
      text: "关系接下来会怎样？",
    },
    {
      id: "work",
      icon: "work",
      text: "事业会迎来什么？",
    },
    {
      id: "release",
      icon: "leaf",
      text: "我需要放下什么？",
    },
  ],
  [
    {
      id: "self",
      icon: "star",
      text: "我现在该看清什么？",
    },
    {
      id: "boundary",
      icon: "heart",
      text: "关系里我该守住什么？",
    },
    {
      id: "timing",
      icon: "work",
      text: "现在推进计划合适吗？",
    },
    {
      id: "energy",
      icon: "leaf",
      text: "我该怎样恢复能量？",
    },
  ],
];

function removeTrailingUnclosedBold(value: string) {
  const markerMatches = value.match(/\*\*/g);

  if (!markerMatches || markerMatches.length % 2 === 0) {
    return value;
  }

  return value.replace(/\*\*([^*\n]*)$/, "$1");
}

function removeLastUnbalancedStrongMarker(value: string) {
  const matches = [...value.matchAll(/\*\*/g)];

  if (matches.length % 2 === 0) {
    return value;
  }

  const lastMatch = matches[matches.length - 1];

  if (!lastMatch || typeof lastMatch.index !== "number") {
    return value;
  }

  return value.slice(0, lastMatch.index) + value.slice(lastMatch.index + 2);
}

function removeDanglingInlineMarkdown(value: string) {
  return value
    .replace(/(^|[\s(（[【])\*([^*\n]*)$/, "$1$2")
    .replace(/(^|[\s(（[【])_([^_\n]*)$/, "$1$2")
    .replace(/(^|[\s(（[【])`([^`\n]*)$/, "$1$2");
}

function normalizeHeadingPlacement(value: string) {
  return value
    .replace(/([^\n])\s*(#{1,6}\s*[A-Za-z\u4e00-\u9fff])/g, "$1\n\n$2")
    .replace(/\n\s*(#{1,6})\s*\n\s*([^\n#][^\n]*)/g, "\n$1 $2")
    .replace(/^(\s*#{1,6})\s*[-—–_|丨·,，。:：;；]+\s*([^\n]*)$/gm, "$1 $2");
}

function trimStreamingTailFragment(value: string) {
  const lines = value.split("\n");

  if (lines.length === 0) {
    return value;
  }

  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex]?.trim() ?? "";

  if (!lastLine) {
    return value;
  }

  const looksIncomplete =
    /^([#>*-]|\d+\.)$/.test(lastLine) ||
    /^[,，.。;；:：!！?？、]+$/.test(lastLine) ||
    /[`*_]$/.test(lastLine) ||
    /[\u4e00-\u9fffA-Za-z0-9][,，、]$/.test(lastLine) ||
    (lastLine.length <= 2 &&
      /[\u4e00-\u9fffA-Za-z]/.test(lastLine) &&
      !/[。！？!?]/.test(lastLine));

  if (!looksIncomplete) {
    return value;
  }

  lines.pop();
  return lines.join("\n").trimEnd();
}

function normalizeMarkdownSource(
  markdown: string,
  options?: { streaming?: boolean },
) {
  let normalized = markdown.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
  normalized = normalizeHeadingPlacement(normalized);

  // Streaming chunks can expose half-formed model markup. Keep valid Markdown,
  // but remove markers that are glued into normal Chinese/English text.
  normalized = normalized
    .replace(/^(\s*#{1,6})(\S)/gm, "$1 $2")
    .replace(/([^\s#])#{1,6}(?=[：:，,。；;\s]|$)/g, "$1")
    .replace(/([^\s#])#{1,6}(?=\S)/g, "$1")
    .replace(/^(\s*)(\d+)\s*#{1,6}\s*[-.)、]*/gm, "$1$2. ")
    .replace(/^(\s*)(\d+)\s*[.)、-]\s*/gm, "$1$2. ")
    .replace(/^(\s*\d+\.)\s*[-.)、]+\s*/gm, "$1 ")
    .replace(/^\s*#+\s*([#-]+\s*)+/gm, "# ")
    .replace(/^(\s*)•\s*/gm, "$1- ")
    .replace(/([^\n])#{2,6}(?=\S)/g, "$1")
    .replace(/([^\n])[-*_]{3,}(?=\s|$|[\u4e00-\u9fff]|[：:，,。；;])/g, "$1")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "\n---\n")
    .replace(/\*\*\s*([^*\n]+?)\s*\*\*/g, "**$1**")
    .replace(/\n{3,}/g, "\n\n");

  normalized = removeLastUnbalancedStrongMarker(normalized);

  if (options?.streaming) {
    normalized = removeTrailingUnclosedBold(normalized);
    normalized = removeDanglingInlineMarkdown(normalized)
      .replace(/\n\s*#{1,6}\s*$/g, "\n")
      .replace(/\n\s*[-*_]{1,3}\s*$/g, "\n");
    normalized = trimStreamingTailFragment(normalized);
  }

  return normalized.trim();
}

function renderAiReadingMarkdown(
  markdown: string,
  options?: { streaming?: boolean },
) {
  const normalized = normalizeMarkdownSource(markdown, options);

  if (!normalized) {
    return null;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h3 className={styles.readingMarkdownHeading}>{children}</h3>
        ),
        h2: ({ children }) => (
          <h3 className={styles.readingMarkdownHeading}>{children}</h3>
        ),
        h3: ({ children }) => (
          <h3 className={styles.readingMarkdownSubheading}>{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className={styles.readingMarkdownMinorHeading}>{children}</h4>
        ),
        p: ({ children }) => (
          <p className={styles.readingParagraph}>{children}</p>
        ),
        hr: () => <div className={styles.readingDivider} aria-hidden />,
        ul: ({ children }) => (
          <ul className={styles.readingList}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className={styles.readingList}>{children}</ol>
        ),
        li: ({ children }) => (
          <li className={styles.readingListItem}>{children}</li>
        ),
        strong: ({ children }) => <strong>{children}</strong>,
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
}

function asDisplayError(message: string | null) {
  if (!message) {
    return null;
  }

  const normalized = message.trim();

  if (normalized.length === 0) {
    return "本次解读暂时失败，请稍后再试。";
  }

  return normalized;
}

export function AiReadingScene({ active, onGoHome }: AiReadingSceneProps) {
  const [question, setQuestion] = useState("");
  const [suggestionBatchIndex, setSuggestionBatchIndex] = useState(0);
  const [phase, setPhase] = useState<AiReadingPhase>("question");
  const [anonymousSessionId, setAnonymousSessionId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] =
    useState<CreateAiReadingSessionResponse | null>(null);
  const [readingText, setReadingText] = useState("");
  const [drawnCardIds, setDrawnCardIds] = useState<string[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<
    string | null
  >(null);
  const [pulseSuggestionId, setPulseSuggestionId] = useState<string | null>(
    null,
  );
  const [questionFlowIn, setQuestionFlowIn] = useState(false);
  const [ctaActivationPulse, setCtaActivationPulse] = useState(false);
  const sceneRef = useRef<HTMLElement | null>(null);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const generationStartedRef = useRef(false);
  const drawCompletionTimerRef = useRef<number | null>(null);
  const suggestionPulseTimerRef = useRef<number | null>(null);
  const suggestionFillTimerRef = useRef<number | null>(null);
  const questionFlowTimerRef = useRef<number | null>(null);
  const ctaActivationTimerRef = useRef<number | null>(null);
  const suggestionApplyPendingRef = useRef(false);
  const selectedSuggestionTextRef = useRef<string | null>(null);
  const previousQuestionLengthRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const hydrateSessionId = async () => {
      const stored = await loadStoredAiReadingAnonymousSessionId();

      if (!cancelled) {
        setAnonymousSessionId(stored);
      }
    };

    void hydrateSessionId();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (drawCompletionTimerRef.current !== null) {
        window.clearTimeout(drawCompletionTimerRef.current);
      }
      if (suggestionPulseTimerRef.current !== null) {
        window.clearTimeout(suggestionPulseTimerRef.current);
      }
      if (suggestionFillTimerRef.current !== null) {
        window.clearTimeout(suggestionFillTimerRef.current);
      }
      if (questionFlowTimerRef.current !== null) {
        window.clearTimeout(questionFlowTimerRef.current);
      }
      if (ctaActivationTimerRef.current !== null) {
        window.clearTimeout(ctaActivationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [phase]);

  const questionLength = question.trim().length;
  useEffect(() => {
    const hadQuestion = previousQuestionLengthRef.current > 0;
    const hasQuestion = questionLength > 0;

    if (!hadQuestion && hasQuestion) {
      setCtaActivationPulse(true);
      if (ctaActivationTimerRef.current !== null) {
        window.clearTimeout(ctaActivationTimerRef.current);
      }
      ctaActivationTimerRef.current = window.setTimeout(() => {
        setCtaActivationPulse(false);
      }, 760);
    }

    previousQuestionLengthRef.current = questionLength;
  }, [questionLength]);

  const suggestionBatch =
    QUESTION_SUGGESTION_BATCHES[
      suggestionBatchIndex % QUESTION_SUGGESTION_BATCHES.length
    ] ?? QUESTION_SUGGESTION_BATCHES[0];

  const handleQuestionChange = (nextValue: string) => {
    setQuestion(nextValue);

    if (
      suggestionApplyPendingRef.current ||
      !selectedSuggestionId ||
      !selectedSuggestionTextRef.current
    ) {
      return;
    }

    if (nextValue.trim() !== selectedSuggestionTextRef.current.trim()) {
      setSelectedSuggestionId(null);
      selectedSuggestionTextRef.current = null;
    }
  };

  const handleFillSuggestion = (nextQuestion: string, suggestionId: string) => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fillDelay = prefersReducedMotion ? 0 : SUGGESTION_FILL_DELAY_MS;
    const pulseClearDelay = prefersReducedMotion ? 0 : SUGGESTION_PULSE_CLEAR_MS;

    suggestionApplyPendingRef.current = true;
    selectedSuggestionTextRef.current = nextQuestion;
    setSelectedSuggestionId(suggestionId);
    setPulseSuggestionId(suggestionId);

    if (suggestionPulseTimerRef.current !== null) {
      window.clearTimeout(suggestionPulseTimerRef.current);
    }
    if (suggestionFillTimerRef.current !== null) {
      window.clearTimeout(suggestionFillTimerRef.current);
    }
    if (questionFlowTimerRef.current !== null) {
      window.clearTimeout(questionFlowTimerRef.current);
    }

    suggestionFillTimerRef.current = window.setTimeout(() => {
      setQuestionFlowIn(!prefersReducedMotion);
      setQuestion(nextQuestion);
      window.requestAnimationFrame(() => {
        questionInputRef.current?.focus();
      });

      if (prefersReducedMotion) {
        suggestionApplyPendingRef.current = false;
        setQuestionFlowIn(false);
      } else {
        questionFlowTimerRef.current = window.setTimeout(() => {
          setQuestionFlowIn(false);
          suggestionApplyPendingRef.current = false;
        }, SUGGESTION_FLOW_CLEAR_MS);
      }
    }, fillDelay);

    suggestionPulseTimerRef.current = window.setTimeout(() => {
      setPulseSuggestionId(null);
    }, pulseClearDelay);
  };

  const handleShuffleSuggestions = () => {
    setSelectedSuggestionId(null);
    setPulseSuggestionId(null);
    selectedSuggestionTextRef.current = null;
    setSuggestionBatchIndex((current) => current + 1);
  };

  const handleSubmit = async () => {
    const normalizedQuestion = question.trim();

    if (!normalizedQuestion || submitting) {
      return;
    }

    setSubmitting(true);
    setStreaming(false);
    setError(null);
    setReadingText("");
    setDrawnCardIds([]);
    generationStartedRef.current = false;

    try {
      const session = await createAiReadingSession({
        mode: "three-card",
        question: normalizedQuestion,
        anonymousSessionId: anonymousSessionId ?? undefined,
      });
      setSessionResult(session);

      if (session.anonymousSessionId !== anonymousSessionId) {
        setAnonymousSessionId(session.anonymousSessionId);
        await saveStoredAiReadingAnonymousSessionId(session.anonymousSessionId);
      }

      setPhase("draw");
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : "本次解读暂时失败，请稍后再试。";

      const displayMessage = asDisplayError(message);
      setError(displayMessage);
      if (displayMessage) {
        Toast.show(displayMessage, {
          type: "error",
          position: "top",
        });
      }
      setPhase("question");
    } finally {
      setSubmitting(false);
    }
  };

  const startReading = async (session: CreateAiReadingSessionResponse) => {
    setPhase("reading");
    setSubmitting(true);
    setStreaming(true);
    setError(null);
    setReadingText("");

    try {
      const generated = await generateAiReading(
        session.readingId,
        {
          anonymousSessionId: session.anonymousSessionId,
        },
        (chunk) => {
          setReadingText((current) => current + chunk);
        },
      );
      setReadingText(generated.rawText);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : "本次解读暂时失败，请稍后再试。";

      const displayMessage = asDisplayError(message);
      setError(displayMessage);
      if (displayMessage) {
        Toast.show(displayMessage, {
          type: "error",
          position: "top",
        });
      }
    } finally {
      setSubmitting(false);
      setStreaming(false);
    }
  };

  const handleDrawCard = (cardId: string) => {
    if (!sessionResult || generationStartedRef.current) {
      return;
    }

    setDrawnCardIds((current) => {
      if (
        current.includes(cardId) ||
        current.length >= sessionResult.spread.length
      ) {
        return current;
      }

      const next = [...current, cardId];

      if (next.length >= sessionResult.spread.length) {
        generationStartedRef.current = true;
        drawCompletionTimerRef.current = window.setTimeout(() => {
          void startReading(sessionResult);
        }, DRAW_COMPLETION_DELAY_MS);
      }

      return next;
    });
  };

  const startAnother = () => {
    setSessionResult(null);
    setReadingText("");
    setError(null);
    setQuestion("");
    setStreaming(false);
    setSubmitting(false);
    setDrawnCardIds([]);
    setSelectedSuggestionId(null);
    setPulseSuggestionId(null);
    selectedSuggestionTextRef.current = null;
    setPhase("question");
    generationStartedRef.current = false;
    if (drawCompletionTimerRef.current !== null) {
      window.clearTimeout(drawCompletionTimerRef.current);
      drawCompletionTimerRef.current = null;
    }
  };

  const className = [
    "scene-panel",
    "scene-template-form",
    styles.scene,
    active ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const questionPreview = sessionResult?.question?.trim() || question.trim();
  const requiredDrawCount = sessionResult?.spread.length ?? 3;
  const currentDrawIndex = Math.min(drawnCardIds.length, requiredDrawCount);
  const nextCard = sessionResult?.spread[currentDrawIndex];
  const drawnCards = sessionResult?.spread.slice(0, currentDrawIndex) ?? [];
  const revealedCards = useMemo<CelestialTarotArcFlowRevealedCard[]>(() => {
    if (!sessionResult) {
      return [];
    }

    return drawnCardIds.flatMap((drawnCardId, index) => {
      const card = sessionResult.spread[index];
      if (!card) {
        return [];
      }

      return [
        {
          drawnCardId,
          label: card.cardName,
          frontImage: resolveAiReadingCardFront(card),
        },
      ];
    });
  }, [drawnCardIds, sessionResult]);
  const drawSelectionLabel =
    currentDrawIndex >= requiredDrawCount
      ? "三张牌已归位"
      : nextCard
        ? `点击卡背抽取 ${nextCard.slotLabel}`
        : "点击卡背抽取下一张牌";
  const drawCompleted = currentDrawIndex >= requiredDrawCount;

  return (
    <section ref={sceneRef} className={className} data-phase={phase}>
      {phase === "question" && onGoHome ? (
        <header aria-label="页面顶部操作">
          <button
            type="button"
            className="topbar-link secondary-scene-back-button"
            onClick={onGoHome}
            aria-label="返回首页"
          >
            ←
          </button>
        </header>
      ) : null}

      {phase === "draw" && sessionResult ? (
        <GlassPanel
          width="min(100%, 1120px)"
          borderRadius={24}
          backgroundOpacity={0.15}
          saturation={1.3}
          className={styles.shellGlass}
          contentClassName={`${styles.shell} ${styles.drawShell}`}
        >
          <header className={styles.header}>
            <p className={styles.eyebrow}>3 Card Tarot</p>
            <h2 className={`${styles.title} ${styles.drawPageTitle}`}>
              进入抽卡过程
            </h2>
            {questionPreview ? (
              <p className={styles.questionQuote}>“{questionPreview}”</p>
            ) : null}
          </header>

          <GlassPanel
            fill
            borderRadius={22}
            backgroundOpacity={0.1}
            saturation={1.22}
            className={styles.drawStageGlass}
            contentClassName={styles.drawStage}
          >
            <CelestialTarotArcFlow
              className={styles.arcFlow}
              presentation="paper"
              mode="draw-sequence"
              drawnCardIds={drawnCardIds}
              revealedCards={revealedCards}
              selectionLimit={requiredDrawCount}
              eyebrow="AI Tarot"
              title="抽牌"
              subtitle="Card 1 · Card 2 · Card 3"
              statusLabel={`${currentDrawIndex} / ${requiredDrawCount}`}
              selectionLabel={drawSelectionLabel}
              hint={
                currentDrawIndex >= requiredDrawCount
                  ? "抽卡完成，正在进入 AI 解读。"
                  : "从上下两道星弧中点击任意卡背，每次点击对应本次牌阵中的下一张牌。"
              }
              onCardDraw={handleDrawCard}
            />
          </GlassPanel>

          <section className={styles.drawnCardsPanel} aria-label="已抽到的牌">
            {sessionResult.spread.map((card, index) => {
              const revealed = index < drawnCards.length;
              const cardFront = revealed
                ? resolveAiReadingCardFront(card)
                : undefined;

              return (
                <GlassPanel
                  key={`${card.slot}-${card.cardId}`}
                  borderRadius={14}
                  backgroundOpacity={revealed ? 0.14 : 0.08}
                  saturation={revealed ? 1.28 : 1.18}
                  className={styles.drawnCardGlass}
                  contentClassName={`${styles.drawnCard} ${revealed ? styles.drawnCardRevealed : ""}`}
                  aria-label={`${card.slotLabel}：${revealed ? card.cardName : "等待抽取"}`}
                >
                  <div className={styles.drawnCardPreview}>
                    {cardFront ? (
                      <img
                        className={styles.drawnCardImage}
                        src={cardFront}
                        alt={card.cardName}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className={styles.drawnCardBack}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className={styles.drawnCardCopy}>
                    <p className={styles.cardChipLabel}>{card.slotLabel}</p>
                    <p className={styles.cardChipName}>
                      {revealed ? card.cardName : "等待抽取"}
                    </p>
                  </div>
                </GlassPanel>
              );
            })}
          </section>

          <div className={styles.actions}>
            {drawCompleted ? (
              <p className={styles.drawCompleteStatus} aria-live="polite">
                <span className={styles.drawCompleteDot} />
                正在生成解读
              </p>
            ) : (
              <button
                type="button"
                className="primary-pill"
                onClick={startAnother}
                disabled={submitting || generationStartedRef.current}
              >
                重新提问
              </button>
            )}
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel
          width={
            phase === "reading"
              ? "min(100%, 820px)"
              : phase === "question"
                ? "min(100%, 470px)"
                : "min(100%, 760px)"
          }
          borderRadius={46}
          backgroundOpacity={0.15}
          saturation={1.3}
          className={styles.shellGlass}
          contentClassName={
            phase === "question"
              ? `${styles.shell} ${styles.questionShell}`
              : `${styles.shell} ${styles.readingShell}`
          }
        >
          {phase === "question" ? (
            <>
              <header className={`${styles.header} ${styles.questionHeader}`}>
                <p className={styles.eyebrow}>3 Card Tarot</p>
                <h2 className={styles.title}>Ask One Clear Question</h2>
                <p className={styles.copy}>
                  写下此刻最想确认的问题，
                  <br />
                  抽卡后开启 <span className={styles.copyNoBreak}>AI 流式解读</span>。
                </p>
              </header>

              <GlassPanel
                borderRadius={18}
                backgroundOpacity={0.12}
                saturation={1.24}
                className={`${styles.inputPanelGlass} ${styles.questionPanelPlain}`}
                contentClassName={styles.inputPanel}
              >
                <label htmlFor="ai-reading-question" className={styles.label}>
                  <span className={styles.labelIcon} aria-hidden>
                    <QuestionGlyph />
                  </span>
                  <span>你的问题</span>
                </label>
                <div className={styles.inputField}>
                  <textarea
                    ref={questionInputRef}
                    id="ai-reading-question"
                    className={`${styles.questionInput} ${
                      questionFlowIn ? styles.questionInputFlowIn : ""
                    }`}
                    value={question}
                    onChange={(event) => handleQuestionChange(event.target.value)}
                    placeholder="例如：我该继续这段关系吗？"
                    rows={6}
                    maxLength={280}
                    aria-describedby="ai-reading-counter"
                  />
                  <p
                    id="ai-reading-counter"
                    className={styles.counter}
                    data-near-limit={questionLength >= 240 ? "true" : "false"}
                    data-at-limit={questionLength >= 280 ? "true" : "false"}
                  >
                    {questionLength} / 280
                  </p>
                  <span className={styles.inputOrbit} aria-hidden="true">
                    <span className={styles.inputOrbitRing} />
                    <span className={styles.inputOrbitSpark} />
                    <span className={styles.inputOrbitSparkSecondary} />
                  </span>
                </div>
              </GlassPanel>

              <section className={styles.suggestionSection} aria-label="灵感提示">
                <div className={styles.suggestionHeader}>
                  <p className={styles.suggestionLabel}>
                    <span className={styles.suggestionLabelIcon} aria-hidden>
                      <Sparkle size={11} />
                    </span>
                    灵感提示
                  </p>
                  <button
                    type="button"
                    className={styles.swapButton}
                    onClick={handleShuffleSuggestions}
                  >
                    <RefreshGlyph />
                    <span>换一批</span>
                  </button>
                </div>

                <div className={styles.suggestionGrid}>
                  {suggestionBatch.map((item) => {
                    const isSelected = selectedSuggestionId === item.id;
                    const isActivated = pulseSuggestionId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.suggestionCardShell} ${
                          isSelected ? styles.suggestionCardShellSelected : ""
                        } ${isActivated ? styles.suggestionCardShellActivated : ""}`}
                        onClick={() => handleFillSuggestion(item.text, item.id)}
                      >
                        <span
                          className={styles.suggestionCardShadow}
                          aria-hidden="true"
                        />
                        <span
                          className={styles.suggestionCardContactShadow}
                          aria-hidden="true"
                        />
                        <span className={styles.suggestionCardSurface}>
                          <span className={styles.suggestionIcon} aria-hidden>
                            <SuggestionGlyph type={item.icon} />
                          </span>
                          <span className={styles.suggestionText}>{item.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`primary-pill ${styles.primaryCta} ${
                    questionLength ? styles.primaryCtaActive : ""
                  } ${ctaActivationPulse ? styles.primaryCtaActivated : ""}`}
                  onClick={handleSubmit}
                  disabled={!questionLength || submitting}
                >
                  {submitting ? (
                    <span className={styles.ctaContent}>
                      <LoadingSpinner />
                      <span>正在创建抽卡会话…</span>
                    </span>
                  ) : (
                    <span className={styles.ctaContent}>
                      <Sparkle />
                      <span>{questionLength ? "进入抽卡" : "先写下你的问题"}</span>
                      <Sparkle />
                    </span>
                  )}
                </button>
                <p className={styles.safeNote}>
                  <LockGlyph />
                  <span>抽卡前可随时修改问题</span>
                </p>
              </div>
            </>
          ) : sessionResult ? (
            <>
              <header className={styles.header}>
                <p className={styles.eyebrow}>3 Card Tarot Result</p>
                <h2 className={`${styles.title} ${styles.readingTitle}`}>
                  Three Cards &amp; Reading
                </h2>
                {questionPreview ? (
                  <p className={styles.questionQuote}>{questionPreview}</p>
                ) : null}
              </header>

              <section className={styles.cardsGrid} aria-label="本次牌阵">
                {sessionResult.spread.map((card: SpreadCardItem) => {
                  const cardFront = resolveAiReadingCardFront(card);
                  return (
                    <GlassPanel
                      key={`${card.slot}-${card.cardId}`}
                      borderRadius={14}
                      backgroundOpacity={0.14}
                      saturation={1.26}
                      className={styles.cardChipGlass}
                      contentClassName={styles.cardChip}
                    >
                      <div className={styles.cardChipPreview}>
                        <img
                          className={styles.cardChipImage}
                          src={cardFront}
                          alt={card.cardName}
                          loading="eager"
                          decoding="async"
                        />
                      </div>
                      <div className={styles.cardChipCopy}>
                        <p className={styles.cardChipLabel}>{card.slotLabel}</p>
                        <p className={styles.cardChipName}>{card.cardName}</p>
                      </div>
                    </GlassPanel>
                  );
                })}
              </section>

              <GlassPanel
                borderRadius={14}
                backgroundOpacity={0.12}
                saturation={1.24}
                className={styles.blockGlass}
                contentClassName={`${styles.block} ${styles.readingBlock}`}
              >
                <div className={styles.readingHeader}>
                  <p className={styles.blockLabel}>
                    {streaming ? "正在生成报告" : "牌面解读"}
                  </p>
                  {streaming ? (
                    <p className={styles.streamHint}>
                      <span className={styles.streamDot} />
                      AI 正在整理结构化解读
                    </p>
                  ) : null}
                </div>
                <div className={styles.readingText}>
                  {readingText ? (
                    renderAiReadingMarkdown(readingText, { streaming })
                  ) : (
                    <p className={styles.readingParagraph}>
                      {streaming ? "AI 正在整理这组三张牌…" : "暂无解读文本"}
                    </p>
                  )}
                </div>
              </GlassPanel>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`primary-pill ${styles.primaryCta} ${styles.readingCta}`}
                  onClick={startAnother}
                  disabled={submitting}
                >
                  <span className={styles.ctaContent}>
                    <Sparkle />
                    <span>再问一个问题</span>
                    <Sparkle />
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </GlassPanel>
      )}
    </section>
  );
}
