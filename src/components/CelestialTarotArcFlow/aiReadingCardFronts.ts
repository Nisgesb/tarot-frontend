import type { SpreadCardItem } from '../../types/aiReading'

const AI_READING_CARD_FRONT_BY_SLUG: Record<string, string> = {
  'lovers': '/library/celestial-tarot-arc-flow/cards/fronts/004.png',
  'devil': '/library/celestial-tarot-arc-flow/cards/fronts/005.jpg',
  'judgement': '/library/celestial-tarot-arc-flow/cards/fronts/060.png',
  'moon': '/library/celestial-tarot-arc-flow/cards/fronts/061.jpg',
  'tower': '/library/celestial-tarot-arc-flow/cards/fronts/063.jpg',
  'hanged-man': '/library/celestial-tarot-arc-flow/cards/fronts/064.png',
  'hermit': '/library/celestial-tarot-arc-flow/cards/fronts/065.png',
  'death': '/library/celestial-tarot-arc-flow/cards/fronts/066.png',
  'emperor': '/library/celestial-tarot-arc-flow/cards/fronts/071.png',
  'temperance': '/library/celestial-tarot-arc-flow/cards/fronts/072.png',
  'strength': '/library/celestial-tarot-arc-flow/cards/fronts/069.png',
}

function buildFallbackCardFront(cardName: string) {
  const title = cardName.trim() || 'Tarot'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 780" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#211536" />
          <stop offset="50%" stop-color="#3b235f" />
          <stop offset="100%" stop-color="#1a102d" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="38%" r="52%">
          <stop offset="0%" stop-color="#f7dfb0" stop-opacity="0.75" />
          <stop offset="55%" stop-color="#9f75ff" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#0e0919" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff1cc" />
          <stop offset="48%" stop-color="#d8b671" />
          <stop offset="100%" stop-color="#8a6535" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="460" height="760" rx="30" fill="url(#bg)" />
      <rect x="18" y="18" width="444" height="744" rx="24" stroke="url(#frame)" stroke-width="4" />
      <rect x="34" y="34" width="412" height="712" rx="20" stroke="rgba(255,245,218,0.28)" />
      <circle cx="240" cy="292" r="148" fill="url(#glow)" />
      <path d="M160 210H320V510H160Z" fill="rgba(14, 9, 25, 0.3)" stroke="rgba(255, 241, 204, 0.36)" />
      <path d="M184 246H296V510H184Z" fill="rgba(255, 255, 255, 0.06)" />
      <path d="M210 180H270V246H210Z" fill="rgba(255, 241, 204, 0.18)" stroke="rgba(255, 241, 204, 0.4)" />
      <circle cx="240" cy="212" r="42" fill="rgba(255, 241, 204, 0.18)" stroke="rgba(255, 241, 204, 0.5)" />
      <path d="M240 228c31 0 56 31 56 71v67c0 20-9 40-24 53l-32 28-32-28c-15-13-24-33-24-53v-67c0-40 25-71 56-71Z" fill="rgba(255, 241, 204, 0.15)" stroke="rgba(255, 241, 204, 0.56)" stroke-width="3" />
      <path d="M240 268c18 0 32 14 32 32s-14 32-32 32-32-14-32-32 14-32 32-32Z" fill="#f7dfb0" fill-opacity="0.3" />
      <path d="M144 112h192" stroke="rgba(255, 241, 204, 0.42)" stroke-width="3" stroke-linecap="round" />
      <path d="M144 646h192" stroke="rgba(255, 241, 204, 0.42)" stroke-width="3" stroke-linecap="round" />
      <circle cx="110" cy="112" r="6" fill="#f7dfb0" />
      <circle cx="370" cy="112" r="6" fill="#f7dfb0" />
      <circle cx="110" cy="646" r="6" fill="#f7dfb0" />
      <circle cx="370" cy="646" r="6" fill="#f7dfb0" />
      <text x="240" y="594" text-anchor="middle" fill="#fff6e7" font-size="42" font-family="Cormorant Garamond, serif">${title}</text>
      <text x="240" y="664" text-anchor="middle" fill="rgba(255, 246, 231, 0.75)" font-size="22" font-family="Outfit, sans-serif">AI Tarot</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function resolveAiReadingCardFront(card: Pick<SpreadCardItem, 'cardSlug' | 'cardName'>) {
  return AI_READING_CARD_FRONT_BY_SLUG[card.cardSlug] ?? buildFallbackCardFront(card.cardName)
}
