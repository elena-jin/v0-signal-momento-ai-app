import { GoogleGenerativeAI } from "@google/generative-ai"
import type { StreamEvent, GeneratedContent } from "@/lib/types"
import { saveGeneration } from "@/lib/mongodb"

// Signal AI Content Generator - Using Google Gemini 1.5 Flash
// Initialize Google Generative AI
function getClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required. Get one free at aistudio.google.com")
  }
  return new GoogleGenerativeAI(apiKey)
}

// Helper to call Gemini with JSON output
async function callGemini(
  prompt: string,
  schema: object,
  imageData?: { base64: string; mimeType: string }
) {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema as object
    }
  })

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
  
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64
      }
    })
  }
  
  parts.push({ text: prompt })

  const result = await model.generateContent(parts)
  const text = result.response.text()
  return JSON.parse(text)
}

// JSON Schemas for Gemini
const CaptureSchema = {
  type: "object",
  properties: {
    transcription: { type: "string", nullable: true },
    imageAnalysis: {
      type: "object",
      nullable: true,
      properties: {
        description: { type: "string" },
        subjects: { type: "array", items: { type: "string" } },
        mood: { type: "string" },
        setting: { type: "string" },
        activity: { type: "string" }
      },
      required: ["description", "subjects", "mood", "setting", "activity"]
    },
    rawThought: { type: "string" },
    contentCategory: { type: "string" }
  },
  required: ["rawThought", "contentCategory"]
}

const InsightSchema = {
  type: "object",
  properties: {
    coreIdea: { type: "string" },
    uniqueAngle: { type: "string" },
    emotionalHook: { type: "string" },
    targetAudience: { type: "string" },
    strengthScore: { type: "number" }
  },
  required: ["coreIdea", "uniqueAngle", "emotionalHook", "targetAudience", "strengthScore"]
}

const TrendSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    headlines: { type: "array", items: { type: "string" } },
    trendingTopics: { type: "array", items: { type: "string" } },
    relevantHashtags: { type: "array", items: { type: "string" } },
    timingInsight: { type: "string" }
  },
  required: ["category", "headlines", "trendingTopics", "relevantHashtags", "timingInsight"]
}

const AngleSchema = {
  type: "object",
  properties: {
    freshTake: { type: "string" },
    contrarian: { type: "string" },
    personalConnection: { type: "string" },
    recommendedAngle: { type: "string" },
    reasoning: { type: "string" }
  },
  required: ["freshTake", "contrarian", "personalConnection", "recommendedAngle", "reasoning"]
}

