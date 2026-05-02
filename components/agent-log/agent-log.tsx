"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry, AgentName } from "@/lib/types"
import { Eye, Lightbulb, TrendingUp, Zap, PenTool, Check, Loader2, AlertCircle, Users } from "lucide-react"

interface AgentLogProps {
  entries: LogEntry[]
  isStreaming: boolean
  activeAgent?: AgentName | null
}

const agentConfig: Record<AgentName, { 
  icon: typeof Eye
  label: string
  colorClass: string
}> = {
  capture: { 
    icon: Eye, 
    label: "CAPTURE",
    colorClass: "text-cyan-400"
  },
  insight: { 
    icon: Lightbulb, 
    label: "INSIGHT",
    colorClass: "text-yellow-400"
  },
  trend: {
    icon: TrendingUp,
    label: "TREND",
    colorClass: "text-primary"
  },
  angle: { 
    icon: Zap, 
    label: "ANGLE",
    colorClass: "text-pink-400"
  },
  copy: { 
    icon: PenTool, 
    label: "COPY",
    colorClass: "text-emerald-400"
  },
  critic: {
    icon: Users,
    label: "CRITICS",
    colorClass: "text-orange-400"
  }
}

export function AgentLog({ entries, isStreaming, activeAgent }: AgentLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries])

  const groupedEntries = entries.reduce((acc, entry) => {
    const lastGroup = acc[acc.length - 1]
    
    if (entry.type === "start") {
      acc.push({ agent: entry.agent, entries: [entry] })
    } else if (lastGroup && lastGroup.agent === entry.agent) {
      lastGroup.entries.push(entry)
    } else {
      acc.push({ agent: entry.agent, entries: [entry] })
    }
    
    return acc
  }, [] as Array<{ agent: AgentName; entries: LogEntry[] }>)

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 font-mono">
        <div className="text-4xl mb-4 opacity-30">{">"}_</div>
        <p className="text-sm text-muted-foreground">
          Awaiting signal...
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Hold mic or drop media to begin
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="text-xs font-mono font-medium tracking-wider text-muted-foreground">AGENT_LOG</span>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-mono text-primary">LIVE</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-3 font-mono text-xs">
          {groupedEntries.map((group, groupIdx) => {
            const config = agentConfig[group.agent]
            if (!config) return null
            const Icon = config.icon
            const isActive = activeAgent === group.agent
            const isComplete = group.entries.some(e => e.type === "complete")
            const hasError = group.entries.some(e => e.type === "error")
            const duration = group.entries.find(e => e.duration)?.duration

            return (
              <div key={groupIdx} className="flex flex-col gap-1">
                {/* Agent header */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/60 w-16 shrink-0">
                    {formatTime(group.entries[0].timestamp)}
                  </span>
                  <Icon className={cn("size-3.5", config.colorClass)} />
                  <span className={cn("font-bold tracking-wider", config.colorClass)}>
                    {config.label}
                  </span>
                  {isActive && !isComplete && !hasError && (
                    <Loader2 className="size-3 animate-spin ml-auto text-muted-foreground" />
                  )}
                  {isComplete && (
                    <div className="flex items-center gap-1 ml-auto text-emerald-400">
                      <Check className="size-3" />
                      {duration && <span className="text-muted-foreground/60">{(duration / 1000).toFixed(1)}s</span>}
                    </div>
                  )}
                  {hasError && (
                    <AlertCircle className="size-3 ml-auto text-destructive" />
                  )}
                </div>
                
                {/* Log entries */}
                <div className="flex flex-col gap-0.5 pl-[88px] border-l border-border/30 ml-[7px]">
                  {group.entries.map((entry) => (
                    <LogLine key={entry.id} entry={entry} isActive={isActive && entry === group.entries[group.entries.length - 1]} />
                  ))}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

function LogLine({ entry, isActive }: { entry: LogEntry; isActive: boolean }) {
  if (entry.type === "start" || entry.type === "complete") {
    return null
  }

  return (
    <div className={cn(
      "flex items-start gap-2",
      entry.type === "error" ? "text-destructive" : "text-muted-foreground/80"
    )}>
      <span className="select-none opacity-40">
        {entry.type === "thinking" && ".."}
        {entry.type === "output" && "=>"}
        {entry.type === "error" && "!!"}
      </span>
      <span className="break-words leading-relaxed">{entry.message}</span>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}
