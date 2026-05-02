"use client"

import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import type { UploadedImage } from "@/lib/types"
import { ImagePlus, X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DropZoneProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
  disabled?: boolean
}

export function DropZone({ 
  images, 
  onImagesChange, 
  maxImages = 5, 
  disabled = false 
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    )

    const remainingSlots = maxImages - images.length
    const filesToProcess = validFiles.slice(0, remainingSlots)

    const newImages: UploadedImage[] = await Promise.all(
      filesToProcess.map(async (file) => {
        const preview = URL.createObjectURL(file)
        const data = await fileToBase64(file)
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          preview,
          data
        }
      })
    )

    onImagesChange([...images, ...newImages])
  }, [images, maxImages, onImagesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || images.length >= maxImages) return
    processFiles(e.dataTransfer.files)
  }, [disabled, images.length, maxImages, processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && images.length < maxImages) {
      setIsDragging(true)
    }
  }, [disabled, images.length, maxImages])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
    }
    e.target.value = ""
  }, [processFiles])

  const removeImage = useCallback((id: string) => {
    const image = images.find(img => img.id === id)
    if (image) {
      URL.revokeObjectURL(image.preview)
    }
    onImagesChange(images.filter(img => img.id !== id))
  }, [images, onImagesChange])

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={image.preview}
                alt={image.file.name}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                disabled={disabled}
                className="absolute top-2 right-2 size-6 flex items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed"
              >
                <X className="size-3.5" />
                <span className="sr-only">Remove image</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
            disabled && "cursor-not-allowed opacity-50",
            images.length === 0 ? "min-h-[200px]" : "py-6"
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={handleFileSelect}
            disabled={disabled}
            className="sr-only"
          />
          
          <div className={cn(
            "flex size-12 items-center justify-center rounded-full",
            isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {images.length === 0 ? (
              <Upload className="size-5" />
            ) : (
              <ImagePlus className="size-5" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {images.length === 0 ? "Drop images here" : "Add more images"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {images.length}/{maxImages} images
              {images.length === 0 && " (JPG, PNG, WebP)"}
            </p>
          </div>
        </label>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to get just base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
