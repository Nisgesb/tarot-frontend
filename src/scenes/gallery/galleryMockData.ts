export type GalleryTabKey = 'tarotReaders' | 'cardMates' | 'friends' | 'following'

export interface GalleryTabItem {
  key: GalleryTabKey
  label: string
}

export interface GalleryActionStats {
  likes: string
  saves: string
  comments: string
}

export interface GalleryFeedCard {
  id: string
  streamLabel: '塔罗师动态' | '牌友动态'
  author: string
  role: string
  timeAgo: string
  title: string
  excerpt: string
  topic: string
  moonPhase: string
  coverTone: 'lunar' | 'mist' | 'aurora' | 'dusk'
  stats: GalleryActionStats
}

export interface TodayMoodEntry {
  id: string
  label: string
}

export const GALLERY_TABS: GalleryTabItem[] = [
  { key: 'tarotReaders', label: '塔罗师' },
  { key: 'cardMates', label: '牌友' },
  { key: 'friends', label: '好友' },
  { key: 'following', label: '关注' },
]

export const TODAY_MOOD_ENTRIES: TodayMoodEntry[] = [
  { id: 'collective', label: '集体能量' },
  { id: 'draw', label: '今日抽牌' },
  { id: 'notebook', label: '灵感札记' },
  { id: 'question', label: '提问角落' },
]

export const GALLERY_FEED_BY_TAB: Record<GalleryTabKey, GalleryFeedCard[]> = {
  tarotReaders: [
    {
      id: 'reader-1',
      streamLabel: '塔罗师动态',
      author: '银月导师 Luna',
      role: '深夜情感专修',
      timeAgo: '12 分钟前',
      title: '关系里的迟疑，不一定是退缩',
      excerpt:
        '今晚抽到「月亮」与「节制」并列。你看到的模糊感，可能不是坏消息，而是关系在等待更稳的节奏。',
      topic: '月光关系课',
      moonPhase: '上弦',
      coverTone: 'lunar',
      stats: {
        likes: '1.2k',
        saves: '486',
        comments: '92',
      },
    },
    {
      id: 'reader-2',
      streamLabel: '塔罗师动态',
      author: 'Astra 温言',
      role: '事业路径解析',
      timeAgo: '39 分钟前',
      title: '本周适合先修边界，再谈扩张',
      excerpt:
        '如果你最近频繁感到疲惫，先调整协作边界。稳定输入输出，才有余量承接新的机会窗口。',
      topic: '职业节律',
      moonPhase: '盈凸',
      coverTone: 'mist',
      stats: {
        likes: '930',
        saves: '351',
        comments: '67',
      },
    },
  ],
  cardMates: [
    {
      id: 'mate-1',
      streamLabel: '牌友动态',
      author: '星屿',
      role: '牌友 · 第 128 天',
      timeAgo: '8 分钟前',
      title: '今天把「隐士」写进了通勤笔记',
      excerpt:
        '原来慢下来并不是落后。给自己半小时空白，反而更能听到真实问题在说什么。',
      topic: '通勤自问',
      moonPhase: '新月',
      coverTone: 'aurora',
      stats: {
        likes: '276',
        saves: '108',
        comments: '34',
      },
    },
    {
      id: 'mate-2',
      streamLabel: '牌友动态',
      author: '南枝',
      role: '牌友 · 共读中',
      timeAgo: '55 分钟前',
      title: '给明天留一格未知，也挺好',
      excerpt:
        '从「星币二」看到的是平衡，而不是忙乱。今天先完成最关键的两件事，剩下的交给明早。',
      topic: '日常平衡',
      moonPhase: '峨眉',
      coverTone: 'dusk',
      stats: {
        likes: '341',
        saves: '144',
        comments: '41',
      },
    },
  ],
  friends: [
    {
      id: 'friend-1',
      streamLabel: '牌友动态',
      author: '你关注的好友 · 珂拉',
      role: '好友更新',
      timeAgo: '4 分钟前',
      title: '抽到「力量」后我决定先和自己和解',
      excerpt:
        '不是每次都要立刻赢下局面。有些事，先把呼吸放稳，答案会自己浮上来。',
      topic: '情绪照护',
      moonPhase: '盈凸',
      coverTone: 'mist',
      stats: {
        likes: '189',
        saves: '73',
        comments: '28',
      },
    },
    {
      id: 'friend-2',
      streamLabel: '塔罗师动态',
      author: '黎明塔罗',
      role: '你的关注塔罗师',
      timeAgo: '28 分钟前',
      title: '周四能量提醒：先做减法',
      excerpt:
        '今天不建议堆满日程。选一件最有价值的事情持续推进，情绪会更稳定。',
      topic: '周四提醒',
      moonPhase: '下弦',
      coverTone: 'lunar',
      stats: {
        likes: '628',
        saves: '210',
        comments: '56',
      },
    },
  ],
  following: [
    {
      id: 'following-1',
      streamLabel: '塔罗师动态',
      author: 'Moon Archive',
      role: '关注清单',
      timeAgo: '16 分钟前',
      title: '今天的卡面关键词：柔软与边界',
      excerpt:
        '你不必同时解释所有选择。保留一些安静空间，本身就是一种清晰表达。',
      topic: '今日关键词',
      moonPhase: '满月',
      coverTone: 'dusk',
      stats: {
        likes: '504',
        saves: '198',
        comments: '49',
      },
    },
    {
      id: 'following-2',
      streamLabel: '牌友动态',
      author: '灰蓝',
      role: '关注牌友',
      timeAgo: '1 小时前',
      title: '把焦虑写进占卜签，心里轻了很多',
      excerpt:
        '写出来才发现，那些反复担心的事，很多都还没发生。今晚先把自己照顾好。',
      topic: '夜间记录',
      moonPhase: '残月',
      coverTone: 'aurora',
      stats: {
        likes: '223',
        saves: '80',
        comments: '25',
      },
    },
  ],
}
