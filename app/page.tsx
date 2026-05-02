"use client"

import { useState, useEffect, useRef } from "react"
import { VoiceRecorder } from "@/components/input/voice-recorder"
import { MediaUpload } from "@/components/input/media-upload"
import { AgentPipeline } from "@/components/agent-pipeline/agent-pipeline"
import { LinkedInView } from "@/components/output/linkedin-view"
import { TwitterView } from "@/components/output/twitter-view"
import { useGenerate } from "@/hooks/use-generate"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadedMedia, VoiceRecording } from "@/lib/types"
import { 
  LayoutDashboard, 
  Bot, 
  Layers, 
  FolderOpen, 
  Archive,
  Bell,
  Settings,
  HelpCircle,
  Mic,
  Copy,
  AlertCircle,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SignalPage() {
  const [voice, setVoice] = useState<VoiceRecording | null>(null)
  const [media, setMedia] = useState<UploadedMedia | null>(null)
  const [recentUploads, setRecentUploads] = useState<UploadedMedia[]>([])
  const [activeTab, setActiveTab] = useState("linkedin")
  const [activeNav, setActiveNav] = useState("dashboard")
  
  const { status, logs, content, activeAgent, error, critics, generate, reset } = useGenerate()

  const isGenerating = status === "streaming"
  const hasContent = status === "complete" && content !== null
  const hasError = status === "error"
  const prevStatusRef = useRef(status)

  // Track recent uploads
  useEffect(() => {
    if (media && !recentUploads.find(u => u.id === media.id)) {
      setRecentUploads(prev => [media, ...prev].slice(0, 6))
    }
  }, [media, recentUploads])

  // Dispatch event when generation completes
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
    await generate(voice, media, undefined)
  }

  const handleNewSignal = () => {
    reset()
    setVoice(null)
    setMedia(null)
    setActiveTab("linkedin")
  }

  const handleCopyToClipboard = () => {
    if (!content) return
    const text = activeTab === "linkedin" 
      ? content.linkedin.content 
      : content.twitter.tweets.map(t => t.content).join("\n\n")
    navigator.clipboard.writeText(text)
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "workspaces", label: "Workspaces", icon: Layers },
    { id: "library", label: "Library", icon: FolderOpen },
    { id: "archive", label: "Archive", icon: Archive },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Navigation */}
      <aside className="w-52 border-r border-border/50 flex flex-col bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
          <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="size-4 text-primary" />
          </div>
          <span className="font-semibold">Signal</span>
        </div>

        {/* Top Nav Links */}
        <div className="flex items-center gap-4 px-5 py-3 text-xs border-b border-border/50">
          <span className="text-primary font-medium">Workspaces</span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer">Agents</span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer">Library</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isActive 
                      ? "bg-sidebar-accent text-primary border-l-2 border-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 mt-auto space-y-3">
          <Button 
            onClick={handleNewSignal}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            New Signal
          </Button>
          <div className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-foreground transition-colors">
              <HelpCircle className="size-4" />
              Help
            </button>
            <button className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-foreground transition-colors">
              <Settings className="size-4" />
              Settings
            </button>
          </div>
        </div>
      </aside>

      {/* Capture Column */}
      <section className="w-80 border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-xl font-semibold">Capture</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Feed the engine with raw data.</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {/* Media Drop Zone */}
            <MediaUpload 
              media={media}
              onMediaChange={setMedia}
              disabled={isGenerating}
            />

            {/* Voice Button */}
            <div className="flex flex-col items-center">
              <VoiceRecorder 
                onRecordingComplete={handleVoiceRecording}
                hasRecording={voice !== null}
                disabled={isGenerating}
              />
              {voice && (
                <p className="text-xs text-primary font-mono mt-2 uppercase tracking-wider">
                  Voice Active
                </p>
              )}
            </div>

            {/* Generate Button */}
            {canGenerate && (
              <Button 
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isGenerating ? "Generating..." : "Generate Content"}
              </Button>
            )}

            {/* Recently Uploaded */}
            {recentUploads.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  Recently Uploaded
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {recentUploads.slice(0, 4).map((upload, i) => (
                    <button
                      key={upload.id}
                      onClick={() => setMedia(upload)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        media?.id === upload.id 
                          ? "border-primary" 
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      {upload.type === "video" ? (
                        <video src={upload.preview} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={upload.preview} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                  {recentUploads.length > 4 && (
                    <div className="aspect-square rounded-lg border border-border/50 flex items-center justify-center text-sm text-muted-foreground">
                      +{recentUploads.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </section>

      {/* Generated Insight Column */}
      <section className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-xl font-semibold">Generated Insight</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Optimized content for your platforms.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasContent && (
              <Button 
                onClick={handleCopyToClipboard} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Copy className="size-4" />
                Copy to Clipboard
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-muted-foreground hover:text-foreground cursor-pointer" />
              <Settings className="size-5 text-muted-foreground hover:text-foreground cursor-pointer" />
              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center ml-2">
                <span className="text-xs font-medium text-primary">S</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {hasError && error && (
          <div className="px-6 py-3 border-b border-border/50">
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Platform Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b border-border/50">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger 
                value="linkedin" 
                className="bg-transparent px-0 py-3 text-sm data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                LinkedIn
              </TabsTrigger>
              <TabsTrigger 
                value="twitter" 
                className="bg-transparent px-0 py-3 text-sm data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                X / Twitter
              </TabsTrigger>
              <TabsTrigger 
                value="instagram" 
                className="bg-transparent px-0 py-3 text-sm text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none data-[state=active]:shadow-none"
              >
                Instagram
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="linkedin" className="flex-1 m-0 overflow-auto">
            <LinkedInView content={content} isLoading={isGenerating} />
          </TabsContent>

          <TabsContent value="twitter" className="flex-1 m-0 overflow-auto">
            <TwitterView content={content} isLoading={isGenerating} />
          </TabsContent>

          <TabsContent value="instagram" className="flex-1 m-0 overflow-auto p-6">
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Instagram support coming soon
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Agent Pipeline Column */}
      <aside className="w-72 border-l border-border/50 bg-card/50">
        <AgentPipeline 
          entries={logs}
          isStreaming={isGenerating}
          activeAgent={activeAgent}
        />
      </aside>
    </div>
  )
}
