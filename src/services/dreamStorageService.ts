import type { DreamRecord } from '../types/dream'
import { storageGetItem, storageSetItem } from '../platform/storageAdapter'

const DREAM_STORAGE_KEY = 'dreamkeeper.my-dreams.v1'

function parseDreamRecords(rawValue: string | null): DreamRecord[] {
  try {
    if (!rawValue) {
      return []
    }

    const parsed = JSON.parse(rawValue) as DreamRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function loadDreamRecords(): Promise<DreamRecord[]> {
  const rawValue = await storageGetItem(DREAM_STORAGE_KEY)
  return parseDreamRecords(rawValue)
}

export async function saveDreamRecords(records: DreamRecord[]) {
  await storageSetItem(DREAM_STORAGE_KEY, JSON.stringify(records))
}

export function upsertDreamRecord(records: DreamRecord[], nextRecord: DreamRecord) {
  const withoutSameId = records.filter((record) => record.id !== nextRecord.id)
  return [nextRecord, ...withoutSameId]
}
