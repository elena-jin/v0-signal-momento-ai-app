"use client"

import { useState } from "react"
import { Copy, Check, ThumbsUp, MessageCircle, Repeat2, Send, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { GeneratedContent } from "@/lib/types"

interface LinkedInViewProps {
  content: GeneratedContent | null
  isLoading: boolean
}

export function LinkedInView({ content, isLoading }: LinkedInViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!content?.linkedin) return
    
    await navigator.clipboard.writeText(content.linkedin.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <p className="text-sm text-muted-foreground mt-6">Generating LinkedIn post...</p>
      </div>
    )
  }

  if (!content?.linkedin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <svg className="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No content yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Record a voice note or upload media to generate your LinkedIn post
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Copy button header */}
      <div className="flex items-center justify-end p-4 border-b border-border">
        <Button
          onClick={handleCopy}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy Post
            </>
          )}
        </Button>
      </div>
      
      {/* LinkedIn Post Mockup */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto">
          {/* Post Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                  Y
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">Your Name</span>
                    <span className="text-gray-500 text-sm">• 1st</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">Your headline goes here</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Just now</span>
                    <span>•</span>
                    <Globe className="size-3" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4">
              <p className="text-gray-900 text-sm whitespace-pre-wrap leading-relaxed">
                {content.linkedin.content}
              </p>
            </div>
            
            {/* Engagement stats */}
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="flex -space-x-1">
                  <div className="size-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <ThumbsUp className="size-2.5 text-white" />
                  </div>
                  <div className="size-4 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-[8px]">❤️</span>
                  </div>
                </div>
                <span className="ml-1">You and 127 others</span>
                <span className="ml-auto">18 comments • 5 reposts</span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="px-2 py-1 border-t border-gray-100">
              <div className="flex justify-between">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <ThumbsUp className="size-5" />
                  <span className="text-sm font-medium">Like</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <MessageCircle className="size-5" />
                  <span className="text-sm font-medium">Comment</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <Repeat2 className="size-5" />
                  <span className="text-sm font-medium">Repost</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                  <Send className="size-5" />
                  <span className="text-sm font-medium">Send</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Character count */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            {content.linkedin.characterCount.toLocaleString()} characters
          </p>
        </div>
      </div>
    </div>
  )
}
