"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, Brain, Zap } from "lucide-react"

interface Stats {
  thisWeek: number
  totalGenerations: number
  topTopics: Array<{ topic: string; count: number }>
  learningProgress: number
}

export function YourSignalSidebar() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh stats when generation completes
  useEffect(() => {
    const handler = () => {
      fetchStats()
    }
    window.addEventListener("signal-generation-complete", handler)
    return () => window.removeEventListener("signal-generation-complete", handler)
  }, [])

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Your Signal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = stats && stats.totalGenerations > 0

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Your Signal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Posts this week */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Zap className="size-3" />
              Posts this week
            </span>
            <span className="font-mono font-medium">{stats?.thisWeek || 0}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((stats?.thisWeek || 0) / 7) * 100)}%` }}
            />
          </div>
        </div>

        {/* Your topics */}
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3" />
            Your topics
          </span>
          {hasData && stats.topTopics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {stats.topTopics.slice(0, 4).map((topic, i) => (
                <Badge 
                  key={topic.topic} 
                  variant="secondary" 
                  className="text-[10px] font-normal px-2 py-0.5"
                  style={{ opacity: 1 - (i * 0.15) }}
                >
                  {topic.topic}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 italic">
              Generate content to discover your patterns
            </p>
          )}
        </div>

        {/* Learning progress */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Brain className="size-3" />
              Signal learning your voice
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {stats?.learningProgress || 0}%
            </span>
          </div>
          <Progress 
            value={stats?.learningProgress || 0} 
            className="h-1.5"
          />
          {!hasData && (
            <p className="text-[10px] text-muted-foreground/60">
              {100 - (stats?.learningProgress || 0)} more posts to fully learn your style
            </p>
          )}
          {hasData && stats.learningProgress < 100 && (
            <p className="text-[10px] text-muted-foreground/60">
              {Math.ceil((100 - stats.learningProgress) * 1)} more generations to fully learn
            </p>
          )}
          {hasData && stats.learningProgress >= 100 && (
            <p className="text-[10px] text-primary/80">
              Signal knows your voice
            </p>
          )}
        </div>

        {/* Total stats */}
        {hasData && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-foreground">
                {stats.totalGenerations}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                total generations
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
