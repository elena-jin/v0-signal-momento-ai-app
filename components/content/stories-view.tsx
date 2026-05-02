"use client"

import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { GeneratedContent, UploadedImage } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StoriesViewProps {
  content: GeneratedContent | null
  isLoading: boolean
  images: UploadedImage[]
}

export function StoriesView({ content, isLoading, images }: StoriesViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyCaption = async (caption: string, index: number) => {
    await navigator.clipboard.writeText(caption)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[9/16] bg-muted animate-pulse rounded-xl" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="flex gap-2 mb-4">
          <div className="size-3 rounded-full bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500" />
          <div className="size-3 rounded-full bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500" />
          <div className="size-3 rounded-full bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500" />
        </div>
        <p className="text-sm text-muted-foreground">
          Story captions will appear here after generation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <span className="text-sm font-medium">Story Captions</span>
      
      <div className="grid grid-cols-2 gap-4">
        {content.stories.map((story) => {
          const image = images[story.imageIndex]
          
          return (
            <div 
              key={story.imageIndex}
              className="group flex flex-col gap-2"
            >
              {/* Story preview card */}
              <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-border bg-muted">
                {image ? (
                  <img 
                    src={image.preview}
                    alt={`Story ${story.imageIndex + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      Image {story.imageIndex + 1}
                    </span>
                  </div>
                )}
                
                {/* Caption overlay */}
                <div className={cn(
                  "absolute inset-x-0 p-4",
                  story.placement === "top" && "top-0 bg-gradient-to-b from-black/60 to-transparent",
                  story.placement === "center" && "top-1/2 -translate-y-1/2",
                  story.placement === "bottom" && "bottom-0 bg-gradient-to-t from-black/60 to-transparent"
                )}>
                  <p className={cn(
                    "text-white text-sm font-medium text-center",
                    story.placement === "center" && "bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2"
                  )}>
                    {story.caption}
                  </p>
                </div>
                
                {/* Sticker suggestion */}
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">
                    {story.suggestedSticker}
                  </span>
                </div>
              </div>
              
              {/* Caption text with copy */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground truncate flex-1">
                  &quot;{story.caption}&quot;
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copyCaption(story.caption, story.imageIndex)}
                  className="shrink-0 size-6"
                >
                  {copiedIndex === story.imageIndex ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
