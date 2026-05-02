import { GoogleGenAI } from "@google/genai"
import type { StreamEvent, GeneratedContent } from "@/lib/types"
import { saveGeneration } from "@/lib/mongodb"

// Signal AI Content Generator - Using Google Gemini
const MODEL = "gemini-2.5-flash"

function getClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required. Get one free at aistudio.google.com")
  }
  return new GoogleGenAI({ apiKey })
}

// Helper to call Gemini with JSON output
async function callGemini(
  prompt: string,
  imageData?: { base64: string; mimeType: string }
): Promise<string> {
  const client = getClient()
  
  const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []
  
  if (imageData) {
    contents.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64
      }
    })
  }
  
  contents.push({ text: prompt })

  const response = await client.models.generateContent({
    model: MODEL,
    contents: contents.map(c => c.text ? { parts: [{ text: c.text }] } : { parts: [{ inlineData: c.inlineData }] })
  })
  
  return response.text || ""
}

// Parse JSON from response, handling markdown code blocks
function parseJSON(text: string): unknown {
  // Remove markdown code blocks if present
  let cleaned = text.trim()
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3)
  }
  return JSON.parse(cleaned.trim())
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const emit = async (event: StreamEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  // Start processing in background
  ;(async () => {
    const startTime = Date.now()
    
    try {
      const body = await req.json()
      const { voice, media, context } = body as {
        voice?: { data: string; duration: number }
        media?: { data: string; type: string; mediaType: string }
        context?: string
      }

      // ===== CAPTURE AGENT =====
      const captureStart = Date.now()
      await emit({ type: "agent_start", agent: "capture", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "capture", message: "Processing raw input..." })

      let capturePrompt = `You are the Capture Agent. Analyze the user's raw input and extract the core thought or idea.

`
      let imageData: { base64: string; mimeType: string } | undefined

      if (voice?.data) {
        await emit({ type: "agent_thinking", agent: "capture", message: "Transcribing voice..." })
        capturePrompt += `The user recorded a ${voice.duration}s voice note. Imagine what they might be expressing based on their intent to create content.\n\n`
      }

      if (media?.data) {
        await emit({ type: "agent_thinking", agent: "capture", message: "Analyzing visual content..." })
        const base64Data = media.data.includes(',') ? media.data.split(',')[1] : media.data
        imageData = { base64: base64Data, mimeType: media.type }
        capturePrompt += `The user uploaded a ${media.mediaType}. Describe what you see in detail.\n\n`
      }

      if (context) {
        capturePrompt += `User's context: "${context}"\n\n`
      }

      capturePrompt += `Return a JSON object with this structure:
{
  "rawThought": "The core idea or message the user wants to express",
  "contentCategory": "The category (tech, business, lifestyle, motivation, etc.)",
  "subjects": ["list", "of", "main", "subjects"],
  "mood": "The emotional tone",
  "setting": "The context or setting if applicable"
}`

      const captureResponse = await callGemini(capturePrompt, imageData)
      const captureOutput = parseJSON(captureResponse) as {
        rawThought: string
        contentCategory: string
        subjects: string[]
        mood: string
        setting: string
      }

      await emit({ type: "agent_output", agent: "capture", output: captureOutput })
      await emit({ type: "agent_complete", agent: "capture", duration: Date.now() - captureStart })

      // ===== INSIGHT AGENT =====
      const insightStart = Date.now()
      await emit({ type: "agent_start", agent: "insight", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "insight", message: "Finding the signal in the noise..." })

      const insightPrompt = `You are the Insight Agent. Find the most powerful, unique angle in this raw thought.

Raw thought: "${captureOutput.rawThought}"
Category: ${captureOutput.contentCategory}
Mood: ${captureOutput.mood}

Return a JSON object:
{
  "coreIdea": "The single most powerful idea distilled",
  "uniqueAngle": "What makes this perspective different",
  "emotionalHook": "The emotional trigger that will resonate",
  "targetAudience": "Who will care most about this",
  "strengthScore": 85
}`

      const insightResponse = await callGemini(insightPrompt)
      const insightOutput = parseJSON(insightResponse) as {
        coreIdea: string
        uniqueAngle: string
        emotionalHook: string
        targetAudience: string
        strengthScore: number
      }

      await emit({ type: "agent_output", agent: "insight", output: insightOutput })
      await emit({ type: "agent_complete", agent: "insight", duration: Date.now() - insightStart })

      // ===== TREND AGENT =====
      const trendStart = Date.now()
      await emit({ type: "agent_start", agent: "trend", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "trend", message: "Scanning current trends..." })

      const trendPrompt = `You are the Trend Agent. Based on the content category "${captureOutput.contentCategory}", suggest current trends and hashtags.

Core idea: "${insightOutput.coreIdea}"
Target audience: ${insightOutput.targetAudience}

Return a JSON object:
{
  "trendingTopics": ["topic1", "topic2", "topic3"],
  "relevantHashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "timingInsight": "Why now is a good time to post about this"
}`

      const trendResponse = await callGemini(trendPrompt)
      const trendOutput = parseJSON(trendResponse) as {
        trendingTopics: string[]
        relevantHashtags: string[]
        timingInsight: string
      }

      await emit({ type: "agent_output", agent: "trend", output: trendOutput })
      await emit({ type: "agent_complete", agent: "trend", duration: Date.now() - trendStart })

      // ===== ANGLE AGENT =====
      const angleStart = Date.now()
      await emit({ type: "agent_start", agent: "angle", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "angle", message: "Crafting the perfect hook..." })

      const anglePrompt = `You are the Angle Agent. Create compelling angles for the content.

Core idea: "${insightOutput.coreIdea}"
Unique angle: "${insightOutput.uniqueAngle}"
Emotional hook: "${insightOutput.emotionalHook}"
Trending topics: ${trendOutput.trendingTopics.join(", ")}

Return a JSON object:
{
  "freshTake": "A fresh, unexpected perspective on the topic",
  "contrarian": "A contrarian view that challenges assumptions",
  "personalConnection": "How to make it relatable and personal",
  "recommendedAngle": "The best angle to use",
  "reasoning": "Why this angle will work"
}`

      const angleResponse = await callGemini(anglePrompt)
      const angleOutput = parseJSON(angleResponse) as {
        freshTake: string
        contrarian: string
        personalConnection: string
        recommendedAngle: string
        reasoning: string
      }

      await emit({ type: "agent_output", agent: "angle", output: angleOutput })
      await emit({ type: "agent_complete", agent: "angle", duration: Date.now() - angleStart })

      // ===== COPY AGENT =====
      const copyStart = Date.now()
      await emit({ type: "agent_start", agent: "copy", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "copy", message: "Writing platform-optimized content..." })

      const copyPrompt = `You are the Copy Agent. Write platform-specific content.

Core idea: "${insightOutput.coreIdea}"
Angle: "${angleOutput.recommendedAngle}"
Emotional hook: "${insightOutput.emotionalHook}"
Hashtags: ${trendOutput.relevantHashtags.join(" ")}

Write a LinkedIn post and a Twitter thread (4-5 tweets).

Return a JSON object:
{
  "linkedin": {
    "content": "The full LinkedIn post (no hashtags in body, conversational tone, line breaks for readability)",
    "hook": "The opening line",
    "cta": "Call to action"
  },
  "twitter": {
    "tweets": [
      { "number": 1, "content": "First tweet with hook", "hashtags": ["#tag1"] },
      { "number": 2, "content": "Second tweet expanding the idea", "hashtags": [] },
      { "number": 3, "content": "Third tweet with insight", "hashtags": [] },
      { "number": 4, "content": "Fourth tweet with example", "hashtags": [] },
      { "number": 5, "content": "Final tweet with CTA", "hashtags": ["#tag2"] }
    ]
  }
}`

      const copyResponse = await callGemini(copyPrompt)
      const copyOutput = parseJSON(copyResponse) as {
        linkedin: { content: string; hook: string; cta: string }
        twitter: { tweets: Array<{ number: number; content: string; hashtags: string[] }> }
      }

      await emit({ type: "agent_output", agent: "copy", output: copyOutput })
      await emit({ type: "agent_complete", agent: "copy", duration: Date.now() - copyStart })

      // Build final result
      const result: GeneratedContent = {
        linkedin: {
          content: copyOutput.linkedin.content,
          hook: copyOutput.linkedin.hook,
          cta: copyOutput.linkedin.cta,
          hashtags: trendOutput.relevantHashtags
        },
        twitter: {
          tweets: copyOutput.twitter.tweets
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          inputType: voice && media ? "voice+image" : voice ? "voice" : media ? "image" : "text"
        }
      }

      await emit({ type: "content_ready", platform: "linkedin", content: result.linkedin })
      await emit({ type: "content_ready", platform: "twitter", content: result.twitter })

      // ===== CRITIC AGENT =====
      const criticStart = Date.now()
      await emit({ type: "agent_start", agent: "critic", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "critic", message: "Summoning the critics..." })

      const criticPrompt = `You are simulating 4 brutally honest AI content critics. Review this content:

LINKEDIN POST:
${result.linkedin.content}

TWITTER THREAD:
${result.twitter.tweets.map(t => `Tweet ${t.number}: ${t.content}`).join('\n')}

Critics:
1. "brutus" - Brutus: Harsh realist, hates fluff
2. "viral-vera" - Viral Vera: Algorithm expert
3. "skeptical-sam" - Skeptical Sam: Devil's advocate
4. "engagement-emma" - Engagement Emma: Audience expert

Return JSON:
{
  "opinions": [
    {
      "agentId": "brutus",
      "verdict": "solid",
      "score": 75,
      "reasoning": "Brutally honest take in their voice",
      "suggestion": "One specific improvement",
      "viralPotential": 60
    }
  ]
}

Include all 4 critics. Be BRUTALLY HONEST.`

      await emit({ type: "agent_thinking", agent: "critic", message: "Critics are debating..." })

      const criticResponse = await callGemini(criticPrompt)
      const criticOutput = parseJSON(criticResponse) as {
        opinions: Array<{
          agentId: string
          verdict: "viral" | "solid" | "meh" | "skip"
          score: number
          reasoning: string
          suggestion: string
          viralPotential: number
        }>
      }

      for (const opinion of criticOutput.opinions) {
        await emit({ type: "agent_thinking", agent: "critic", message: `${opinion.agentId}: "${opinion.reasoning}"` })
        await emit({ type: "critic_opinion", opinion })
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      await emit({ type: "agent_output", agent: "critic", output: criticOutput })
      await emit({ type: "agent_complete", agent: "critic", duration: Date.now() - criticStart })

      await emit({ type: "complete", result, critics: criticOutput.opinions })

      // Save to MongoDB
      const inputType = voice && media ? "voice+image" : voice ? "voice" : media ? "image" : "text"
      await saveGeneration({
        timestamp: new Date(),
        inputType,
        rawInput: { voiceDuration: voice?.duration, hasImage: !!media, context: context || captureOutput.rawThought },
        generatedContent: { linkedin: result.linkedin, twitter: { tweets: result.twitter.tweets.map(t => ({ content: t.content })) } },
        platforms: ["linkedin", "twitter"],
        engagementScore: null,
        topics: [captureOutput.contentCategory, ...trendOutput.trendingTopics.slice(0, 3)]
      })

    } catch (error) {
      console.error("[v0] Generation error:", error)
      let errorMessage = "An unexpected error occurred"
      if (error instanceof Error) {
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