const CopySchema = {
  type: "object",
  properties: {
    linkedin: {
      type: "object",
      properties: {
        content: { type: "string" },
        hook: { type: "string" },
        cta: { type: "string" }
      },
      required: ["content", "hook", "cta"]
    },
    twitter: {
      type: "object",
      properties: {
        thread: {
          type: "array",
          items: {
            type: "object",
            properties: {
              number: { type: "number" },
              content: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } }
            },
            required: ["number", "content", "hashtags"]
          }
        }
      },
      required: ["thread"]
    }
  },
  required: ["linkedin", "twitter"]
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
      // Prepare image data if present
      let imageData: { base64: string; mimeType: string } | undefined
      if (media) {
        // Extract base64 from data URL if needed
        const base64 = media.data.includes(',') 
          ? media.data.split(',')[1] 
          : media.data
        imageData = { base64, mimeType: media.type }
      }

      // ====== CAPTURE AGENT ======
      await emit({ type: "agent_start", agent: "capture", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "capture", message: "Processing your input..." })
      
      const captureStart = Date.now()
      
      let capturePrompt = `You are the Capture Agent for Signal, a voice-first content creation tool.

Your job is to:
1. ${voice ? `Process this voice note (${voice.duration}s duration)` : "Analyze the visual content"}
2. Extract the raw thought or idea being communicated
3. Identify a content category (one of: tech, startup, leadership, product, growth, ai, career, lifestyle, creativity)

`
      if (voice) {
        capturePrompt += `Voice recording provided (${voice.duration} seconds). Treat the context as the transcription.\n\n`
      }
      if (media) {
        await emit({ type: "agent_thinking", agent: "capture", message: `Analyzing ${media.mediaType}...` })
        capturePrompt += `The user uploaded a ${media.mediaType}. Analyze what's in it.\n\n`
      }
      if (context) {
        capturePrompt += `User context/transcription: "${context}"\n\n`
      }

      capturePrompt += `Return JSON with:
- transcription: The user's words (use context if provided, null if none)
- imageAnalysis: Analysis of the image/video (null if no media)
- rawThought: The core idea in 1-2 sentences
- contentCategory: Single word category from the list above`

      const captureOutput = await callGemini(capturePrompt, CaptureSchema, imageData)
      
      await emit({ type: "agent_thinking", agent: "capture", message: `Captured: "${captureOutput.rawThought?.slice(0, 60)}..."` })
      await emit({ type: "agent_output", agent: "capture", output: captureOutput })
      await emit({ type: "agent_complete", agent: "capture", duration: Date.now() - captureStart })

      // ====== INSIGHT AGENT ======
      await emit({ type: "agent_start", agent: "insight", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "insight", message: "Extracting your strongest idea..." })
      
      const insightStart = Date.now()

      const insightPrompt = `You are the Insight Agent for Signal. Your job is to find the single most powerful idea in someone's raw thought.

Raw capture:
${JSON.stringify(captureOutput, null, 2)}

Find:
1. coreIdea: The ONE idea that's most shareable (1 sentence)
2. uniqueAngle: What makes this perspective different from generic takes
3. emotionalHook: The emotion that will make people stop scrolling
4. targetAudience: Who specifically will resonate (be specific, not "entrepreneurs")
5. strengthScore: 1-100 how strong/original this insight is

Be brutally honest. If the idea is weak, say so. Great content starts with great insights.`

      const insightOutput = await callGemini(insightPrompt, InsightSchema)
      
      await emit({ type: "agent_thinking", agent: "insight", message: `Core idea: "${insightOutput.coreIdea?.slice(0, 80)}..."` })
      await emit({ type: "agent_thinking", agent: "insight", message: `Strength score: ${insightOutput.strengthScore}/100` })
      await emit({ type: "agent_output", agent: "insight", output: insightOutput })
      await emit({ type: "agent_complete", agent: "insight", duration: Date.now() - insightStart })

      // ====== TREND AGENT ======
      await emit({ type: "agent_start", agent: "trend", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "trend", message: `Scanning what founders are posting about ${captureOutput.contentCategory}...` })
      
      const trendStart = Date.now()

      const trendPrompt = `You are the Trend Agent for Signal. You scan what founders and thought leaders are discussing RIGHT NOW.

Content category: ${captureOutput.contentCategory}
Core idea: ${insightOutput.coreIdea}

Generate realistic trending topics for ${captureOutput.contentCategory} based on current discourse. Think about what's actually being discussed on Twitter/LinkedIn among tech founders and thought leaders in 2024-2025.

Return:
- category: The content category
- headlines: 3-5 example headlines/posts that are getting engagement this week
- trendingTopics: 5-8 topics founders are discussing
- relevantHashtags: 5-10 hashtags that would perform well
- timingInsight: Why NOW is a good time to post about this (or isn't)`

      const trendOutput = await callGemini(trendPrompt, TrendSchema)
      
      await emit({ type: "agent_thinking", agent: "trend", message: `Timing: ${trendOutput.timingInsight?.slice(0, 60)}...` })
      await emit({ type: "agent_output", agent: "trend", output: trendOutput })
      await emit({ type: "agent_complete", agent: "trend", duration: Date.now() - trendStart })

      // ====== ANGLE AGENT ======
      await emit({ type: "agent_start", agent: "angle", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "angle", message: "Finding the take nobody has posted yet..." })
      
      const angleStart = Date.now()

      const anglePrompt = `You are the Angle Agent for Signal. Your job is to find the UNIQUE angle that will make this post stand out.

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

      const angleOutput = await callGemini(anglePrompt, AngleSchema)
      
      await emit({ type: "agent_thinking", agent: "angle", message: `Angle: "${angleOutput.recommendedAngle?.slice(0, 70)}..."` })
      await emit({ type: "agent_output", agent: "angle", output: angleOutput })
      await emit({ type: "agent_complete", agent: "angle", duration: Date.now() - angleStart })

      // ====== COPY AGENT ======
      await emit({ type: "agent_start", agent: "copy", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "copy", message: "Writing in your voice..." })
      
      const copyStart = Date.now()

      const copyPrompt = `You are the Copy Agent for Signal. You write like the user talks - direct, human, no corporate BS.

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
- Tweet 1: The hook + context (use thread emoji if appropriate)
- Tweet 2-4: Build the argument/story
- Tweet 5: The punchline or takeaway
- Include 1-2 relevant hashtags per tweet
- Each tweet should work standalone but connect to the thread

