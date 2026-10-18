import { Camera, ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { t } from '../../i18n'
import { compressImage, type CompressedImage } from '../../lib/image'

interface Props {
  /** Immagine attuale (salvata o appena scelta), null se assente. */
  image: Blob | null
  onPick: (image: CompressedImage) => void
  onRemove: () => void
}

export function ReceiptField({ image, onPick, onRemove }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!image) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(image)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [image])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(false)
    setBusy(true)
    try {
      onPick(await compressImage(file))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const fileInput = (ref: RefObject<HTMLInputElement>, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture ? 'environment' : undefined}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        void handleFile(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <div>
      {fileInput(cameraRef, true)}
      {fileInput(libraryRef, false)}

      {url ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="pressable overflow-hidden rounded-xl ring-1 ring-border"
            aria-label={t().tx.receiptView}
          >
            <img src={url} alt="" className="size-20 object-cover" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="pressable flex min-h-11 items-center gap-2 rounded-xl px-3 text-expense"
          >
            <Trash2 aria-hidden="true" className="size-5" />
            {t().tx.receiptRemove}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="pressable flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 font-medium"
          >
            <Camera aria-hidden="true" className="size-5" />
            {t().tx.receiptTake}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => libraryRef.current?.click()}
            className="pressable flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-3 font-medium"
          >
            <ImagePlus aria-hidden="true" className="size-5" />
            {t().tx.receiptPick}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-expense">
          {t().tx.receiptError}
        </p>
      )}

      {zoom && url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t().tx.receipt}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 pt-safe pb-safe"
          onClick={() => setZoom(false)}
        >
          <img src={url} alt={t().tx.receipt} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            autoFocus
            aria-label={t().common.close}
            className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 flex size-11 items-center justify-center rounded-full bg-white/20 text-white"
            onClick={() => setZoom(false)}
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
      )}
    </div>
  )
}
