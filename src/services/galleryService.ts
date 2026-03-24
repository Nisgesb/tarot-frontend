import type { DreamRecord, RawDreamInput } from '../types/dream'
import { createDreamRecordFromRefined } from './dreamGenerationService'

const GALLERY_SEED_INPUTS: Array<{ id: string; raw: RawDreamInput; refined: string }> = [
  {
    id: 'gallery-aurora-cathedral',
    raw: {
      memory: 'I stood inside a cathedral made from living aurora ribbons.',
      environment: 'A frozen valley beneath moving constellations',
      characters: 'Choirs of mirrored figures without faces',
      feeling: 'Reverence with quiet fear',
      action: 'The ceiling opened as tides of light descended',
      strangeDetail: 'Each echo turned into drifting birds of glass',
    },
    refined:
      'A cinematic dream inside an aurora cathedral in a frozen valley, mirrored faceless choirs, reverent fear, tides of light descending, glass birds from each echo.',
  },
  {
    id: 'gallery-midnight-library',
    raw: {
      memory: 'I kept walking through a library where each book whispered.',
      environment: 'An endless circular archive suspended over dark water',
      characters: 'A gentle librarian made of starlight',
      feeling: 'Tender melancholy',
      action: 'Opening books caused doors to appear in the air',
      strangeDetail: 'The floor reflected scenes from future mornings',
    },
    refined:
      'Dream archive above black water, whispering books, starlight librarian, melancholy tenderness, portals opening with each page, floor showing future mornings.',
  },
  {
    id: 'gallery-celestial-metro',
    raw: {
      memory: 'A silent metro crossed the sky between giant moons.',
      environment: 'Metal tracks floating through violet clouds',
      characters: 'Passengers wearing translucent masks',
      feeling: 'Calm curiosity',
      action: 'I switched trains by stepping through light puddles',
      strangeDetail: 'Ticket gates bloomed like flowers when touched',
    },
    refined:
      'Silent metro between giant moons across violet cloud rails, translucent masked passengers, curious calm, light-puddle transfers, flower-blooming ticket gates.',
  },
  {
    id: 'gallery-tidal-theatre',
    raw: {
      memory: 'A theatre stage was covered by moving ocean tides.',
      environment: 'An abandoned art deco hall lit by blue fire',
      characters: 'Dancers with comet tails',
      feeling: 'Bittersweet wonder',
      action: 'Performers drew symbols in water that became planets',
      strangeDetail: 'Applause sounded like distant thunderstorms underwater',
    },
    refined:
      'Blue-fire theatre with tidal stage, comet-tailed dancers, bittersweet wonder, water symbols becoming planets, underwater thunder applause.',
  },
  {
    id: 'gallery-solar-garden',
    raw: {
      memory: 'I cared for a garden that bloomed only at midnight.',
      environment: 'A greenhouse floating among drifting asteroids',
      characters: 'Bioluminescent wolves resting between flowers',
      feeling: 'Peaceful focus',
      action: 'Each plant opened when I hummed a memory',
      strangeDetail: 'Petals contained tiny rotating maps of old homes',
    },
    refined:
      'Midnight solar garden greenhouse among asteroids, bioluminescent wolves, peaceful focus, memory-hummed blossoms, petals with rotating home maps.',
  },
  {
    id: 'gallery-crystal-river',
    raw: {
      memory: 'A river ran upward into the stars.',
      environment: 'A canyon of translucent crystal cliffs',
      characters: 'A child version of me carrying lantern fish',
      feeling: 'Nostalgia and relief',
      action: 'We climbed by following glowing currents',
      strangeDetail: 'The water replayed forgotten conversations backwards',
    },
    refined:
      'Upward river flowing into stars through crystal canyon, younger self with lantern fish, nostalgic relief, climbing glowing currents, backward forgotten conversations.',
  },
]

let cachedGallery: DreamRecord[] | null = null

export function getGalleryDreams() {
  if (cachedGallery) {
    return cachedGallery
  }

  cachedGallery = GALLERY_SEED_INPUTS.map((entry) =>
    createDreamRecordFromRefined(entry.refined, entry.raw, 'gallery', entry.id),
  )

  return cachedGallery
}
