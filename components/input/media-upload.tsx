"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, ImageIcon, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedMedia } from "@/lib/types"

interface MediaUploadProps {
  media: UploadedMedia | null
  onMediaChange: (media: UploadedMedia | null) => void
  disabled?: boolean
}

export function MediaUpload({ media, onMediaChange, disabled }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith("video/")
    const isImage = file.type.startsWith("image/")
    
    if (!isVideo && !isImage) return
    
    const preview = URL.createObjectURL(file)
    
    const reader = new FileReader()
    reader.onload = () => {
      const data = (reader.result as string).split(",")[1]
      onMediaChange({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview,
        data,
        type: isVideo ? "video" : "image"
      })
    }
    reader.readAsDataURL(file)
  }, [onMediaChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [disabled, processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }, [processFile])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (media?.preview) {
      URL.revokeObjectURL(media.preview)
    }
    onMediaChange(null)
  }, [media, onMediaChange])

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center aspect-[4/3] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "glassmorphic",
          isDragging 
            ? "border-primary bg-primary/10" 
            : media 
              ? "border-primary/50"
              : "border-border/50 hover:border-primary/30 hover:bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {media ? (
          <>
            {media.type === "video" ? (
              <video 
                src={media.preview} 
                className="absolute inset-0 w-full h-full object-cover"
                muted
              />
            ) : (
              <img 
                src={media.preview} 
                alt="Uploaded" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={handleRemove}
                className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            {/* Type indicator */}
            <div className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/60">
              {media.type === "video" ? (
                <Video className="size-4 text-white" />
              ) : (
                <ImageIcon className="size-4 text-white" />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <div className={cn(
              "p-3 rounded-lg border border-dashed",
              isDragging ? "border-primary bg-primary/10" : "border-border/50"
            )}>
              <Upload className={cn(
                "size-6",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop media here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
