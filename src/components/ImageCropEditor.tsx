import { useEffect, useMemo, useState } from 'react'
import { X, ZoomIn, MoveHorizontal, MoveVertical, Check } from 'lucide-react'
import './ImageCropEditor.css'

interface ImageCropEditorProps {
  file: File
  title: string
  outputSize: number
  safePadding?: boolean
  onCancel: () => void
  onSave: (file: File) => void
}

export default function ImageCropEditor({ file, title, outputSize, safePadding = false, onCancel, onSave }: ImageCropEditorProps) {
  const [sourceUrl, setSourceUrl] = useState('')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(50)
  const [offsetY, setOffsetY] = useState(50)
  const [resize, setResize] = useState(outputSize)
  const [paddingPercent, setPaddingPercent] = useState(safePadding ? 14 : 0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    const nextImage = new Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.onerror = () => setError('This image could not be opened. Please choose another file.')
    nextImage.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewStyle = useMemo(() => ({
    backgroundImage: sourceUrl ? `url(${sourceUrl})` : undefined,
    backgroundPosition: `${offsetX}% ${offsetY}%`,
    backgroundSize: `${Math.max(100, zoom * 100) * (1 - (paddingPercent / 100) * 2)}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(3, 45, 97, 0.08)',
  }), [sourceUrl, offsetX, offsetY, zoom, paddingPercent])

  const handleSave = async () => {
    if (!image) return
    setIsSaving(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = resize
      canvas.height = resize
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is unavailable in this browser.')

      const sourceRatio = image.width / image.height
      const cropWidth = sourceRatio >= 1 ? image.height : image.width
      const zoomedCrop = cropWidth / zoom
      const maxX = image.width - zoomedCrop
      const maxY = image.height - zoomedCrop
      const sx = (maxX * offsetX) / 100
      const sy = (maxY * offsetY) / 100

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      const paddingPixels = Math.round(resize * (paddingPercent / 100))
      const contentSize = resize - (paddingPixels * 2)
      context.drawImage(image, sx, sy, zoomedCrop, zoomedCrop, paddingPixels, paddingPixels, contentSize, contentSize)

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92))
      if (!blob) throw new Error('The edited image could not be prepared.')
      onSave(new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}-cropped.png`, { type: 'image/png' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The edited image could not be prepared.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="image-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
      <div className="image-editor-panel">
        <div className="image-editor-header">
          <div>
            <h3 id="image-editor-title">{title}</h3>
            <p>{safePadding ? 'Crop and resize the favicon with built-in safe spacing so the artwork does not touch the installed icon edges.' : 'Crop the image into a clean square and resize it before saving.'}</p>
          </div>
          <button type="button" className="image-editor-close" onClick={onCancel} aria-label="Close image editor"><X size={22} /></button>
        </div>

        <div className="image-editor-preview" style={previewStyle} aria-label="Square crop preview" />

        <div className="image-editor-controls">
          <label>
            <span><ZoomIn size={16} /> Zoom</span>
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label>
            <span><MoveHorizontal size={16} /> Horizontal position</span>
            <input type="range" min="0" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
          </label>
          <label>
            <span><MoveVertical size={16} /> Vertical position</span>
            <input type="range" min="0" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
          </label>
          {safePadding && (
            <label>
              <span>Safe area padding: {paddingPercent}%</span>
              <input type="range" min="8" max="24" step="1" value={paddingPercent} onChange={(event) => setPaddingPercent(Number(event.target.value))} />
            </label>
          )}
          <label>
            <span>Output size</span>
            <select value={resize} onChange={(event) => setResize(Number(event.target.value))}>
              <option value={256}>256 × 256 px</option>
              <option value={512}>512 × 512 px</option>
              <option value={1024}>1024 × 1024 px</option>
            </select>
          </label>
        </div>

        {error && <p className="image-editor-error" role="alert">{error}</p>}

        <div className="image-editor-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSaving}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={!image || isSaving}>
            <Check size={17} /> {isSaving ? 'Preparing...' : 'Use This Image'}
          </button>
        </div>
      </div>
    </div>
  )
}
