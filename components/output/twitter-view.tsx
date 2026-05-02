"use client"

import { useState } from "react"
import { Copy, Check, Heart, MessageCircle, Repeat2, Share, BarChart2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { GeneratedContent } from "@/lib/types"

interface TwitterViewProps {
  content: GeneratedContent | null
  isLoading: boolean
}

export function TwitterView({ content, isLoading }: TwitterViewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!content?.twitter) return
    
    const thread = content.twitter.tweets
      .map(t => `${t.number}/${content.twitter.tweets.length}\n${t.content}`)
      .join("\n\n---\n\n")
    
    await navigator.clipboard.writeText(thread)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <p className="text-sm text-muted-foreground mt-6">Generating Twitter thread...</p>
      </div>
    )
  }

  if (!content?.twitter) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <svg className="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No content yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Record a voice note or upload media to generate your Twitter thread
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
              Copied Thread
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy Thread
            </>
          )}
        </Button>
      </div>
      
      {/* Twitter Thread Mockup */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-lg mx-auto space-y-0">
          {content.twitter.tweets.map((tweet, index) => (
            <div key={tweet.number} className="relative">
              {/* Thread connector line */}
              {index < content.twitter.tweets.length - 1 && (
                <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-700" />
              )}
              
              {/* Tweet Card */}
              <div className="bg-black border border-gray-800 rounded-xl p-4 relative z-10">
                {/* Header */}
                <div className="flex gap-3 mb-2">
                  {/* Avatar */}
                  <div className="size-12 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    Y
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-white">Your Name</span>
                      <svg className="size-4 text-primary" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
                      </svg>
                      <span className="text-gray-500">@yourhandle</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500 text-sm">now</span>
                    </div>
                    
                    {/* Thread indicator */}
                    {index === 0 && (
                      <p className="text-sm text-gray-500">
                        Thread {tweet.number}/{content.twitter.tweets.length}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="pl-15 ml-15">
                  <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
                    {tweet.content}
                  </p>
                  
                  {/* Character count badge */}
                  <span className="inline-block px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400 mb-3">
                    {tweet.characterCount}/280
                  </span>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between text-gray-500 max-w-md">
                    <button className="flex items-center gap-1 hover:text-primary transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                        <MessageCircle className="size-4" />
                      </div>
                      <span className="text-xs">24</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-green-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                        <Repeat2 className="size-4" />
                      </div>
                      <span className="text-xs">12</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-pink-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
                        <Heart className="size-4" />
                      </div>
                      <span className="text-xs">148</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                        <BarChart2 className="size-4" />
                      </div>
                      <span className="text-xs">2.4K</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button className="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                        <Bookmark className="size-4" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                        <Share className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
