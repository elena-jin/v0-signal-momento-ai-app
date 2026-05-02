"use client"

import { Sparkles } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Momento</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          AI Content Agent
        </span>
      </div>
    </header>
  )
}
