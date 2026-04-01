import type { ServicesStackedCardItem } from './types'

const formatImage = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1300&q=80`

export const DEFAULT_STACKED_CARDS: ServicesStackedCardItem[] = [
  {
    id: 'service-01',
    tabLabel: 'SERVICE',
    tabIndex: '01',
    title: 'Short-Form Production',
    description:
      'We produce high impact short form videos designed for how people actually consume content on social platforms. Built to grab attention.',
    metric: '242+',
    metricLabel: 'Long Form Videos Clipped',
    color: '#a993fe',
    image: formatImage('photo-1512496015851-a90fb38ba796'),
    imageAlt: 'Hands holding a phone while working beside a laptop',
  },
  {
    id: 'service-02',
    tabLabel: 'SERVICE',
    tabIndex: '02',
    title: 'Creator & UGC Campaigns',
    description:
      'We turn data into direction. By analyzing performance, we refine formats, hooks, and storytelling to scale what works and cut what does not.',
    metric: '50M+',
    metricLabel: 'Total Impressions',
    color: '#fda7f1',
    image: formatImage('photo-1487412720507-e7ab37603c6f'),
    imageAlt: 'Woman facing camera while presenting a product',
  },
  {
    id: 'service-03',
    tabLabel: 'SERVICE',
    tabIndex: '03',
    title: 'Social Media Management',
    description:
      'From content planning to publishing and optimization, we manage your social presence with consistency and intent. Relax and we handle the rest.',
    metric: '50M+',
    metricLabel: 'Total Impressions',
    color: '#cfc9c4',
    image: formatImage('photo-1497215842964-222b430dc094'),
    imageAlt: 'Hands typing on a laptop keyboard with coffee on the desk',
  },
  {
    id: 'service-04',
    tabLabel: 'SERVICE',
    tabIndex: '04',
    title: 'Performance Creative Strategy',
    description:
      'We research, test, iterate, and scale creative based on real world data. We are the first agency that does not guess, no vibes, just what performs.',
    metric: '150%',
    metricLabel: 'Increase in Leads',
    color: '#9cf382',
    image: formatImage('photo-1500648767791-00dcc994a43e'),
    imageAlt: 'High-fidelity portrait close-up with cinematic lighting',
  },
]
