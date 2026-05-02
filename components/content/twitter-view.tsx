"use client"

import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { GeneratedContent } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TwitterViewProps {
  content: GeneratedContent | null
  isLoading: boolean
}

export function TwitterView({ content, isLoading }: TwitterViewProps) {
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedTweet, setCopiedTweet] = useState<number | null>(null)

  const copyAllTweets = async () => {
    if (!content) return
    const allTweets = content.twitter.tweets
      .map(t => `${t.number}/5\n${t.content}`)
      .join('\n\n')
    await navigator.clipboard.writeText(allTweets)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const copyTweet = async (tweet: { content: string; number: number }) => {
    await navigator.clipboard.writeText(tweet.content)
    setCopiedTweet(tweet.number)
    setTimeout(() => setCopiedTweet(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-8 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="size-16 rounded-2xl bg-foreground flex items-center justify-center mb-4">
          <svg className="size-8 text-background" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          Twitter thread will appear here after generation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Twitter Thread (5 tweets)</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyAllTweets}
          className="gap-2"
        >
          {copiedAll ? (
            <>
              <Check className="size-3.5" />
              Copied All
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy All
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {content.twitter.tweets.map((tweet, idx) => (
          <div 
            key={tweet.number}
            className="group rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-muted-foreground/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {tweet.number}/5
                  </span>
                  {idx === 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Thread Start
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {tweet.content}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => copyTweet(tweet)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedTweet === tweet.number ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <div className="flex justify-end mt-2">
              <span className={cn(
                "text-xs",
                tweet.characterCount > 260 
                  ? "text-destructive" 
                  : "text-muted-foreground"
              )}>
                {tweet.characterCount}/280
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
