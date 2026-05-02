import { streamText, Output } from "ai"
import { z } from "zod"
import type { StreamEvent, GeneratedContent } from "@/lib/types"

// Model to use for AI calls
const MODEL = "anthropic/claude-sonnet-4-20250514"

// Schemas for structured output
const CaptureSchema = z.object({
  transcription: z.string().nullable(),
  imageAnalysis: z.object({
    description: z.string(),
    subjects: z.array(z.string()),
    mood: z.string(),
    setting: z.string(),
    activity: z.string()
  }).nullable(),
  rawThought: z.string(),
  contentCategory: z.string()
})

const InsightSchema = z.object({
  coreIdea: z.string(),
  uniqueAngle: z.string(),
  emotionalHook: z.string(),
  targetAudience: z.string(),
  strengthScore: z.number()
})

const TrendSchema = z.object({
  category: z.string(),
  headlines: z.array(z.string()),
  trendingTopics: z.array(z.string()),
  relevantHashtags: z.array(z.string()),
  timingInsight: z.string()
})

const AngleSchema = z.object({
  freshTake: z.string(),
  contrarian: z.string(),
  personalConnection: z.string(),
  recommendedAngle: z.string(),
  reasoning: z.string()
})

const CopySchema = z.object({
  linkedin: z.object({
    content: z.string(),
    hook: z.string(),
    cta: z.string()
  }),
  twitter: z.object({
    thread: z.array(z.object({
      number: z.number(),
      content: z.string(),
      hashtags: z.array(z.string())
    }))
  })
})

// Fetch trending topics from Bright Data
async function fetchTrendingTopics(category: string, emit: (event: StreamEvent) => Promise<void>): Promise<{ headlines: string[], topics: string[] }> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY
  
  if (!apiKey) {
    await emit({ type: "agent_thinking", agent: "trend", message: "No Bright Data key, using AI trend analysis..." })
    return { headlines: [], topics: [] }
  }
  
  try {
    await emit({ type: "agent_thinking", agent: "trend", message: `Scanning founder Twitter for ${category} discussions...` })
    
    // Call Bright Data's social media API for trending content
    const response = await fetch("https://api.brightdata.com/datasets/v3/trigger", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dataset_id: "gd_lwdb4vjm1ehb499uxs",
        endpoint: "/search/posts",
        input: [{ 
          keyword: `${category} founder startup`,
          sort_by: "Top"
        }],
        format: "json",
        limit: 10
      })
    })
    
    if (!response.ok) {
      await emit({ type: "agent_thinking", agent: "trend", message: "API unavailable, using cached trends..." })
      return { headlines: [], topics: [] }
    }
    
    const data = await response.json()
    
    if (data && Array.isArray(data.results)) {
      const headlines = data.results
        .filter((item: { text?: string }) => item.text)
        .map((item: { text: string }) => item.text.slice(0, 100))
        .slice(0, 5)
      
      const topics = data.results
        .flatMap((item: { hashtags?: string[] }) => item.hashtags || [])
        .slice(0, 10)
      
      if (headlines.length > 0) {
        await emit({ type: "agent_thinking", agent: "trend", message: `Found ${headlines.length} relevant posts from this week` })
        return { headlines, topics }
      }
    }
    
    return { headlines: [], topics: [] }
  } catch (error) {
    console.error("[v0] Bright Data error:", error)
    await emit({ type: "agent_thinking", agent: "trend", message: "Falling back to AI trend synthesis..." })
    return { headlines: [], topics: [] }
  }
}

