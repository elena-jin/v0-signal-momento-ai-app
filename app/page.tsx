"use client"

import { useState, useEffect, useRef } from "react"
import { VoiceRecorder } from "@/components/input/voice-recorder"
import { MediaUpload } from "@/components/input/media-upload"
import { AgentLog } from "@/components/agent-log/agent-log"
import { LinkedInView } from "@/components/output/linkedin-view"
import { TwitterView } from "@/components/output/twitter-view"
import { useGenerate } from "@/hooks/use-generate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadedMedia, VoiceRecording } from "@/lib/types"
import { Flame, Terminal, AlertCircle, ExternalLink, Zap } from "lucide-react"
import { YourSignalSidebar } from "@/components/sidebar/your-signal"

export default function SignalPage() {
  const [voice, setVoice] = useState<VoiceRecording | null>(null)
  const [media, setMedia] = useState<UploadedMedia | null>(null)
  const [context, setContext] = useState("")
  const [activeTab, setActiveTab] = useState("linkedin")
  
  const { status, logs, content, activeAgent, error, generate, reset } = useGenerate()

  const isGenerating = status === "streaming"
  const hasContent = status === "complete" && content !== null
  const hasError = status === "error"
  const prevStatusRef = useRef(status)

  // Dispatch event when generation completes so sidebar refreshes
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status === "complete") {
      window.dispatchEvent(new Event("signal-generation-complete"))
    }
    prevStatusRef.current = status
  }, [status])
  const canGenerate = (voice !== null || media !== null) && !isGenerating

  const handleVoiceRecording = (blob: Blob, duration: number) => {
    setVoice({ blob, duration })
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setActiveTab("log")
    await generate(voice, media, context || undefined)
  }

  const handleReset = () => {
    reset()
    setVoice(null)
    setMedia(null)
    setContext("")
    setActiveTab("linkedin")
  }

  // Show hero input screen when no content
  if (!hasContent && !isGenerating && !hasError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            <span className="font-semibold tracking-tight">Signal</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">Think out loud. Look brilliant.</p>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex p-6 gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <YourSignalSidebar />
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl space-y-8">
              {/* Two brutal cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Voice Card */}
              <div className="bg-card border-2 border-border rounded-2xl p-8 flex flex-col">
                <h2 className="text-lg font-semibold mb-2 text-center">Voice</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Hold to rant
                </p>
                <div className="flex-1 flex items-center justify-center">
                  <VoiceRecorder 
                    onRecordingComplete={handleVoiceRecording}
                    hasRecording={voice !== null}
                  />
                </div>
                {voice && (
                  <p className="text-xs text-center text-primary mt-4 font-mono">
                    {voice.duration}s recorded
                  </p>
                )}
              </div>

              {/* Media Card */}
              <div className="bg-card border-2 border-border rounded-2xl p-8 flex flex-col">
                <h2 className="text-lg font-semibold mb-2 text-center">Media</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Drop photo or video
                </p>
                <div className="flex-1">
                  <MediaUpload 
                    media={media}
                    onMediaChange={setMedia}
                  />
                </div>
              </div>
              </div>

              {/* Context input */}
              <div className="max-w-xl mx-auto w-full">
                <Input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="any context? (optional)"
                  className="bg-muted/30 border-border/50 text-center h-12"
                />
              </div>

              {/* Generate button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  size="lg"
                  className="h-14 px-10 text-lg gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <Flame className="size-5" />
                  Let Signal cook
                </Button>
              </div>

              {!voice && !media && (
                <p className="text-xs text-muted-foreground text-center">
                  Record voice or upload media to begin
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show output/processing screen
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Signal</span>
        </div>
        
        <div className="flex items-center gap-3">
          {hasContent && (
            <Button onClick={handleReset} variant="outline" size="sm">
              New Signal
            </Button>
          )}
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>Cooking...</span>
            </div>
          )}
        </div>
      </header>

      {/* Error alert */}
      {hasError && error && (
        <div className="px-6 py-3 border-b border-border/50">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="size-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {error.includes("billing") || error.includes("credit card") ? (
                <a 
                  href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm underline underline-offset-2"
                >
                  Add billing <ExternalLink className="size-3" />
                </a>
              ) : (
                <Button onClick={handleReset} variant="ghost" size="sm">
                  Try again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Agent Log Panel */}
        <aside className="w-[380px] border-r border-border/50 shrink-0">
          <AgentLog 
            entries={logs} 
            isStreaming={isGenerating} 
            activeAgent={activeAgent}
          />
        </aside>

        {/* Output Panel */}
        <section className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
            <div className="border-b border-border/50 px-6 py-2 shrink-0">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="linkedin" className="gap-2 data-[state=active]:bg-background">
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  LinkedIn
                </TabsTrigger>
                <TabsTrigger value="twitter" className="gap-2 data-[state=active]:bg-background">
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-2 data-[state=active]:bg-background md:hidden">
                  <Terminal className="size-4" />
                  Log
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="linkedin" className="flex-1 m-0 overflow-auto">
              <LinkedInView content={content} isLoading={isGenerating} />
            </TabsContent>
            
            <TabsContent value="twitter" className="flex-1 m-0 overflow-auto">
              <TwitterView content={content} isLoading={isGenerating} />
            </TabsContent>
            
            <TabsContent value="log" className="flex-1 m-0 overflow-hidden md:hidden">
              <AgentLog 
                entries={logs} 
                isStreaming={isGenerating} 
                activeAgent={activeAgent}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}
