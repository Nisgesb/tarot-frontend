export const ZODIAC_SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

export const ZODIAC_SIGN_LABELS: Record<ZodiacSign, string> = {
  aries: '白羊座',
  taurus: '金牛座',
  gemini: '双子座',
  cancer: '巨蟹座',
  leo: '狮子座',
  virgo: '处女座',
  libra: '天秤座',
  scorpio: '天蝎座',
  sagittarius: '射手座',
  capricorn: '摩羯座',
  aquarius: '水瓶座',
  pisces: '双鱼座',
}

export interface DailyFortuneMeta {
  source: 'mock' | 'third-party' | 'ai'
  provider: string
  adapterMode: string
}

export interface DailyFortunePayload {
  date: string
  zodiacSign: ZodiacSign
  headline: string
  summary: string
  luckyColor: string
  luckyAccessory: string
  luckyNumber: string | number
  luckyFood: string
  love: string
  career: string
  self: string
  do: string
  dont: string
  cardName: string
  keywords: string[]
  reflectionPrompt: string
  meta: DailyFortuneMeta
}
