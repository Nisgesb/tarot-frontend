const LEON_SCRIPT_URL = '/vendor/leon.js'

export interface LeonPath {
  type: string
  x: number
  y: number
  radius?: number
}

export interface LeonRect {
  w: number
  h: number
}

export interface LeonSansInstance {
  text: string
  size: number
  tracking: number
  leading: number
  scale: number
  rect: LeonRect
  paths: LeonPath[]
  position: (x: number, y: number) => void
  on?: (eventName: string, handler: () => void) => void
  off?: (eventName: string, handler: () => void) => void
  dispose?: () => void
}

export type LeonSansConstructor = new (options: {
  text: string
  size: number
  weight: number
  pathGap: number
  isPath: boolean
  tracking: number
  leading: number
}) => LeonSansInstance

interface LeonWindow extends Window {
  LeonSans?: LeonSansConstructor
  __dreamHeroLeonPromise?: Promise<LeonSansConstructor | null>
}

function getLeonWindow() {
  return window as LeonWindow
}

function ensureLeonScript(): Promise<LeonSansConstructor | null> {
  const win = getLeonWindow()

  if (win.LeonSans) {
    return Promise.resolve(win.LeonSans)
  }

  if (win.__dreamHeroLeonPromise) {
    return win.__dreamHeroLeonPromise
  }

  win.__dreamHeroLeonPromise = new Promise<LeonSansConstructor | null>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-leon-src="${LEON_SCRIPT_URL}"]`)
    const resolveCurrent = () => {
      resolve(win.LeonSans ?? null)
    }

    if (existing) {
      if (win.LeonSans || existing.dataset.loaded === 'true') {
        resolveCurrent()
        return
      }

      existing.addEventListener('load', resolveCurrent, { once: true })
      existing.addEventListener(
        'error',
        () => {
          win.__dreamHeroLeonPromise = undefined
          resolve(null)
        },
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = LEON_SCRIPT_URL
    script.async = true
    script.dataset.leonSrc = LEON_SCRIPT_URL
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolveCurrent()
    })
    script.addEventListener('error', () => {
      win.__dreamHeroLeonPromise = undefined
      resolve(null)
    })
    document.head.appendChild(script)
  })

  return win.__dreamHeroLeonPromise
}

export async function loadLeonSans() {
  if (typeof window === 'undefined') {
    return null
  }

  return ensureLeonScript()
}
