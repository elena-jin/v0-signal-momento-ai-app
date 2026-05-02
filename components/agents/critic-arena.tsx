"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { CriticOpinion, CriticAgent } from "@/lib/types"
import { cn } from "@/lib/utils"

// The critic agents with distinct personalities
const CRITICS: CriticAgent[] = [
  {
    id: "brutus",
    name: "Brutus",
    avatar: "B",
    personality: "The Harsh Realist - tears apart weak content, respects only raw authenticity",
    color: "#ef4444"
  },
  {
    id: "viral-vera",
    name: "Viral Vera",
    avatar: "V",
    personality: "The Algorithm Whisperer - knows what makes content spread like wildfire",
    color: "#22c55e"
  },
  {
    id: "skeptical-sam",
    name: "Skeptical Sam",
    avatar: "S",
    personality: "The Devil's Advocate - challenges every assumption, finds fatal flaws",
    color: "#f59e0b"
  },
  {
    id: "engagement-emma",
    name: "Engagement Emma",
    avatar: "E",
    personality: "The Audience Expert - knows exactly what hooks people and why",
    color: "#8b5cf6"
  }
]

interface CriticArenaProps {
  opinions: CriticOpinion[]
  isDebating: boolean
  linkedinContent?: string
  twitterContent?: string
}

export function CriticArena({ opinions, isDebating, linkedinContent, twitterContent }: CriticArenaProps) {
  const [agentPositions, setAgentPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [speechBubble, setSpeechBubble] = useState<{ agentId: string; text: string } | null>(null)
  const arenaRef = useRef<HTMLDivElement>(null)

  // Initialize random positions
  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    CRITICS.forEach((critic, idx) => {
      const angle = (idx / CRITICS.length) * Math.PI * 2
      const radius = 80
      positions[critic.id] = {
        x: 50 + Math.cos(angle) * radius * 0.4,
        y: 50 + Math.sin(angle) * radius * 0.4
      }
    })
    setAgentPositions(positions)
  }, [])

  // Animate agents when debating
  useEffect(() => {
    if (!isDebating) return

    const interval = setInterval(() => {
      setAgentPositions(prev => {
        const newPositions = { ...prev }
        CRITICS.forEach(critic => {
          const current = newPositions[critic.id] || { x: 50, y: 50 }
          // Random walk with bounds
          newPositions[critic.id] = {
            x: Math.max(10, Math.min(90, current.x + (Math.random() - 0.5) * 8)),
            y: Math.max(15, Math.min(85, current.y + (Math.random() - 0.5) * 8))
          }
        })
        return newPositions
      })
    }, 800)

    return () => clearInterval(interval)
  }, [isDebating])

  // Show speech bubbles as opinions come in
  useEffect(() => {
    if (opinions.length === 0) return
    const latest = opinions[opinions.length - 1]
    setActiveAgent(latest.agentId)
    setSpeechBubble({ agentId: latest.agentId, text: latest.reasoning })
    
    const timeout = setTimeout(() => {
      setSpeechBubble(null)
    }, 4000)
    
    return () => clearTimeout(timeout)
  }, [opinions])

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "viral": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "solid": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "meh": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "skip": return "bg-red-500/20 text-red-400 border-red-500/30"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const averageScore = opinions.length > 0 
    ? Math.round(opinions.reduce((acc, o) => acc + o.viralPotential, 0) / opinions.length)
    : 0

  return (
    <Card className="bg-card/50 border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">The Critics Arena</h3>
            <p className="text-xs text-muted-foreground">AI agents debate your content</p>
          </div>
          {opinions.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{averageScore}%</div>
              <div className="text-xs text-muted-foreground">viral potential</div>
            </div>
          )}
        </div>
      </div>

      {/* Arena */}
      <div 
        ref={arenaRef}
        className="relative h-48 bg-gradient-to-b from-background/50 to-muted/30 overflow-hidden"
      >
        {/* Grid floor effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Agents */}
        {CRITICS.map((critic) => {
          const pos = agentPositions[critic.id] || { x: 50, y: 50 }
          const opinion = opinions.find(o => o.agentId === critic.id)
          const isActive = activeAgent === critic.id
          
          return (
            <motion.div
              key={critic.id}
              className="absolute"
              animate={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                scale: isActive ? 1.2 : 1
              }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              style={{ transform: "translate(-50%, -50%)" }}
            >
              {/* Speech bubble */}
              <AnimatePresence>
                {speechBubble?.agentId === critic.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.8 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-popover border border-border shadow-lg z-20"
                  >
                    <p className="text-xs text-foreground leading-tight">{speechBubble.text}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Agent avatar */}
              <motion.div
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg cursor-pointer",
                  isDebating && "animate-pulse"
                )}
                style={{ backgroundColor: critic.color }}
                whileHover={{ scale: 1.1 }}
                title={critic.personality}
              >
                {critic.avatar}
                
                {/* Verdict badge */}
                {opinion && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                      getVerdictColor(opinion.verdict)
                    )}
                  >
                    {opinion.verdict.toUpperCase()}
                  </motion.div>
                )}
              </motion.div>

              {/* Name tag */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                {critic.name}
              </div>
            </motion.div>
          )
        })}

        {/* Center ring when debating */}
        {isDebating && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Waiting state */}
        {!isDebating && opinions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Generate content to summon the critics</p>
          </div>
        )}
      </div>

      {/* Opinions summary */}
      {opinions.length > 0 && (
        <div className="p-4 space-y-3 border-t border-border/50">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verdicts</div>
          <div className="space-y-2">
            {opinions.map((opinion) => {
              const critic = CRITICS.find(c => c.id === opinion.agentId)
              if (!critic) return null
              
              return (
                <div key={opinion.agentId} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: critic.color }}
                  >
                    {critic.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{critic.name}</span>
                      <Badge variant="outline" className={cn("text-[10px]", getVerdictColor(opinion.verdict))}>
                        {opinion.verdict}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opinion.suggestion}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold" style={{ color: critic.color }}>{opinion.viralPotential}%</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overall viral meter */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Viral Potential</span>
              <span className="text-xs font-semibold text-foreground">{averageScore}%</span>
            </div>
            <Progress value={averageScore} className="h-2" />
          </div>
        </div>
      )}
    </Card>
  )
}
