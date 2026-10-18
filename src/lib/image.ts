export interface CompressedImage {
  blob: Blob
  mimeType: string
  width: number
  height: number
  size: number
}

/** Calcola le dimensioni ridotte mantenendo le proporzioni. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Ripiega sull'elemento <img> (es. formati non supportati da createImageBitmap).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Riduce la foto di uno scontrino (lato massimo 1600px, JPEG ~70%) prima di salvarla. */
export async function compressImage(
  file: Blob,
  maxSide = 1600,
  quality = 0.7,
): Promise<CompressedImage> {
  const source = await decode(file)
  const { width, height } = fitWithin(source.width, source.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponibile')
  ctx.drawImage(source, 0, 0, width, height)
  if ('close' in source && typeof source.close === 'function') source.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Compressione non riuscita'))),
      'image/jpeg',
      quality,
    ),
  )
  return { blob, mimeType: 'image/jpeg', width, height, size: blob.size }
}
