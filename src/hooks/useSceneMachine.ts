import { useCallback, useEffect, useMemo, useReducer } from 'react'

export type SceneKey =
  | 'hero'
  | 'entering'
  | 'dreamEntry'
  | 'assistantRefine'
  | 'generating'
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
}

interface ParsedLocation {
  scene: SceneKey
  path: string
  dreamId: string | null
  inspectSource: InspectSource
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
    }
  }

  if (normalizedPath === '/gallery') {
    return {
      scene: 'gallery',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
    }
  }

  if (normalizedPath === '/my-dreams') {
    return {
      scene: 'myDreams',
      path: normalizedPath,
      dreamId: null,
      inspectSource: null,
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
    }
  }

  return {
    scene: 'hero',
    path: '/',
    dreamId: null,
    inspectSource: null,
  }
}

function reducer(state: SceneMachineState, action: Action): SceneMachineState {
  if (action.type === 'APPLY_LOCATION') {
    return {
      scene: action.payload.scene,
      path: action.payload.path,
      dreamId: action.payload.dreamId,
      inspectSource: action.payload.inspectSource,
    }
  }

  return {
    ...state,
    scene: action.scene,
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
      goDreamEntry: (replace = false) => applyNavigation('/dream/new', replace),
      goAssistantRefine: () => applyNavigation('/dream/new?phase=assistant'),
      goGenerating: () => applyNavigation('/dream/new?phase=generating'),
      goGallery: () => applyNavigation('/gallery'),
      goMyDreams: () => applyNavigation('/my-dreams'),
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
