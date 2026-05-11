export type HomeMenuDestinationKind = 'ai-flow' | 'physical-flow' | 'feature'

export type FeatureLandingSlug = 'live-reading' | 'daily-fortune'

interface BaseHomeMenuItem {
  id: string
  label: string
  subtitle: string
  path: string
}

export interface AiFlowHomeMenuItem extends BaseHomeMenuItem {
  slug: 'ai-reading'
  destinationKind: 'ai-flow'
}

export interface PhysicalFlowHomeMenuItem extends BaseHomeMenuItem {
  slug: 'physical-reading'
  destinationKind: 'physical-flow'
}

export interface FeatureHomeMenuItem extends BaseHomeMenuItem {
  slug: FeatureLandingSlug
  destinationKind: 'feature'
}

export type HomeMenuItem = AiFlowHomeMenuItem | PhysicalFlowHomeMenuItem | FeatureHomeMenuItem

export interface FeatureLandingConfig {
  slug: FeatureLandingSlug
  path: string
  label: string
  subtitle: string
  status: string
  description: string
}

export const FEATURE_LANDING_CONFIGS: Record<FeatureLandingSlug, FeatureLandingConfig> = {
  'live-reading': {
    slug: 'live-reading',
    path: '/live-reading',
    label: '真人面解',
    subtitle: '预约面对面咨询与解读',
    status: '真人面解入口筹备中',
    description: '这里会承接真人面对面咨询、预约排期和线下解读服务。',
  },
  'daily-fortune': {
    slug: 'daily-fortune',
    path: '/daily-fortune',
    label: '今日运势',
    subtitle: '查看今日能量与塔罗提示',
    status: '今日运势已上线',
    description: '这里展示今日运势摘要、三维度解读、宜忌建议与反思问题。',
  },
}

export const HOME_MENU_ITEMS: HomeMenuItem[] = [
  {
    id: 'menu-ai-reading',
    label: 'AI占卜',
    subtitle: '智能引导式抽牌与解读',
    slug: 'ai-reading',
    path: '/ai-reading',
    destinationKind: 'ai-flow',
  },
  {
    id: 'menu-physical-reading',
    label: '实体卡占卜',
    subtitle: '拍照上传实体牌面并分析',
    slug: 'physical-reading',
    path: '/physical-reading',
    destinationKind: 'physical-flow',
  },
  {
    id: 'menu-live-reading',
    label: '真人面解',
    subtitle: '预约面对面咨询与解读',
    slug: 'live-reading',
    path: '/live-reading',
    destinationKind: 'feature',
  },
  {
    id: 'menu-daily-fortune',
    label: '今日运势',
    subtitle: '查看今日能量与塔罗提示',
    slug: 'daily-fortune',
    path: '/daily-fortune',
    destinationKind: 'feature',
  },
]

export function getFeatureLandingConfigBySlug(slug: FeatureLandingSlug | null) {
  if (!slug) {
    return null
  }

  return FEATURE_LANDING_CONFIGS[slug] ?? null
}

export function getFeatureLandingConfigByPath(pathname: string) {
  const match = Object.values(FEATURE_LANDING_CONFIGS).find((entry) => entry.path === pathname)
  return match ?? null
}
