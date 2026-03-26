import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativeApp } from './runtime'

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalized) {
    return 'dreamkeeper-poster.png'
  }

  return normalized.endsWith('.png') ? normalized : `${normalized}.png`
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Failed to read blob as base64.'))
    }

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unexpected FileReader result.'))
        return
      }

      const encoded = reader.result.split(',')[1]

      if (!encoded) {
        reject(new Error('Missing base64 payload.'))
        return
      }

      resolve(encoded)
    }

    reader.readAsDataURL(blob)
  })
}

function downloadCanvasInBrowser(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) {
      return
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export async function exportCanvasResult(
  canvas: HTMLCanvasElement | null,
  fileName: string,
  shareTitle: string,
) {
  if (!canvas) {
    return
  }

  const sanitizedFileName = sanitizeFileName(fileName)

  if (!isNativeApp()) {
    downloadCanvasInBrowser(canvas, sanitizedFileName)
    return
  }

  try {
    const blob = await canvasToBlob(canvas)

    if (!blob) {
      downloadCanvasInBrowser(canvas, sanitizedFileName)
      return
    }

    const data = await blobToBase64(blob)
    const path = `dreamkeeper-exports/${Date.now()}-${sanitizedFileName}`
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    })

    const { uri } = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    })
    const { value: canShare } = await Share.canShare()

    if (!canShare) {
      downloadCanvasInBrowser(canvas, sanitizedFileName)
      return
    }

    await Share.share({
      title: shareTitle,
      text: shareTitle,
      url: uri,
      dialogTitle: 'Share dream visual',
    })
  } catch {
    downloadCanvasInBrowser(canvas, sanitizedFileName)
  }
}
