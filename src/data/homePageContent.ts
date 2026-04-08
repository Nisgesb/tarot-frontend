export interface HomeFeatureCard {
  id: string
  title: string
  description: string
  icon: 'sparkles' | 'clipboard' | 'leaf-badge'
}

export interface HomeInfoRow {
  id: string
  label: string
  icon: 'water' | 'leaf' | 'sun' | 'home' | 'paw'
}

export interface HomeInfoSection {
  id: string
  title: string
  rows: HomeInfoRow[]
}

export const HOME_HERO_TITLE = ['今日运势'] as const

export const HOME_FEATURE_CARDS: HomeFeatureCard[] = [
  {
    id: 'most-popular',
    title: 'Most Popular',
    description: 'This is a popular plant in our store',
    icon: 'sparkles',
  },
  {
    id: 'easy-care',
    title: 'Easy Care',
    description: 'This is a popular plant in our store',
    icon: 'clipboard',
  },
  {
    id: 'faux-available',
    title: 'Faux Available',
    description: 'Get the style without the maintenance',
    icon: 'leaf-badge',
  },
]

export const HOME_INFO_SECTIONS: HomeInfoSection[] = [
  {
    id: 'care',
    title: 'Care',
    rows: [
      { id: 'water', label: 'Water every Tuesday', icon: 'water' },
      { id: 'feed', label: 'Feed once monthly', icon: 'leaf' },
    ],
  },
  {
    id: 'about',
    title: 'About',
    rows: [
      { id: 'light', label: 'Moderate light', icon: 'sun' },
      { id: 'indoor', label: 'Indoor friendly', icon: 'home' },
      { id: 'pet', label: 'Pet caution', icon: 'paw' },
    ],
  },
]
