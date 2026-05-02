export type AgentName = "capture" | "insight" | "trend" | "angle" | "copy"

export interface UploadedMedia {
  id: string
  file: File
  preview: string
  data?: string // Base64 encoded
  type: "image" | "video"
}

export interface VoiceRecording {
  blob: Blob
  duration: number
  data?: string // Base64 encoded
}

export interface LogEntry {
  id: string
  timestamp: Date
  agent: AgentName
  type: "start" | "thinking" | "output" | "complete" | "error"
  message: string
  details?: unknown
  duration?: number
}

export interface CaptureOutput {
  transcription?: string
  imageAnalysis?: {
    description: string
    subjects: string[]
    mood: string
    setting: string
    activity: string
  }
  rawThought: string
  contentCategory: string
}

export interface InsightOutput {
  coreIdea: string
  uniqueAngle: string
  emotionalHook: string
  targetAudience: string
  strengthScore: number
}

export interface TrendOutput {
  category: string
  headlines: string[]
  trendingTopics: string[]
  relevantHashtags: string[]
  timingInsight: string
}

export interface AngleOutput {
  freshTake: string
  contrarian: string
  personalConnection: string
  recommendedAngle: string
  reasoning: string
}

export interface CopyOutput {
  linkedin: {
    content: string
    hook: string
    cta: string
  }
  twitter: {
    thread: Array<{
      number: number
      content: string
      hashtags: string[]
    }>
  }
}

export interface GeneratedContent {
  linkedin: {
    content: string
    hook: string
    cta: string
    characterCount: number
  }
  twitter: {
    tweets: Array<{
      number: number
      content: string
      characterCount: number
    }>
  }
  metadata: {
    generatedAt: string
    processingTime: number
    hasVoice: boolean
    hasMedia: boolean
  }
}

export type StreamEvent =
  | { type: "agent_start"; agent: AgentName; timestamp: string }
  | { type: "agent_thinking"; agent: AgentName; message: string }
  | { type: "agent_output"; agent: AgentName; output: unknown }
  | { type: "agent_complete"; agent: AgentName; duration: number }
  | { type: "content_ready"; platform: "linkedin" | "twitter"; content: unknown }
  | { type: "complete"; result: GeneratedContent }
  | { type: "error"; message: string; agent?: AgentName }

export type GenerateStatus = "idle" | "recording" | "processing" | "streaming" | "complete" | "error"

export interface GenerateState {
  status: GenerateStatus
  logs: LogEntry[]
  content: GeneratedContent | null
  activeAgent: AgentName | null
  error?: string
}
