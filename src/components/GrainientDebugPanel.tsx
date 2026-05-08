import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_GRAINIENT_SETTINGS,
  type GrainientSettings,
} from './grainientTuning'
import styles from './GrainientDebugPanel.module.css'

interface GrainientDebugPanelProps {
  settings: GrainientSettings
  onChange: (patch: Partial<GrainientSettings>) => void
  onReset: () => void
}

type RangeKey = Exclude<keyof GrainientSettings, 'color1' | 'color2' | 'color3' | 'grainAnimated'>

interface RangeField {
  key: RangeKey
  label: string
  min: number
  max: number
  step: number
}

const RANGE_FIELDS: RangeField[] = [
  { key: 'timeSpeed', label: '时间速度', min: 0, max: 2, step: 0.01 },
  { key: 'colorBalance', label: '颜色平衡', min: -1, max: 1, step: 0.01 },
  { key: 'warpStrength', label: '扭曲强度', min: 0, max: 3, step: 0.01 },
  { key: 'warpFrequency', label: '扭曲频率', min: 0, max: 10, step: 0.01 },
  { key: 'warpSpeed', label: '扭曲速度', min: 0, max: 5, step: 0.01 },
  { key: 'warpAmplitude', label: '扭曲振幅', min: 0, max: 200, step: 0.1 },
  { key: 'blendAngle', label: '混合角度', min: -180, max: 180, step: 0.1 },
  { key: 'blendSoftness', label: '混合柔和度', min: 0, max: 0.2, step: 0.001 },
  { key: 'rotationAmount', label: '旋转幅度', min: 0, max: 1000, step: 1 },
  { key: 'noiseScale', label: '噪声尺度', min: 0, max: 10, step: 0.01 },
  { key: 'grainAmount', label: '颗粒强度', min: 0, max: 1, step: 0.001 },
  { key: 'grainScale', label: '颗粒尺度', min: 0, max: 5, step: 0.01 },
  { key: 'contrast', label: '对比度', min: 0.5, max: 3, step: 0.01 },
  { key: 'gamma', label: '伽马', min: 0.1, max: 3, step: 0.01 },
  { key: 'saturation', label: '饱和度', min: 0, max: 3, step: 0.01 },
  { key: 'centerX', label: '中心偏移 X', min: -1, max: 1, step: 0.001 },
  { key: 'centerY', label: '中心偏移 Y', min: -1, max: 1, step: 0.001 },
  { key: 'zoom', label: '缩放', min: 0.1, max: 2, step: 0.01 },
]

const COLOR_FIELDS: Array<{ key: 'color1' | 'color2' | 'color3'; label: string }> = [
  { key: 'color1', label: '颜色 1' },
  { key: 'color2', label: '颜色 2' },
  { key: 'color3', label: '颜色 3' },
]
const OPEN_STATE_KEY = 'grainient-debug-open-v1'
type ColorKey = 'color1' | 'color2' | 'color3'

function clampColorHex(value: string) {
  const text = value.trim()
  const match = /^#?([0-9a-fA-F]{6})$/.exec(text)
  if (match) {
    return `#${match[1].toLowerCase()}`
  }
  return null
}

function formatNumber(value: number, step: number) {
  if (step >= 1) {
    return String(Math.round(value))
  }

  if (step >= 0.1) {
    return value.toFixed(1)
  }

  if (step >= 0.01) {
    return value.toFixed(2)
  }

  return value.toFixed(3)
}

export function GrainientDebugPanel({
  settings,
  onChange,
  onReset,
}: GrainientDebugPanelProps) {
  const [colorDrafts, setColorDrafts] = useState<Record<ColorKey, string>>({
    color1: settings.color1,
    color2: settings.color2,
    color3: settings.color3,
  })
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      return window.localStorage.getItem(OPEN_STATE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const groupedRows = useMemo(() => {
    const rows: RangeField[][] = []
    for (let index = 0; index < RANGE_FIELDS.length; index += 3) {
      rows.push(RANGE_FIELDS.slice(index, index + 3))
    }
    return rows
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_STATE_KEY, open ? 'true' : 'false')
    } catch {
      // Ignore localStorage failures.
    }
  }, [open])

  const applyColorIfValid = (key: ColorKey, rawValue: string) => {
    const next = clampColorHex(rawValue)
    if (!next) {
      return null
    }

    if (settings[key] !== next) {
      onChange({ [key]: next } as Partial<GrainientSettings>)
    }
    return next
  }

  return (
    <aside className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value)
        }}
      >
        {open ? '收起调试' : '调试参数'}
      </button>

      {open ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2>背景调试</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.headerButton}
                onClick={() => {
                  onReset()
                  setColorDrafts({
                    color1: DEFAULT_GRAINIENT_SETTINGS.color1,
                    color2: DEFAULT_GRAINIENT_SETTINGS.color2,
                    color3: DEFAULT_GRAINIENT_SETTINGS.color3,
                  })
                }}
              >
                重置
              </button>
              <button
                type="button"
                className={styles.headerButton}
                onClick={() => {
                  setOpen(false)
                }}
              >
                收起
              </button>
            </div>
          </div>

          <div className={styles.gridRows}>
            <div className={styles.colorRow}>
              {COLOR_FIELDS.map((field) => (
                <label key={field.key} className={styles.colorField}>
                  <span>{field.label}</span>
                  <div className={styles.colorInputs}>
                    <input
                      aria-label={field.label}
                      type="color"
                      value={settings[field.key]}
                      onChange={(event) => {
                        const nextColor = event.target.value
                        setColorDrafts((previous) => ({
                          ...previous,
                          [field.key]: nextColor,
                        }))
                        applyColorIfValid(field.key, nextColor)
                      }}
                    />
                    <input
                      aria-label={`${field.label} hex`}
                      className={styles.hex}
                      type="text"
                      value={colorDrafts[field.key]}
                      onChange={(event) => {
                        const rawValue = event.target.value
                        setColorDrafts((previous) => ({
                          ...previous,
                          [field.key]: rawValue,
                        }))
                        const normalized = applyColorIfValid(field.key, rawValue)
                        if (normalized) {
                          setColorDrafts((previous) => ({
                            ...previous,
                            [field.key]: normalized,
                          }))
                        }
                      }}
                      onBlur={() => {
                        const normalized = applyColorIfValid(field.key, colorDrafts[field.key])
                        setColorDrafts((previous) => ({
                          ...previous,
                          [field.key]: normalized ?? settings[field.key],
                        }))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') {
                          return
                        }

                        event.preventDefault()
                        const normalized = applyColorIfValid(field.key, colorDrafts[field.key])
                        setColorDrafts((previous) => ({
                          ...previous,
                          [field.key]: normalized ?? settings[field.key],
                        }))
                        event.currentTarget.blur()
                      }}
                    />
                  </div>
                </label>
              ))}
            </div>

            {groupedRows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className={styles.rangeRow}>
                {row.map((field) => (
                  <label key={field.key} className={styles.rangeField}>
                    <div className={styles.rangeTitle}>
                      <span>{field.label}</span>
                      <span>{formatNumber(settings[field.key], field.step)}</span>
                    </div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={settings[field.key]}
                      onChange={(event) => {
                        onChange({ [field.key]: Number(event.target.value) })
                      }}
                    />
                  </label>
                ))}
              </div>
            ))}

            <label className={styles.toggleField}>
              <span>颗粒动画</span>
              <input
                type="checkbox"
                checked={settings.grainAnimated}
                onChange={(event) => {
                  onChange({ grainAnimated: event.target.checked })
                }}
              />
            </label>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export default GrainientDebugPanel
