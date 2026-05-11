import { useRef, useState } from 'react'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/toast'
import { generatePhysicalReading } from '../services/aiReadingApi'
import styles from './PhysicalReadingScene.module.css'

interface PhysicalReadingSceneProps {
  active: boolean
}

type PhysicalReadingPhase = 'compose' | 'reading'

const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.82
const MAX_UPLOAD_BYTES = 4_700_000

function asDisplayError(message: string | null) {
  const normalized = message?.trim()

  if (!normalized) {
    return '本次实体卡解读暂时失败，请稍后再试。'
  }

  return normalized
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败，请重新选择一张照片。'))
    image.src = dataUrl
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('图片读取失败，请重新选择一张照片。'))
    }
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择一张照片。'))
    reader.readAsDataURL(file)
  })
}

async function compressImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传一张塔罗牌照片。')
  }

  const originalDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(originalDataUrl)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器无法处理这张照片。')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const imageDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const estimatedBytes = Math.ceil((imageDataUrl.length * 3) / 4)

  if (estimatedBytes > MAX_UPLOAD_BYTES) {
    throw new Error('照片仍然过大，请换一张更清晰但尺寸更小的照片。')
  }

  return {
    imageDataUrl,
    previewUrl: imageDataUrl,
    width,
    height,
  }
}

export function PhysicalReadingScene({ active }: PhysicalReadingSceneProps) {
  const [question, setQuestion] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null)
  const [phase, setPhase] = useState<PhysicalReadingPhase>('compose')
  const [submitting, setSubmitting] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [readingText, setReadingText] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const normalizedQuestion = question.trim()
  const canGenerate = normalizedQuestion.length > 0 && Boolean(imageDataUrl) && !submitting

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      return
    }

    try {
      const compressed = await compressImageFile(file)

      setImageDataUrl(compressed.imageDataUrl)
      setImagePreviewUrl(compressed.previewUrl)
      setImageMeta({
        width: compressed.width,
        height: compressed.height,
      })
      setReadingText('')
      setPhase('compose')
    } catch (exception) {
      const displayMessage = asDisplayError(
        exception instanceof Error ? exception.message : null,
      )

      Toast.show(displayMessage, {
        type: 'error',
        position: 'top',
      })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate || !imageDataUrl) {
      return
    }

    setSubmitting(true)
    setStreaming(true)
    setReadingText('')
    setPhase('reading')

    try {
      await generatePhysicalReading(
        {
          question: normalizedQuestion,
          imageDataUrl,
        },
        (chunk) => {
          setReadingText((current) => current + chunk)
        },
      )
    } catch (exception) {
      const displayMessage = asDisplayError(
        exception instanceof Error ? exception.message : null,
      )

      Toast.show(displayMessage, {
        type: 'error',
        position: 'top',
      })
    } finally {
      setSubmitting(false)
      setStreaming(false)
    }
  }

  const resetReading = () => {
    setPhase('compose')
    setReadingText('')
    setStreaming(false)
    setSubmitting(false)
  }

  const resetAll = () => {
    setQuestion('')
    setImageDataUrl(null)
    setImagePreviewUrl(null)
    setImageMeta(null)
    setReadingText('')
    setPhase('compose')
    setStreaming(false)
    setSubmitting(false)
  }

  const className = ['scene-panel', 'scene-template-form', styles.scene, active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <GlassPanel
        width="min(100%, 960px)"
        borderRadius={24}
        backgroundOpacity={0.15}
        saturation={1.24}
        className={styles.shellGlass}
        contentClassName={styles.shell}
      >
        <header className={styles.header}>
          <p className={styles.eyebrow}>Physical Tarot</p>
          <h2 className={styles.title}>实体卡占卜</h2>
          <p className={styles.copy}>
            输入问题后，线下抽出实体牌，把牌面拍清楚上传，AI 会根据照片直接解读。
          </p>
        </header>

        <div className={styles.layout}>
          <section className={styles.inputColumn} aria-label="实体卡占卜输入">
            <GlassPanel
              borderRadius={18}
              backgroundOpacity={0.12}
              saturation={1.18}
              className={styles.panelGlass}
              contentClassName={styles.formPanel}
            >
              <label htmlFor="physical-reading-question" className={styles.label}>
                你的问题
              </label>
              <textarea
                id="physical-reading-question"
                className={styles.questionInput}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：这段关系接下来我该主动推进，还是先观察？"
                rows={5}
                maxLength={280}
                disabled={submitting}
              />
              <p className={styles.counter}>{normalizedQuestion.length} / 280</p>

              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  void handleFileChange(event.currentTarget.files?.[0] ?? null)
                }}
              />

              <div className={styles.uploadActions}>
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  {imagePreviewUrl ? '重新选择照片' : '拍照或上传牌面'}
                </button>
                {imageMeta ? (
                  <p className={styles.imageMeta}>
                    已压缩为 {imageMeta.width} x {imageMeta.height}
                  </p>
                ) : null}
              </div>
            </GlassPanel>

            <div className={styles.actions}>
              <button
                type="button"
                className="primary-pill"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {submitting ? '正在分析照片…' : '发送给 AI 分析'}
              </button>
              {readingText ? (
                <button
                  type="button"
                  className="secondary-pill"
                  onClick={resetAll}
                  disabled={submitting}
                >
                  重新开始
                </button>
              ) : null}
            </div>
          </section>

          <section className={styles.previewColumn} aria-label="实体牌照片与解读">
            <GlassPanel
              borderRadius={18}
              backgroundOpacity={0.12}
              saturation={1.18}
              className={styles.panelGlass}
              contentClassName={styles.previewPanel}
            >
              {imagePreviewUrl ? (
                <img className={styles.photoPreview} src={imagePreviewUrl} alt="已上传的实体牌照片" />
              ) : (
                <div className={styles.emptyPreview}>
                  <span className={styles.emptyMark} aria-hidden>
                    +
                  </span>
                  <p>拍下实体牌面后，会在这里确认照片。</p>
                </div>
              )}
            </GlassPanel>

            {phase === 'reading' || readingText ? (
              <GlassPanel
                borderRadius={18}
                backgroundOpacity={0.12}
                saturation={1.18}
                className={styles.panelGlass}
                contentClassName={styles.readingPanel}
              >
                <div className={styles.readingHeader}>
                  <p className={styles.blockLabel}>{streaming ? '正在流式生成' : '照片解读'}</p>
                  {streaming ? (
                    <p className={styles.streamHint}>
                      <span className={styles.streamDot} />
                      AI 正在读取照片
                    </p>
                  ) : null}
                </div>
                <p className={styles.readingText}>
                  {readingText || (streaming ? 'AI 正在识别照片里的实体牌面…' : '暂无解读文本')}
                </p>
                {readingText && !streaming ? (
                  <button
                    type="button"
                    className={styles.refineButton}
                    onClick={resetReading}
                    disabled={submitting}
                  >
                    调整问题或照片
                  </button>
                ) : null}
              </GlassPanel>
            ) : null}
          </section>
        </div>
      </GlassPanel>
    </section>
  )
}
