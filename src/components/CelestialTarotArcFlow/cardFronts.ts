const CARD_FRONT_COUNT = 78

export const CARD_FRONT_SOURCES = Array.from(
  { length: CARD_FRONT_COUNT },
  (_, index) =>
    `/library/celestial-tarot-arc-flow/cards/fronts/${String(index + 1).padStart(3, '0')}.webp`,
)
