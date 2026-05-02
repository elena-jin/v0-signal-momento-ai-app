"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry, AgentName } from "@/lib/types"
import { Search, BookOpen, Pen, Layout, Check, Loader2, AlertCircle, TrendingUp } from "lucide-react"

interface AgentLogProps {
  entries: LogEntry[]
  isStreaming: boolean
  activeAgent?: AgentName | null
}

const agentConfig: Record<AgentName, { 
  icon: typeof Search
  label: string
  colorClass: string
}> = {
  vision: { 
    icon: Search, 
    label: "VISION AGENT",
    colorClass: "text-agent-vision"
  },
  narrative: { 
    icon: BookOpen, 
    label: "NARRATIVE AGENT",
    colorClass: "text-agent-narrative"
  },
  trend: {
    icon: TrendingUp,
    label: "TREND AGENT",
    colorClass: "text-amber-500"
  },
  copy: { 
    icon: Pen, 
    label: "COPY AGENT",
    colorClass: "text-agent-copy"
  },
  format: { 
    icon: Layout, 
    label: "FORMAT AGENT",
    colorClass: "text-agent-format"
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
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Agent activity will appear here once you start generating.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium">Agent Log</span>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 font-mono text-[13px]">
          {groupedEntries.map((group, groupIdx) => {
            const config = agentConfig[group.agent]
            const Icon = config.icon
            const isActive = activeAgent === group.agent
            const isComplete = group.entries.some(e => e.type === "complete")
            const hasError = group.entries.some(e => e.type === "error")
            const duration = group.entries.find(e => e.duration)?.duration

            return (
              <div key={groupIdx} className="flex flex-col gap-1">
                {/* Agent header */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatTime(group.entries[0].timestamp)}
                  </span>
                  <Icon className={cn("size-4", config.colorClass)} />
                  <span className={cn("font-semibold", config.colorClass)}>
                    {config.label}
                  </span>
                  {isActive && !isComplete && (
                    <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                
                {/* Log entries */}
                <div className="flex flex-col gap-0.5 pl-6 border-l-2 border-border ml-[52px]">
                  {group.entries.map((entry, entryIdx) => (
                    <LogLine key={entry.id} entry={entry} isLast={entryIdx === group.entries.length - 1 && isActive} />
                  ))}
                  
                  {/* Completion indicator */}
                  {isComplete && (
                    <div className="flex items-center gap-2 text-agent-copy">
                      <Check className="size-3.5" />
                      <span>Complete</span>
                      {duration && (
                        <span className="text-muted-foreground">
                          ({(duration / 1000).toFixed(1)}s)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {hasError && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="size-3.5" />
                      <span>Error occurred</span>
                    </div>
                  )}
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

function LogLine({ entry, isLast }: { entry: LogEntry; isLast: boolean }) {
  if (entry.type === "start" || entry.type === "complete") {
    return null
  }

  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="select-none">-</span>
      <span className="break-words">{entry.message}</span>
      {isLast && entry.type === "thinking" && (
        <Loader2 className="size-3 animate-spin ml-1 shrink-0" />
      )}
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
