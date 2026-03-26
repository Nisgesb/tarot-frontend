import { Preferences } from '@capacitor/preferences'
import { canUseWindow, isNativeApp } from './runtime'

export async function storageGetItem(key: string): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const { value } = await Preferences.get({ key })
      return value
    } catch {
      return null
    }
  }

  if (!canUseWindow()) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export async function storageSetItem(key: string, value: string) {
  if (isNativeApp()) {
    try {
      await Preferences.set({ key, value })
    } catch {
      // no-op
    }
    return
  }

  if (!canUseWindow()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // no-op
  }
}

export async function storageRemoveItem(key: string) {
  if (isNativeApp()) {
    try {
      await Preferences.remove({ key })
    } catch {
      // no-op
    }
    return
  }

  if (!canUseWindow()) {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    // no-op
  }
}
