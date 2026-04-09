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

export const HOME_HERO_TITLE = ['命运秘仪'] as const

export const HOME_FEATURE_CARDS: HomeFeatureCard[] = [
  {
    id: 'most-popular',
    title: '今日运势',
    description: '抽一张今日指引牌，查看当下能量走向',
    icon: 'sparkles',
  },
  {
    id: 'easy-care',
    title: '情感占卜',
    description: '洞察关系状态，获得温柔而清晰的答案',
    icon: 'clipboard',
  },
  {
    id: 'faux-available',
    title: '事业指引',
    description: '聚焦目标与机会，找到下一步行动方向',
    icon: 'leaf-badge',
  },
]

export const HOME_INFO_SECTIONS: HomeInfoSection[] = [
  {
    id: 'care',
    title: '抽牌提示',
    rows: [
      { id: 'water', label: '静心提问后再抽牌', icon: 'water' },
      { id: 'feed', label: '保持开放心态接收指引', icon: 'leaf' },
    ],
  },
  {
    id: 'about',
    title: '占卜主题',
    rows: [
      { id: 'light', label: '爱情与关系', icon: 'sun' },
      { id: 'indoor', label: '事业与学业', icon: 'home' },
      { id: 'pet', label: '个人成长', icon: 'paw' },
    ],
  },
]
