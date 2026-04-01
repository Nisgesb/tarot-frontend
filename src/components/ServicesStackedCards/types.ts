export type ServicesStackedCardItem = {
  id: string
  tabLabel: string
  tabIndex: string
  title: string
  description: string
  metric: string
  metricLabel: string
  color: string
  image: string
  imageAlt: string
}

export type ServicesStackedCardsProps = {
  cards?: ServicesStackedCardItem[]
  className?: string
  ariaLabel?: string
  scrollContainer?: HTMLElement | null
}
