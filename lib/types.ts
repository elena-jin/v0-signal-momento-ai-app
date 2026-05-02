export type AgentName = "vision" | "narrative" | "copy" | "format"

export interface UploadedImage {
  id: string
  file: File
  preview: string
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

export interface VisionAnalysis {
  images: Array<{
    index: number
    description: string
    subjects: string[]
    mood: string
    colors: string[]
    setting: string
    activity: string
    emotionalTone: string
  }>
  overallTheme: string
  suggestedNarrative: string
}

export interface NarrativeOutput {
  storyArc: string
  emotionalJourney: string
  keyThemes: string[]
  tone: "playful" | "inspirational" | "reflective" | "energetic" | "intimate"
  hooks: string[]
  callToAction: string
}

export interface CopyOutput {
  instagram: {
    caption: string
    hashtags: string[]
  }
  twitter: {
    thread: string[]
  }
  stories: Array<{
    imageIndex: number
    caption: string
    sticker: string
  }>
}

export interface GeneratedContent {
  instagram: {
    caption: string
    hashtags: string
    characterCount: number
  }
  twitter: {
    tweets: Array<{
      number: number
      content: string
      characterCount: number
    }>
  }
  stories: Array<{
    imageIndex: number
    caption: string
    suggestedSticker: string
    placement: "top" | "center" | "bottom"
  }>
  metadata: {
    generatedAt: string
    imageCount: number
    processingTime: number
  }
}

export type StreamEvent =
  | { type: "agent_start"; agent: AgentName; timestamp: string }
  | { type: "agent_thinking"; agent: AgentName; message: string }
  | { type: "agent_output"; agent: AgentName; output: unknown }
  | { type: "agent_complete"; agent: AgentName; duration: number }
  | { type: "content_ready"; platform: "instagram" | "twitter" | "stories"; content: unknown }
  | { type: "complete"; result: GeneratedContent }
  | { type: "error"; message: string; agent?: AgentName }

export type GenerateStatus = "idle" | "uploading" | "streaming" | "complete" | "error"

export interface GenerateState {
  status: GenerateStatus
  logs: LogEntry[]
  content: GeneratedContent | null
  activeAgent: AgentName | null
  error?: string
}
