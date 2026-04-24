const FRONT_EXTENSIONS = [
  'png', 'png', 'png', 'png', 'jpg', 'png', 'png', 'jpg', 'jpg', 'png',
  'png', 'png', 'png', 'jpg', 'jpg', 'png', 'png', 'png', 'jpg', 'png',
  'png', 'png', 'png', 'jpg', 'png', 'png', 'jpg', 'png', 'jpg', 'png',
  'png', 'jpg', 'jpg', 'png', 'png', 'png', 'png', 'png', 'png', 'png',
  'png', 'png', 'png', 'png', 'png', 'png', 'png', 'png', 'png', 'png',
  'png', 'jpg', 'jpg', 'png', 'jpg', 'jpg', 'jpg', 'jpg', 'jpg', 'png',
  'jpg', 'jpg', 'jpg', 'png', 'png', 'png', 'png', 'jpg', 'png', 'png',
  'png', 'png', 'png', 'png', 'jpg', 'jpg', 'png', 'png',
]

export const CARD_FRONT_SOURCES = FRONT_EXTENSIONS.map(
  (extension, index) =>
    `/library/celestial-tarot-arc-flow/cards/fronts/${String(index + 1).padStart(3, '0')}.${extension}`,
)