Write like a human who has something real to say, not a content creator following a template.`

      const copyOutput = await callGemini(copyPrompt, CopySchema)
      
      await emit({ type: "agent_thinking", agent: "copy", message: "Content ready!" })
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
          tweets: copyOutput.twitter.thread.map((t: { number: number; content: string; hashtags: string[] }) => ({
            number: t.number,
            content: t.content + (t.hashtags.length > 0 ? '\n\n' + t.hashtags.map((h: string) => `#${h}`).join(' ') : ''),
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

      // ===== CRITIC AGENT: Brutal honest feedback from AI critics =====
      const criticStart = Date.now()
      await emit({ type: "agent_start", agent: "critic", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "critic", message: "Summoning the critics..." })

      const critics = [
        { id: "brutus", name: "Brutus", personality: "harsh realist who tears apart weak content" },
        { id: "viral-vera", name: "Viral Vera", personality: "algorithm expert who knows what spreads" },
        { id: "skeptical-sam", name: "Skeptical Sam", personality: "devil's advocate who finds fatal flaws" },
        { id: "engagement-emma", name: "Engagement Emma", personality: "audience expert who knows what hooks people" }
      ]

      const CriticSchema = {
        type: "object" as const,
        properties: {
          opinions: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                agentId: { type: "string" as const },
                verdict: { type: "string" as const, enum: ["viral", "solid", "meh", "skip"] },
                score: { type: "number" as const },
                reasoning: { type: "string" as const },
                suggestion: { type: "string" as const },
                viralPotential: { type: "number" as const }
              },
              required: ["agentId", "verdict", "score", "reasoning", "suggestion", "viralPotential"]
            }
          }
        },
        required: ["opinions"]
      }

      const criticPrompt = `You are simulating 4 brutally honest AI content critics reviewing a LinkedIn post and Twitter thread.

THE CONTENT TO REVIEW:

LINKEDIN POST:
${result.linkedin.content}

TWITTER THREAD:
${result.twitter.tweets.map(t => `Tweet ${t.number}: ${t.content}`).join('\n\n')}

THE CRITICS (give each a unique voice and perspective):

1. "brutus" - Brutus the Harsh Realist: Tears apart weak content, respects only raw authenticity. Hates fluff, clichés, and "LinkedIn bro" energy. Very critical.

2. "viral-vera" - Viral Vera: The Algorithm Whisperer. Knows what makes content spread. Focuses on hooks, scroll-stopping power, shareability. Optimistic but realistic.

3. "skeptical-sam" - Skeptical Sam: The Devil's Advocate. Challenges every assumption, finds fatal flaws in the argument. Asks "why would anyone care?"

4. "engagement-emma" - Engagement Emma: The Audience Expert. Knows what hooks people emotionally, what drives comments and saves. Focuses on human connection.

For each critic, provide:
- verdict: "viral" (this will blow up), "solid" (good but not special), "meh" (forgettable), or "skip" (don't post this)
- score: 1-100 overall quality
- reasoning: 1-2 sentences of their brutally honest take IN THEIR VOICE
- suggestion: One specific improvement they'd make
- viralPotential: 0-100 chance this goes viral

Be BRUTALLY HONEST. Creators need real feedback, not encouragement. If the content is generic or boring, SAY SO.`

      await emit({ type: "agent_thinking", agent: "critic", message: "Critics are debating..." })

      interface CriticOutput {
        opinions: Array<{
          agentId: string
          verdict: "viral" | "solid" | "meh" | "skip"
          score: number
          reasoning: string
          suggestion: string
          viralPotential: number
        }>
      }

      const criticOutput: CriticOutput = await callGemini(criticPrompt, CriticSchema)

      // Emit each opinion as it comes in (simulated streaming)
      for (const opinion of criticOutput.opinions) {
        const critic = critics.find(c => c.id === opinion.agentId)
        await emit({ type: "agent_thinking", agent: "critic", message: `${critic?.name || opinion.agentId}: "${opinion.reasoning}"` })
        await emit({ type: "critic_opinion", opinion })
        // Small delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      await emit({ type: "agent_output", agent: "critic", output: criticOutput })
      await emit({ type: "agent_complete", agent: "critic", duration: Date.now() - criticStart })

      await emit({ type: "complete", result, critics: criticOutput.opinions })

      // Save to MongoDB for learning
      const inputType = voice && media ? "voice+image" : voice ? "voice" : media ? "image" : "text"
      await saveGeneration({
        timestamp: new Date(),
        inputType,
        rawInput: {
          voiceDuration: voice?.duration,
          hasImage: !!media,
          context: context || captureOutput.rawThought
        },
        generatedContent: {
          linkedin: result.linkedin,
          twitter: { tweets: result.twitter.tweets.map(t => ({ content: t.content })) }
        },
        platforms: ["linkedin", "twitter"],
        engagementScore: null,
        topics: [captureOutput.contentCategory, ...trendOutput.trendingTopics.slice(0, 3)]
      })

    } catch (error) {
      console.error("[v0] Generation error:", error)
      
      let errorMessage = "An unexpected error occurred"
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        if (msg.includes("api key") || msg.includes("api_key") || msg.includes("unauthorized") || msg.includes("invalid")) {
          errorMessage = "Google API key is invalid or missing. Add GOOGLE_GENERATIVE_AI_API_KEY in the Vars settings."
        } else if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("resource_exhausted")) {
          errorMessage = "Rate limit reached. Wait a moment and try again."
        } else if (msg.includes("safety") || msg.includes("blocked")) {
          errorMessage = "Content was blocked by safety filters. Try rephrasing your input."
        } else {
          errorMessage = error.message
        }
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
