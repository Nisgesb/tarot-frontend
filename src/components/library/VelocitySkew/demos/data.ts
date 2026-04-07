import { HOME_MENU_ITEMS } from '../../../../config/homeMenu'

export type MenuItem = {
  id: string
  label: string
  subtitle: string
}

export const MOBILE_MENU_ITEMS: MenuItem[] = HOME_MENU_ITEMS.map(({ id, label, subtitle }) => ({
  id,
  label,
  subtitle,
}))

export type GalleryCard = {
  id: string
  image: string
  title: string
  subtitle: string
}

export const DESKTOP_GALLERY_CARDS: GalleryCard[] = [
  {
    id: 'gallery-1',
    image: 'https://picsum.photos/seed/velocity-skew-1/1000/1000',
    title: 'Moonlit Reader',
    subtitle: 'Night study, quiet focus',
  },
  {
    id: 'gallery-2',
    image: 'https://picsum.photos/seed/velocity-skew-2/1000/1000',
    title: 'Arcane Atlas',
    subtitle: 'Maps of symbols and memory',
  },
  {
    id: 'gallery-3',
    image: 'https://picsum.photos/seed/velocity-skew-3/1000/1000',
    title: 'Candle Ledger',
    subtitle: 'Low light, rich contrast',
  },
  {
    id: 'gallery-4',
    image: 'https://picsum.photos/seed/velocity-skew-4/1000/1000',
    title: 'Silent Hall',
    subtitle: 'Architecture and rhythm',
  },
  {
    id: 'gallery-5',
    image: 'https://picsum.photos/seed/velocity-skew-5/1000/1000',
    title: 'Golden Margin',
    subtitle: 'Warm frame, soft grain',
  },
  {
    id: 'gallery-6',
    image: 'https://picsum.photos/seed/velocity-skew-6/1000/1000',
    title: 'Celestial Index',
    subtitle: 'Catalog of constellations',
  },
]

export type DrawCard = {
  id: string
  image: string
  title: string
}

export const MOBILE_DRAW_POOL: DrawCard[] = [
  {
    id: 'draw-magician',
    image: '/library/velocity-skew/cards/the-magician.png',
    title: 'The Magician',
  },
  {
    id: 'draw-fool',
    image: '/library/velocity-skew/cards/the-fool.jpg',
    title: 'The Fool',
  },
  {
    id: 'draw-seven',
    image: '/library/velocity-skew/cards/seven-of-wands.jpg',
    title: 'Seven Of Wands',
  },
  {
    id: 'draw-six',
    image: '/library/velocity-skew/cards/six-of-wands.jpg',
    title: 'Six Of Wands',
  },
]
