// Bild komprimieren/verkleinern für Uploads (Avatar, Feed, Chat, Community).
 // - maxDim: längere Kante in px
 // - quality: 0–1
 // - createImageBitmap respektiert EXIF-Orientation in modernen Browsern
 // - bevorzugt WebP, fällt auf JPEG zurück
 // Rückgabe: { blob, contentType, ext }

async function blobFromCanvas(canvas, quality) {
  const tryType = (type) => new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality)
  })
  let blob = await tryType('image/webp')
  if (blob && blob.size > 0) return { blob, contentType: 'image/webp', ext: 'webp' }
  blob = await tryType('image/jpeg')
  if (blob && blob.size > 0) return { blob, contentType: 'image/jpeg', ext: 'jpg' }
  throw new Error('Canvas toBlob failed')
}

function drawToCanvas(source, maxDim) {
  let width = source.width
  let height = source.height
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width)
      width = maxDim
    } else {
      width = Math.round((width * maxDim) / height)
      height = maxDim
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(source, 0, 0, width, height)
  return canvas
}

function loadViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * @param {Blob|File} file
 * @param {number} maxDim
 * @param {number} [quality=0.8]
 * @returns {Promise<{blob: Blob, contentType: string, ext: string}>}
 */
export async function compressImage(file, maxDim, quality = 0.8) {
  let source
  try {
    // imageOrientation: 'from-image' → EXIF korrekt (Chromium/Safari)
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    source = await loadViaImageElement(file)
  }
  try {
    const canvas = drawToCanvas(source, maxDim)
    return await blobFromCanvas(canvas, quality)
  } finally {
    if (typeof source.close === 'function') source.close()
  }
}

/** Cache-Control für Storage-Uploads mit unique Dateinamen (timestamp/uuid). */
export const STORAGE_CACHE_CONTROL = '31536000'
