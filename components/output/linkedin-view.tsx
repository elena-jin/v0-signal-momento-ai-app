"use client"

import { ThumbsUp, MessageCircle, Repeat2, Send, Globe } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { GeneratedContent } from "@/lib/types"

interface LinkedInViewProps {
  content: GeneratedContent | null
  isLoading: boolean
}

// Helper to highlight hashtags in teal
function formatContent(text: string) {
  const parts = text.split(/(#\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return <span key={i} className="text-primary">{part}</span>
    }
    // Bold text between ** markers
    if (part.includes("**")) {
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
      return boldParts.map((bp, j) => {
        if (bp.startsWith("**") && bp.endsWith("**")) {
          return <strong key={`${i}-${j}`} className="font-semibold">{bp.slice(2, -2)}</strong>
        }
        return bp
      })
    }
    return part
  })
}

export function LinkedInView({ content, isLoading }: LinkedInViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-xl space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full mt-4" />
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
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl">
        {/* LinkedIn Post Card - Dark theme matching the app */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="size-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                S
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Signal AI</span>
                  <span className="text-muted-foreground text-sm">• 1st</span>
                </div>
                <p className="text-xs text-muted-foreground">Autonomous Orchestrator at Signal</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span>Just now</span>
                  <span>•</span>
                  <Globe className="size-3" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-4 pb-4">
            <div className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
              {formatContent(content.linkedin.content)}
            </div>
          </div>
          
          {/* Image placeholder if available */}
          <div className="mx-4 mb-4 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-background aspect-video flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full">
              {/* Network visualization placeholder */}
              <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                <defs>
                  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgb(20 184 166 / 0.3)" />
                    <stop offset="100%" stopColor="rgb(20 184 166 / 0)" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="100" r="80" fill="url(#glow)" />
                {/* Network nodes */}
                {[
                  { x: 100, y: 80 }, { x: 150, y: 50 }, { x: 200, y: 100 }, { x: 250, y: 70 },
                  { x: 300, y: 90 }, { x: 180, y: 150 }, { x: 220, y: 140 }, { x: 280, y: 130 },
                  { x: 120, y: 120 }, { x: 160, y: 100 }
                ].map((node, i) => (
                  <g key={i}>
                    <circle cx={node.x} cy={node.y} r="4" fill="rgb(20 184 166)" />
                    <circle cx={node.x} cy={node.y} r="8" fill="rgb(20 184 166 / 0.3)" />
                  </g>
                ))}
                {/* Lines */}
                <path d="M100 80 L150 50 M150 50 L200 100 M200 100 L250 70 M250 70 L300 90 M200 100 L180 150 M200 100 L220 140 M220 140 L280 130 M100 80 L120 120 M120 120 L160 100 M160 100 L200 100" 
                      stroke="rgb(20 184 166 / 0.4)" strokeWidth="1" />
              </svg>
            </div>
          </div>
          
          {/* Engagement stats */}
          <div className="px-4 py-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                <div className="size-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <ThumbsUp className="size-2.5 text-white" />
                </div>
                <div className="size-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[8px]">🔥</span>
                </div>
              </div>
              <span className="ml-1">You and 127 others</span>
              <span className="ml-auto">18 comments • 5 reposts</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="px-2 py-1 border-t border-border/50">
            <div className="flex justify-between">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <ThumbsUp className="size-5" />
                <span className="text-sm font-medium">Like</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <MessageCircle className="size-5" />
                <span className="text-sm font-medium">Comment</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <Repeat2 className="size-5" />
                <span className="text-sm font-medium">Repost</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <Send className="size-5" />
                <span className="text-sm font-medium">Send</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Character count */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {(content.linkedin.characterCount ?? content.linkedin.content?.length ?? 0).toLocaleString()} characters
        </p>
      </div>
    </div>
  )
}
