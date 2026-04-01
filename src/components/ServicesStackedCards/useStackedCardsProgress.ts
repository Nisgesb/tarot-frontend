import { useEffect, useState, type RefObject } from 'react'

type UseStackedCardsProgressParams = {
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLElement | null>
  stickyTop: number
  enabled: boolean
  scrollContainer?: HTMLElement | null
}

type ViewportState = {
  width: number
  height: number
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function useStackedCardsProgress({
  sectionRef,
  stageRef,
  stickyTop,
  enabled,
  scrollContainer,
}: UseStackedCardsProgressParams) {
  const [progress, setProgress] = useState(0)
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  useEffect(() => {
    const updateViewport = () => {
      if (scrollContainer) {
        setViewport({
          width: scrollContainer.clientWidth,
          height: scrollContainer.clientHeight,
        })
        return
      }

      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [scrollContainer])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let rafId = 0

    const updateProgress = () => {
      rafId = 0
      const section = sectionRef.current
      const stage = stageRef.current

      if (!section || !stage) {
        return
      }

      const sectionHeight = section.offsetHeight
      const stageHeight = stage.offsetHeight

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const sectionRect = section.getBoundingClientRect()
        const scrollTop = scrollContainer.scrollTop
        const sectionTop = scrollTop + (sectionRect.top - containerRect.top)
        const start = sectionTop - stickyTop
        const end = sectionTop + sectionHeight - stickyTop - stageHeight
        const nextProgress = end <= start ? 0 : clamp((scrollTop - start) / (end - start))

        setProgress((prev) => (Math.abs(prev - nextProgress) > 0.0008 ? nextProgress : prev))
        return
      }

      const rect = section.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const sectionTop = scrollY + rect.top
      const start = sectionTop - stickyTop
      const end = sectionTop + sectionHeight - stickyTop - stageHeight
      const nextProgress = end <= start ? 0 : clamp((scrollY - start) / (end - start))

      setProgress((prev) => (Math.abs(prev - nextProgress) > 0.0008 ? nextProgress : prev))
    }

    const requestUpdate = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress)
      }
    }

    requestUpdate()

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', requestUpdate, { passive: true })
    } else {
      window.addEventListener('scroll', requestUpdate, { passive: true })
    }

    window.addEventListener('resize', requestUpdate)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }

      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', requestUpdate)
      } else {
        window.removeEventListener('scroll', requestUpdate)
      }

      window.removeEventListener('resize', requestUpdate)
    }
  }, [enabled, scrollContainer, sectionRef, stageRef, stickyTop])

  return { progress, viewport }
}
