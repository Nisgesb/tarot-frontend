import { useState } from 'react'
import { ServicesStackedCards } from '../components/ServicesStackedCards'
import styles from './ServicesStackedCardsScene.module.css'

export function ServicesStackedCardsScene() {
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)

  return (
    <section className={styles.root}>
      <div
        ref={setScrollContainer}
        className={styles.scrollContainer}
        data-services-stacked-scroll-container
      >
        <header className={styles.header}>
          <p className={styles.eyebrow}>Services Stacked Cards</p>
          <h1 className={styles.title}>Mobile Layered Demo</h1>
        </header>

        <ServicesStackedCards scrollContainer={scrollContainer} className={styles.cardsRoot} />
      </div>
    </section>
  )
}
