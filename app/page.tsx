"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { DropZone } from "@/components/upload/drop-zone"
import { ContextInput } from "@/components/upload/context-input"
import { AgentLog } from "@/components/agent-log/agent-log"
import { InstagramView } from "@/components/content/instagram-view"
import { TwitterView } from "@/components/content/twitter-view"
import { StoriesView } from "@/components/content/stories-view"
import { useGenerate } from "@/hooks/use-generate"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import type { UploadedImage } from "@/lib/types"
import { Sparkles, Instagram, Terminal, AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function HomePage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [context, setContext] = useState("")
  const [activeTab, setActiveTab] = useState("instagram")
  
  const { status, logs, content, activeAgent, error, generate, reset } = useGenerate()

  const isGenerating = status === "streaming"
  const hasContent = status === "complete" && content !== null
  const hasError = status === "error"
  const canGenerate = images.length > 0 && !isGenerating

  const handleGenerate = async () => {
    if (!canGenerate) return
    setActiveTab("log") // Switch to log tab when starting
    await generate(images, context || undefined)
  }

  const handleReset = () => {
    reset()
    setImages([])
    setContext("")
    setActiveTab("instagram")
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 flex">
        {/* Left Panel - Upload */}
        <aside className="w-[400px] shrink-0 border-r border-border flex flex-col bg-card/30">
          <div className="flex flex-col gap-6 p-6 flex-1">
            <div>
              <h2 className="text-lg font-semibold mb-1">Upload Images</h2>
              <p className="text-sm text-muted-foreground">
                Add 1-5 photos to transform into content
              </p>
            </div>
            
            <DropZone 
              images={images}
              onImagesChange={setImages}
              maxImages={5}
              disabled={isGenerating}
            />
            
            <ContextInput
              value={context}
              onChange={setContext}
              disabled={isGenerating}
            />
          </div>
          
          <div className="p-6 border-t border-border space-y-4">
            {hasError && error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <AlertCircle className="size-4" />
                <AlertTitle>Generation Failed</AlertTitle>
                <AlertDescription className="mt-2">
                  {error}
                  {error.includes("credit card") && (
                    <a 
                      href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-2 text-sm underline underline-offset-2 hover:text-destructive-foreground"
                    >
                      Add billing info to Vercel <ExternalLink className="size-3" />
                    </a>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {hasContent ? (
              <div className="flex gap-3">
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex-1 gap-2"
                >
                  <Sparkles className="size-4" />
                  Regenerate
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full gap-2 h-11"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="size-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Content
                  </>
                )}
              </Button>
            )}
            
            {images.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Upload at least one image to get started
              </p>
            )}
          </div>
        </aside>
        
        {/* Right Panel - Content Tabs */}
        <section className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
            <div className="border-b border-border px-6 py-3">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="instagram" className="gap-2">
                  <Instagram className="size-4" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="twitter" className="gap-2">
                  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter Thread
                </TabsTrigger>
                <TabsTrigger value="stories" className="gap-2">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Stories
                </TabsTrigger>
                <TabsTrigger value="log" className="gap-2">
                  <Terminal className="size-4" />
                  Agent Log
                  {isGenerating && (
                    <span className="relative flex size-2 ml-1">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="instagram" className="flex-1 m-0 overflow-auto">
              <InstagramView content={content} isLoading={isGenerating} />
            </TabsContent>
            
            <TabsContent value="twitter" className="flex-1 m-0 overflow-auto">
              <TwitterView content={content} isLoading={isGenerating} />
            </TabsContent>
            
            <TabsContent value="stories" className="flex-1 m-0 overflow-auto">
              <StoriesView content={content} isLoading={isGenerating} images={images} />
            </TabsContent>
            
            <TabsContent value="log" className="flex-1 m-0 overflow-hidden">
              <AgentLog 
                entries={logs} 
                isStreaming={isGenerating} 
                activeAgent={activeAgent}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="flex items-center justify-center h-10 border-t border-border text-xs text-muted-foreground">
        Powered by Claude
      </footer>
    </div>
  )
}
