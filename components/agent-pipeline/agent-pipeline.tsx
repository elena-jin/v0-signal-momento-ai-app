"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry, AgentName } from "@/lib/types"
import { Check, Loader2, Clock } from "lucide-react"

interface AgentPipelineProps {
  entries: LogEntry[]
  isStreaming: boolean
  activeAgent?: AgentName | null
}

const agents: Array<{
  id: AgentName
  name: string
  description: string
}> = [
  { id: "capture", name: "Capture Agent", description: "PROCESS COMPLETE" },
  { id: "insight", name: "Insight Agent", description: "ANALYSIS FINISHED" },
  { id: "trend", name: "Trend Agent", description: "CONTEXT MATCHED" },
  { id: "angle", name: "Angle Agent", description: "PROCESSING HOOKS" },
  { id: "copy", name: "Copy Agent", description: "GENERATING COPY" },
  { id: "critic", name: "Critic Agent", description: "REVIEWING CONTENT" },
]

export function AgentPipeline({ entries, isStreaming, activeAgent }: AgentPipelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Determine agent states based on entries
  const getAgentState = (agentId: AgentName): "waiting" | "active" | "complete" => {
    const agentEntries = entries.filter(e => e.agent === agentId)
    if (agentEntries.some(e => e.type === "complete")) return "complete"
    if (agentEntries.some(e => e.type === "start" || e.type === "thinking")) return "active"
    return "waiting"
  }

  const getAgentDuration = (agentId: AgentName): number | null => {
    const completeEntry = entries.find(e => e.agent === agentId && e.type === "complete")
    return completeEntry?.duration || null
  }

  const getAgentMessage = (agentId: AgentName): string | null => {
    const thinkingEntries = entries.filter(e => e.agent === agentId && e.type === "thinking")
    return thinkingEntries[thinkingEntries.length - 1]?.message || null
  }

  // Get console messages (last 5 thinking entries)
  const consoleMessages = entries
    .filter(e => e.type === "thinking")
    .slice(-5)
    .map(e => e.message)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <h2 className="text-lg font-semibold">Agent Pipeline</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Real-time execution logs.</p>
      </div>

      {/* Agent Cards */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="flex flex-col gap-2">
          {agents.map((agent) => {
            const state = getAgentState(agent.id)
            const duration = getAgentDuration(agent.id)
            const message = getAgentMessage(agent.id)
            const isActive = activeAgent === agent.id

            return (
              <div
                key={agent.id}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-lg border transition-all",
                  state === "complete" && "bg-primary/10 border-primary/30",
                  state === "active" && "bg-amber-500/10 border-amber-500/30",
                  state === "waiting" && "bg-muted/30 border-border/50 opacity-50"
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  "flex items-center justify-center size-8 rounded-full shrink-0",
                  state === "complete" && "bg-primary/20",
                  state === "active" && "bg-amber-500/20",
                  state === "waiting" && "bg-muted"
                )}>
                  {state === "complete" && (
                    <Check className="size-4 text-primary" />
                  )}
                  {state === "active" && (
                    <Loader2 className="size-4 text-amber-500 animate-spin" />
                  )}
                  {state === "waiting" && (
                    <Clock className="size-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    state === "waiting" && "text-muted-foreground"
                  )}>
                    {agent.name}
                  </p>
                  <p className={cn(
                    "text-xs font-mono uppercase tracking-wider truncate",
                    state === "complete" && "text-primary/70",
                    state === "active" && "text-amber-500/70",
                    state === "waiting" && "text-muted-foreground/50"
                  )}>
                    {state === "complete" && duration 
                      ? `${agent.description} · ${(duration / 1000).toFixed(1)}S`
                      : state === "active" && message
                        ? message.slice(0, 30) + (message.length > 30 ? "..." : "")
                        : state === "waiting" 
                          ? "WAITING IN QUEUE"
                          : agent.description
                    }
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* System Console */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">System Console</span>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="size-1.5 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
        <div className="bg-black/30 rounded-md p-3 font-mono text-xs space-y-1 max-h-28 overflow-y-auto">
          {consoleMessages.length > 0 ? (
            consoleMessages.map((msg, i) => (
              <p key={i} className={cn(
                "text-muted-foreground/70",
                i === consoleMessages.length - 1 && "text-primary"
              )}>
                {">"} {msg}
              </p>
            ))
          ) : (
            <>
              <p className="text-muted-foreground/50">{">"} Initializing semantic layer...</p>
              <p className="text-muted-foreground/50">{">"} Loading vector database...</p>
              <p className="text-primary">{">"} Connection established.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
