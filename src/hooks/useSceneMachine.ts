import { useCallback, useEffect, useMemo, useReducer } from 'react'
import {
  getFeatureLandingConfigByPath,
  getFeatureLandingConfigBySlug,
  type FeatureLandingSlug,
} from '../config/homeMenu'

export type SceneKey =
  | 'hero'
  | 'entering'
  | 'dreamEntry'
  | 'authLogin'
  | 'authRegister'
  | 'aiReading'
  | 'assistantRefine'
  | 'generating'
  | 'featureLanding'
  | 'result'
  | 'gallery'
  | 'myDreams'
  | 'inspectDream'

export type InspectSource = 'gallery' | 'myDreams' | 'history' | null

export interface SceneMachineState {
  scene: SceneKey
  path: string
  dreamId: string | null
  inspectSource: InspectSource
  featureSlug: FeatureLandingSlug | null
}

interface ParsedLocation {
  scene: SceneKey
  path: string
  dreamId: string | null
  inspectSource: InspectSource
  featureSlug: FeatureLandingSlug | null
}

type Action =
  | {
      type: 'APPLY_LOCATION'
      payload: ParsedLocation
    }
  | {
      type: 'SET_SCENE'
      scene: SceneKey
    }

function parseLocation(pathname: string, search: string): ParsedLocation {
  const query = new URLSearchParams(search)
  const normalizedPath = pathname || '/'

  if (normalizedPath === '/') {
    return {
      scene: 'hero',
      path: '/',
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/dream/new') {
    const phase = query.get('phase')
    const scene: SceneKey =
      phase === 'assistant'
        ? 'assistantRefine'
        : phase === 'generating'
          ? 'generating'
          : 'dreamEntry'

    return {
      scene,
      path: `${normalizedPath}${search}`,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/login') {
    return {
      scene: 'authLogin',
      path: `${normalizedPath}${search}`,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/register') {
    return {
      scene: 'authRegister',
      path: `${normalizedPath}${search}`,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/ai-reading') {
    return {
      scene: 'aiReading',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/gallery') {
    return {
      scene: 'gallery',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/my-dreams') {
    return {
      scene: 'myDreams',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  if (normalizedPath === '/archive') {
    return {
      scene: 'myDreams',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
      featureSlug: null,
    }
  }

  const featureConfig = getFeatureLandingConfigByPath(normalizedPath)

  if (featureConfig) {
    return {
      scene: 'featureLanding',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
      featureSlug: featureConfig.slug,
    }
  }

  const dreamMatch = normalizedPath.match(/^\/dream\/([^/]+)$/)

  if (dreamMatch) {
    const dreamId = decodeURIComponent(dreamMatch[1])
    const view = query.get('view')
    const sourceQuery = query.get('from')
    const inspectSource: InspectSource =
      sourceQuery === 'gallery'
        ? 'gallery'
        : sourceQuery === 'myDreams'
          ? 'myDreams'
          : sourceQuery === 'history'
            ? 'history'
            : null

    return {
      scene: view === 'result' ? 'result' : 'inspectDream',
      path: `${normalizedPath}${search}`,
      dreamId,
      inspectSource,
      featureSlug: null,
    }
  }

  return {
    scene: 'hero',
    path: '/',
    dreamId: null,
    inspectSource: null,
    featureSlug: null,
  }
}

function reducer(state: SceneMachineState, action: Action): SceneMachineState {
  if (action.type === 'APPLY_LOCATION') {
    return {
      scene: action.payload.scene,
      path: action.payload.path,
      dreamId: action.payload.dreamId,
      inspectSource: action.payload.inspectSource,
      featureSlug: action.payload.featureSlug,
    }
  }

  return {
    ...state,
    scene: action.scene,
    featureSlug: action.scene === 'featureLanding' ? state.featureSlug : null,
  }
}

function readCurrentLocation() {
  return parseLocation(window.location.pathname, window.location.search)
}

function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState({}, '', path)
  } else {
    window.history.pushState({}, '', path)
  }
}

function normalizeAuthReturnPath(path: string | null | undefined) {
  if (!path || !path.startsWith('/')) {
    return null
  }

  if (path.startsWith('/login') || path.startsWith('/register')) {
    return null
  }

  return path
}

function buildAuthPath(basePath: '/login' | '/register', fromPath?: string) {
  const from = normalizeAuthReturnPath(fromPath)

  if (!from) {
    return basePath
  }

  const query = new URLSearchParams()
  query.set('from', from)
  return `${basePath}?${query.toString()}`
}

export function useSceneMachine() {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => readCurrentLocation() as SceneMachineState,
  )

  useEffect(() => {
    const onPopState = () => {
      dispatch({
        type: 'APPLY_LOCATION',
        payload: readCurrentLocation(),
      })
    }

    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  const applyNavigation = useCallback((path: string, replace = false) => {
    navigate(path, replace)
    dispatch({
      type: 'APPLY_LOCATION',
      payload: readCurrentLocation(),
    })
  }, [])

  const actions = useMemo(
    () => ({
      goHome: () => applyNavigation('/'),
      startEntering: () => dispatch({ type: 'SET_SCENE', scene: 'entering' }),
      goPath: (path: string, replace = false) => {
        if (!path.startsWith('/')) {
          return
        }

        applyNavigation(path, replace)
      },
      goDreamEntry: (replace = false) => applyNavigation('/dream/new', replace),
      goLogin: (fromPath?: string, replace = false) =>
        applyNavigation(buildAuthPath('/login', fromPath), replace),
      goRegister: (fromPath?: string, replace = false) =>
        applyNavigation(buildAuthPath('/register', fromPath), replace),
      goAiReading: () => applyNavigation('/ai-reading'),
      goAssistantRefine: () => applyNavigation('/dream/new?phase=assistant'),
      goGenerating: () => applyNavigation('/dream/new?phase=generating'),
      goArchive: () => applyNavigation('/archive'),
      goFeature: (slug: FeatureLandingSlug) => {
        const feature = getFeatureLandingConfigBySlug(slug)

        applyNavigation(feature?.path ?? '/dream/new')
      },
      goGallery: () => applyNavigation('/gallery'),
      goMyDreams: () => applyNavigation('/archive'),
      openResult: (dreamId: string) =>
        applyNavigation(`/dream/${encodeURIComponent(dreamId)}?view=result`),
      inspectDream: (
        dreamId: string,
        source: Exclude<InspectSource, null> = 'history',
        replace = false,
      ) =>
        applyNavigation(
          `/dream/${encodeURIComponent(dreamId)}?view=inspect&from=${source}`,
          replace,
        ),
      replaceScene: (scene: SceneKey) => dispatch({ type: 'SET_SCENE', scene }),
    }),
    [applyNavigation],
  )

  return {
    state,
    actions,
  }
}
