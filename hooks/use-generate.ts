"use client"

import { useState, useCallback } from "react"
import type { 
  GenerateState, 
  LogEntry, 
  StreamEvent, 
  UploadedMedia, 
  VoiceRecording,
  GeneratedContent,
  AgentName,
  CriticOpinion
} from "@/lib/types"

interface ExtendedGenerateState extends GenerateState {
  critics: CriticOpinion[]
}

const initialState: ExtendedGenerateState = {
  status: "idle",
  logs: [],
  content: null,
  activeAgent: null,
  critics: []
}

export function useGenerate() {
  const [state, setState] = useState<ExtendedGenerateState>(initialState)

  const generate = useCallback(async (
    voice: VoiceRecording | null, 
    media: UploadedMedia | null, 
    context?: string
  ) => {
    // Need at least voice or media
    if (!voice && !media) return

    setState({
      status: "streaming",
      logs: [],
      content: null,
      activeAgent: null,
      critics: []
    })

    try {
      // Prepare voice data
      let voiceData: { data: string; duration: number } | undefined
      if (voice) {
        const reader = new FileReader()
        const voiceBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1])
          reader.readAsDataURL(voice.blob)
        })
        voiceData = { data: voiceBase64, duration: voice.duration }
      }

      // Prepare media data
      let mediaData: { data: string; type: string; mediaType: "image" | "video" } | undefined
      if (media && media.data) {
        mediaData = { 
          data: media.data, 
          type: media.file.type, 
          mediaType: media.type 
        }
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          voice: voiceData, 
          media: mediaData, 
          context 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as StreamEvent
              handleStreamEvent(data, setState)
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6)) as StreamEvent
          handleStreamEvent(data, setState)
        } catch {
          // Skip invalid JSON
        }
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }))
    }
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return { ...state, generate, reset }
}

function handleStreamEvent(
  event: StreamEvent, 
  setState: React.Dispatch<React.SetStateAction<ExtendedGenerateState>>
) {
  switch (event.type) {
    case "agent_start":
      setState(prev => ({
        ...prev,
        activeAgent: event.agent,
        logs: [...prev.logs, createLogEntry(event.agent, "start", `Starting ${event.agent} agent...`)]
      }))
      break

    case "agent_thinking":
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, createLogEntry(event.agent, "thinking", event.message)]
      }))
      break

    case "agent_output":
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, createLogEntry(event.agent, "output", "Output generated")]
      }))
      break

    case "agent_complete":
      setState(prev => ({
        ...prev,
        logs: [...prev.logs, createLogEntry(event.agent, "complete", `Done`, event.duration)]
      }))
      break

    case "content_ready":
      break

    case "critic_opinion":
      setState(prev => ({
        ...prev,
        critics: [...prev.critics, event.opinion]
      }))
      break

    case "complete":
      setState(prev => ({
        ...prev,
        status: "complete",
        activeAgent: null,
        content: event.result
      }))
      break

    case "error":
      setState(prev => ({
        ...prev,
        status: "error",
        error: event.message,
        activeAgent: null,
        logs: event.agent 
          ? [...prev.logs, createLogEntry(event.agent, "error", event.message)]
          : prev.logs
      }))
      break
  }
}

function createLogEntry(
  agent: AgentName, 
  type: LogEntry["type"], 
  message: string,
  duration?: number
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    agent,
    type,
    message,
    duration
  }
}