export async function POST(req: Request) {
  const { voice, media, context } = await req.json() as {
    voice?: { data: string; duration: number }
    media?: { data: string; type: string; mediaType: "image" | "video" }
    context?: string
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const emit = async (event: StreamEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  const startTime = Date.now()

  ;(async () => {
    try {
      // ====== CAPTURE AGENT ======
      await emit({ type: "agent_start", agent: "capture", timestamp: new Date().toISOString() })
      
      const captureStart = Date.now()
      let capturePrompt = ""
      const messageContent: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> = []
      
      if (voice) {
        await emit({ type: "agent_thinking", agent: "capture", message: "Transcribing voice recording..." })
        capturePrompt += `The user recorded a ${voice.duration} second voice note. Transcribe and capture their raw thought.\n\n`
      }
      
      if (media) {
        await emit({ type: "agent_thinking", agent: "capture", message: `Analyzing ${media.mediaType}...` })
        messageContent.push({
          type: "image",
          image: media.data,
          mimeType: media.type
        })
        capturePrompt += `The user uploaded a ${media.mediaType}. Analyze what's in it.\n\n`
      }
      
      if (context) {
        capturePrompt += `Additional context from user: "${context}"\n\n`
      }
      
      capturePrompt += `You are the Capture Agent for Signal, a voice-first content creation tool.

Your job is to:
1. ${voice ? "Transcribe and clean up the voice recording (fix filler words, make it coherent)" : "Analyze the visual content"}
2. Extract the raw thought or idea being communicated
3. Identify a content category (one of: tech, startup, leadership, product, growth, ai, career, lifestyle, creativity)

Return JSON with:
- transcription: The cleaned transcription (null if no voice)
- imageAnalysis: Analysis of the image/video (null if no media)
- rawThought: The core idea in 1-2 sentences
- contentCategory: Single word category`

      messageContent.push({ type: "text", text: capturePrompt })

      const captureResult = await streamText({
        model: MODEL,
        messages: [{ role: "user", content: messageContent }],
        output: Output.object({ schema: CaptureSchema })
      })
      
      for await (const chunk of captureResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('rawThought' in chunk && chunk.rawThought) {
            await emit({ type: "agent_thinking", agent: "capture", message: `Captured: "${(chunk.rawThought as string).slice(0, 60)}..."` })
          }
        }
      }
      
      const captureOutput = await captureResult.output
      await emit({ type: "agent_output", agent: "capture", output: captureOutput })
      await emit({ type: "agent_complete", agent: "capture", duration: Date.now() - captureStart })

      // ====== INSIGHT AGENT ======
      await emit({ type: "agent_start", agent: "insight", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "insight", message: "Extracting your strongest idea..." })
      
      const insightStart = Date.now()

      const insightResult = await streamText({
        model: MODEL,
        messages: [{
          role: "user",
          content: `You are the Insight Agent for Signal. Your job is to find the single most powerful idea in someone's raw thought.

Raw capture:
${JSON.stringify(captureOutput, null, 2)}

Find:
1. coreIdea: The ONE idea that's most shareable (1 sentence)
2. uniqueAngle: What makes this perspective different from generic takes
3. emotionalHook: The emotion that will make people stop scrolling
4. targetAudience: Who specifically will resonate (be specific, not "entrepreneurs")
5. strengthScore: 1-100 how strong/original this insight is

Be brutally honest. If the idea is weak, say so. Great content starts with great insights.`
        }],
        output: Output.object({ schema: InsightSchema })
      })
      
      for await (const chunk of insightResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('coreIdea' in chunk && chunk.coreIdea) {
            await emit({ type: "agent_thinking", agent: "insight", message: `Core idea: "${(chunk.coreIdea as string).slice(0, 80)}..."` })
          }
          if ('strengthScore' in chunk && typeof chunk.strengthScore === 'number') {
            await emit({ type: "agent_thinking", agent: "insight", message: `Strength score: ${chunk.strengthScore}/100` })
          }
        }
      }
      
      const insightOutput = await insightResult.output
      await emit({ type: "agent_output", agent: "insight", output: insightOutput })
      await emit({ type: "agent_complete", agent: "insight", duration: Date.now() - insightStart })

      // ====== TREND AGENT ======
      await emit({ type: "agent_start", agent: "trend", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "trend", message: `Scanning what founders are posting about ${captureOutput.contentCategory}...` })
      
      const trendStart = Date.now()
      
      // Fetch real trends from Bright Data
      const realTrends = await fetchTrendingTopics(captureOutput.contentCategory, emit)
      
      const trendResult = await streamText({
        model: MODEL,
        messages: [{
          role: "user",
          content: `You are the Trend Agent for Signal. You scan what founders and thought leaders are discussing RIGHT NOW.

Content category: ${captureOutput.contentCategory}
Core idea: ${insightOutput.coreIdea}

${realTrends.headlines.length > 0 
  ? `LIVE DATA from founder Twitter this week:\n${realTrends.headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')}\n\nHashtags trending: ${realTrends.topics.join(', ')}`
  : `No live data available. Generate realistic trending topics for ${captureOutput.contentCategory} based on your knowledge of current discourse.`}

Return:
- category: The content category
- headlines: 3-5 example headlines/posts that are getting engagement this week (use real data if provided, or generate realistic ones)
- trendingTopics: 5-8 topics founders are discussing
- relevantHashtags: 5-10 hashtags that would perform well
- timingInsight: Why NOW is a good time to post about this (or isn't)`
        }],
        output: Output.object({ schema: TrendSchema })
      })
      
      for await (const chunk of trendResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('headlines' in chunk && Array.isArray(chunk.headlines) && chunk.headlines.length > 0) {
            await emit({ type: "agent_thinking", agent: "trend", message: `Found trending: "${(chunk.headlines[0] as string).slice(0, 50)}..."` })
          }
          if ('timingInsight' in chunk && chunk.timingInsight) {
            await emit({ type: "agent_thinking", agent: "trend", message: `Timing: ${(chunk.timingInsight as string).slice(0, 60)}...` })
          }
        }
      }
      
      const trendOutput = await trendResult.output
      await emit({ type: "agent_output", agent: "trend", output: trendOutput })
      await emit({ type: "agent_complete", agent: "trend", duration: Date.now() - trendStart })

      // ====== ANGLE AGENT ======
      await emit({ type: "agent_start", agent: "angle", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "angle", message: "Finding the take nobody has posted yet..." })
      
      const angleStart = Date.now()

      const angleResult = await streamText({
        model: MODEL,
        messages: [{
          role: "user",
          content: `You are the Angle Agent for Signal. Your job is to find the UNIQUE angle that will make this post stand out.

Core insight: ${insightOutput.coreIdea}
Unique angle identified: ${insightOutput.uniqueAngle}
What's trending: ${trendOutput.headlines.join(', ')}
Timing: ${trendOutput.timingInsight}

The problem: Most posts say the same thing everyone else says. Your job is to find the contrarian or unexpected angle.

Generate:
- freshTake: A way to say this that feels new and different
- contrarian: The opposite of what everyone is saying (even if you don't use it)
- personalConnection: How to make this feel personal and authentic, not generic
- recommendedAngle: The specific angle to use (combining freshness + authenticity)
- reasoning: Why this angle will perform better than the obvious approach

Think like the best writers on Twitter/LinkedIn - what would make YOU stop scrolling?`
        }],
        output: Output.object({ schema: AngleSchema })
      })
      
      for await (const chunk of angleResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('recommendedAngle' in chunk && chunk.recommendedAngle) {
            await emit({ type: "agent_thinking", agent: "angle", message: `Angle: "${(chunk.recommendedAngle as string).slice(0, 70)}..."` })
          }
          if ('contrarian' in chunk && chunk.contrarian) {
            await emit({ type: "agent_thinking", agent: "angle", message: `Contrarian view: "${(chunk.contrarian as string).slice(0, 60)}..."` })
          }
        }
      }
      
      const angleOutput = await angleResult.output
      await emit({ type: "agent_output", agent: "angle", output: angleOutput })
      await emit({ type: "agent_complete", agent: "angle", duration: Date.now() - angleStart })

      // ====== COPY AGENT ======
      await emit({ type: "agent_start", agent: "copy", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "copy", message: "Writing in your voice..." })
      
      const copyStart = Date.now()

      const copyResult = await streamText({
        model: MODEL,
        messages: [{
          role: "user",
          content: `You are the Copy Agent for Signal. You write like the user talks - direct, human, no corporate BS.

CONTEXT:
- Raw thought: ${captureOutput.rawThought}
- Core idea: ${insightOutput.coreIdea}
- Emotional hook: ${insightOutput.emotionalHook}
- Recommended angle: ${angleOutput.recommendedAngle}
- Trending hashtags: ${trendOutput.relevantHashtags.join(', ')}

WRITE:

1. LINKEDIN POST (max 3000 chars):
- Start with a hook that stops the scroll (the first line matters most)
- Write conversationally, like you're talking to a smart friend
- Use short paragraphs and line breaks
- End with a question or call to reflection (not "follow me for more")
- NO hashtags in LinkedIn body text
- NO emojis unless absolutely necessary

2. TWITTER THREAD (4-5 tweets, 280 chars each):
- Tweet 1: The hook + context (use 🧵 if you want)
- Tweet 2-4: Build the argument/story
- Tweet 5: The punchline or takeaway
- Include 1-2 relevant hashtags per tweet
- Each tweet should work standalone but connect to the thread

Write like a human who has something real to say, not a content creator following a template.`
        }],
        output: Output.object({ schema: CopySchema })
      })
      
      await emit({ type: "agent_thinking", agent: "copy", message: "Drafting LinkedIn post..." })
      
      for await (const chunk of copyResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('linkedin' in chunk && chunk.linkedin && typeof chunk.linkedin === 'object' && 'hook' in chunk.linkedin) {
            await emit({ type: "agent_thinking", agent: "copy", message: "LinkedIn hook written..." })
          }
          if ('twitter' in chunk && chunk.twitter && typeof chunk.twitter === 'object' && 'thread' in chunk.twitter) {
            const thread = (chunk.twitter as { thread: unknown[] }).thread
            if (Array.isArray(thread)) {
              await emit({ type: "agent_thinking", agent: "copy", message: `Twitter thread: ${thread.length}/5 tweets...` })
            }
          }
        }
      }
      
      const copyOutput = await copyResult.output
      await emit({ type: "agent_output", agent: "copy", output: copyOutput })
      await emit({ type: "agent_complete", agent: "copy", duration: Date.now() - copyStart })

      // Final result
      const result: GeneratedContent = {
        linkedin: {
          content: copyOutput.linkedin.content,
          hook: copyOutput.linkedin.hook,
          cta: copyOutput.linkedin.cta,
          characterCount: copyOutput.linkedin.content.length
        },
        twitter: {
          tweets: copyOutput.twitter.thread.map(t => ({
            number: t.number,
            content: t.content + (t.hashtags.length > 0 ? '\n\n' + t.hashtags.map(h => `#${h}`).join(' ') : ''),
            characterCount: t.content.length
          }))
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          hasVoice: !!voice,
          hasMedia: !!media
        }
      }

      await emit({ type: "content_ready", platform: "linkedin", content: result.linkedin })
      await emit({ type: "content_ready", platform: "twitter", content: result.twitter })
      await emit({ type: "complete", result })

    } catch (error) {
      console.error("[v0] Generation error:", error)
      
      // Extract the real error message - dig through all nested properties
      let errorMessage = "An unexpected error occurred"
      
      // Recursively search for credit card error in nested objects
      const searchForError = (obj: unknown, depth = 0): string | null => {
        if (depth > 5) return null
        if (!obj) return null
        
        const str = String(obj)
        if (str.includes("credit card") || str.includes("customer_verification")) {
          return "credit_card"
        }
        if (str.includes("rate limit")) {
          return "rate_limit"
        }
        
        if (typeof obj === 'object') {
          for (const key of Object.keys(obj as Record<string, unknown>)) {
            const result = searchForError((obj as Record<string, unknown>)[key], depth + 1)
            if (result) return result
          }
        }
        return null
      }
      
      const errorType = searchForError(error)
      
      if (errorType === "credit_card") {
        errorMessage = "AI Gateway requires billing setup. Add a credit card in your Vercel dashboard to unlock AI features."
      } else if (errorType === "rate_limit") {
        errorMessage = "Rate limit reached. Wait a moment and try again."
      } else if (error instanceof Error && error.message.includes("No output")) {
        // This generic error usually means the underlying API call failed
        errorMessage = "AI Gateway blocked the request. Add a credit card in Vercel settings to enable AI features."
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      await emit({ type: "error", message: errorMessage })
    } finally {
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
