import type { DreamRecord } from '../types/dream'

const DREAM_STORAGE_KEY = 'dreamkeeper.my-dreams.v1'

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadDreamRecords(): DreamRecord[] {
  if (!hasLocalStorage()) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(DREAM_STORAGE_KEY)

    if (!rawValue) {
      return []
    }

    const parsed = JSON.parse(rawValue) as DreamRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDreamRecords(records: DreamRecord[]) {
  if (!hasLocalStorage()) {
    return
  }

  window.localStorage.setItem(DREAM_STORAGE_KEY, JSON.stringify(records))
}

export function upsertDreamRecord(records: DreamRecord[], nextRecord: DreamRecord) {
  const withoutSameId = records.filter((record) => record.id !== nextRecord.id)
  const updated = [nextRecord, ...withoutSameId]
  saveDreamRecords(updated)
  return updated
}
