import { streamText, Output, wrapLanguageModel } from "ai"
import { mubitMemoryMiddleware } from "@mubit-ai/ai-sdk"
import { z } from "zod"
import type { StreamEvent, VisionAnalysis, NarrativeOutput, TrendOutput, GeneratedContent } from "@/lib/types"

// Schemas for structured output
const VisionSchema = z.object({
  images: z.array(z.object({
    index: z.number(),
    description: z.string(),
    subjects: z.array(z.string()),
    mood: z.string(),
    colors: z.array(z.string()),
    setting: z.string(),
    activity: z.string(),
    emotionalTone: z.string()
  })),
  overallTheme: z.string(),
  suggestedNarrative: z.string(),
  contentCategory: z.string() // For trend agent
})

const NarrativeSchema = z.object({
  storyArc: z.string(),
  emotionalJourney: z.string(),
  keyThemes: z.array(z.string()),
  tone: z.enum(["playful", "inspirational", "reflective", "energetic", "intimate"]),
  hooks: z.array(z.string()),
  callToAction: z.string()
})

const TrendSchema = z.object({
  category: z.string(),
  trendingHashtags: z.array(z.string()),
  recommendedHashtags: z.array(z.string()),
  trendScore: z.number(),
  insights: z.string()
})

const CopySchema = z.object({
  instagram: z.object({
    caption: z.string(),
    hashtags: z.array(z.string())
  }),
  twitter: z.object({
    thread: z.array(z.string()).length(5)
  }),
  stories: z.array(z.object({
    imageIndex: z.number(),
    caption: z.string(),
    sticker: z.string()
  }))
})

const FormatSchema = z.object({
  instagram: z.object({
    caption: z.string(),
    hashtags: z.string(),
    characterCount: z.number()
  }),
  twitter: z.object({
    tweets: z.array(z.object({
      number: z.number(),
      content: z.string(),
      characterCount: z.number()
    }))
  }),
  stories: z.array(z.object({
    imageIndex: z.number(),
    caption: z.string(),
    suggestedSticker: z.string(),
    placement: z.enum(["top", "center", "bottom"])
  }))
})

// Create model with Mubit memory middleware
function createMemoryModel() {
  const baseModel = "anthropic/claude-sonnet-4-20250514"
  
  // Only wrap with Mubit if API key is available
  if (process.env.MUBIT_API_KEY) {
    return wrapLanguageModel({
      model: baseModel,
      middleware: mubitMemoryMiddleware({
        apiKey: process.env.MUBIT_API_KEY,
        sessionId: "momento-content-agent"
      })
    })
  }
  
  return baseModel
}

// Fetch trending hashtags from Bright Data
async function fetchTrendingHashtags(category: string, emit: (event: StreamEvent) => Promise<void>): Promise<string[]> {
  const apiKey = process.env.BRIGHT_DATA_API_KEY
  
  if (!apiKey) {
    await emit({ type: "agent_thinking", agent: "trend", message: "Bright Data API key not configured, using AI-generated trends..." })
    return []
  }
  
  try {
    await emit({ type: "agent_thinking", agent: "trend", message: `Fetching real-time trends for "${category}"...` })
    
    // Call Bright Data's Social Media API for trending hashtags
    // Using Instagram hashtag discovery endpoint
    const response = await fetch("https://api.brightdata.com/datasets/v3/trigger", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dataset_id: "gd_lyclg6rwlk1vfnl81", // Instagram hashtag dataset
        endpoint: "/hashtag/discover",
        input: [{ keyword: category }],
        format: "json",
        limit: 20
      })
    })
    
    if (!response.ok) {
      await emit({ type: "agent_thinking", agent: "trend", message: "API request failed, falling back to AI trends..." })
      return []
    }
    
    const data = await response.json()
    
    // Extract hashtags from Bright Data response
    if (data && Array.isArray(data.results)) {
      const hashtags = data.results
        .filter((item: { hashtag?: string }) => item.hashtag)
        .map((item: { hashtag: string }) => item.hashtag)
        .slice(0, 15)
      
      if (hashtags.length > 0) {
        await emit({ type: "agent_thinking", agent: "trend", message: `Found ${hashtags.length} trending hashtags from Bright Data` })
        return hashtags
      }
    }
    
    return []
  } catch (error) {
    console.error("[v0] Bright Data API error:", error)
    await emit({ type: "agent_thinking", agent: "trend", message: "Error fetching trends, using AI-generated trends..." })
    return []
  }
}

export async function POST(req: Request) {
  const { images, context } = await req.json() as {
    images: Array<{ data: string; type: string; name: string }>
    context?: string
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const emit = async (event: StreamEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  const startTime = Date.now()
  const model = createMemoryModel()

  ;(async () => {
    try {
      // ====== VISION AGENT ======
      await emit({ type: "agent_start", agent: "vision", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "vision", message: "Analyzing uploaded images..." })
      
      const visionStart = Date.now()
      
      const imageContents = images.map((img) => ({
        type: "image" as const,
        image: img.data,
        mimeType: img.type
      }))
      
      await emit({ type: "agent_thinking", agent: "vision", message: `Processing ${images.length} image${images.length > 1 ? 's' : ''}...` })

      const visionResult = await streamText({
        model,
        messages: [
          {
            role: "user",
            content: [
              ...imageContents,
              {
                type: "text",
                text: `You are the Vision Agent for Momento, an AI content creation system. Analyze the provided ${images.length} image(s) with extreme attention to detail.
                
Extract for each image:
- Description: A detailed description of what's in the image
- Subjects: Who/what is in the image (people, objects, animals)
- Mood: The overall emotional feeling (happy, serene, energetic, etc.)
- Colors: Dominant colors in the image
- Setting: Location, environment, time of day
- Activity: What's happening in the image
- Emotional Tone: The deeper emotional undertone

Also determine:
- Overall Theme: A unifying theme across all images
- Suggested Narrative: A brief story that connects the images
- Content Category: A single-word category for trend research (e.g., "travel", "food", "fitness", "fashion", "lifestyle", "nature", "tech", "art")

${context ? `User provided context: "${context}"` : "No additional context provided."}

Return your analysis as structured JSON.`
              }
            ]
          }
        ],
        output: Output.object({ schema: VisionSchema })
      })
      
      let visionOutput: VisionAnalysis & { contentCategory: string } | null = null
      for await (const chunk of visionResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object' && 'images' in chunk) {
          const img = chunk.images?.[0]
          if (img?.subjects?.length) {
            await emit({ 
              type: "agent_thinking", 
              agent: "vision", 
              message: `Detected: ${img.subjects.slice(0, 3).join(', ')}${img.mood ? ` | Mood: ${img.mood}` : ''}` 
            })
          }
        }
      }
      
      const finalVision = await visionResult.output
      visionOutput = finalVision as VisionAnalysis & { contentCategory: string }
      
      await emit({ type: "agent_output", agent: "vision", output: visionOutput })
      await emit({ type: "agent_complete", agent: "vision", duration: Date.now() - visionStart })

      // ====== NARRATIVE AGENT ======
      await emit({ type: "agent_start", agent: "narrative", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "narrative", message: "Constructing story arc from visual analysis..." })
      
      const narrativeStart = Date.now()

      const narrativeResult = await streamText({
        model,
        messages: [
          {
            role: "user",
            content: `You are the Narrative Agent for Momento. Using the following visual analysis, construct a compelling story arc.

Visual Analysis:
${JSON.stringify(visionOutput, null, 2)}

${context ? `User's context: "${context}"` : ""}

Identify:
- Story Arc: The narrative journey these images tell
- Emotional Journey: The emotional progression
- Key Themes: 3-5 themes that emerge
- Tone: Choose one - playful, inspirational, reflective, energetic, or intimate
- Hooks: 2-3 attention-grabbing opening lines
- Call to Action: A natural CTA that fits the content

Return structured JSON.`
          }
        ],
        output: Output.object({ schema: NarrativeSchema })
      })
      
      let narrativeOutput: NarrativeOutput | null = null
      for await (const chunk of narrativeResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('keyThemes' in chunk && Array.isArray(chunk.keyThemes) && chunk.keyThemes.length > 0) {
            await emit({ 
              type: "agent_thinking", 
              agent: "narrative", 
              message: `Themes identified: ${chunk.keyThemes.slice(0, 3).join(', ')}` 
            })
          }
          if ('tone' in chunk && chunk.tone) {
            await emit({ 
              type: "agent_thinking", 
              agent: "narrative", 
              message: `Tone selected: ${chunk.tone}` 
            })
          }
        }
      }
      
      const finalNarrative = await narrativeResult.output
      narrativeOutput = finalNarrative as NarrativeOutput
      
      await emit({ type: "agent_output", agent: "narrative", output: narrativeOutput })
      await emit({ type: "agent_complete", agent: "narrative", duration: Date.now() - narrativeStart })

      // ====== TREND AGENT ======
      await emit({ type: "agent_start", agent: "trend", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "trend", message: `Researching trends for category: ${visionOutput.contentCategory}...` })
      
      const trendStart = Date.now()
      
      // Fetch real trending hashtags from Bright Data
      const realTrendingHashtags = await fetchTrendingHashtags(visionOutput.contentCategory, emit)
      
      // Use AI to analyze and recommend hashtags based on real data + content
      const trendResult = await streamText({
        model,
        messages: [
          {
            role: "user",
            content: `You are the Trend Agent for Momento. Analyze current social media trends for the content category and recommend hashtags.

Content Category: ${visionOutput.contentCategory}
Overall Theme: ${visionOutput.overallTheme}
Key Themes: ${narrativeOutput.keyThemes.join(', ')}
Tone: ${narrativeOutput.tone}

${realTrendingHashtags.length > 0 
  ? `Real-time trending hashtags from social media APIs:\n${realTrendingHashtags.map(h => `#${h}`).join(' ')}\n\nUse these ACTUAL trending hashtags as your primary recommendations.` 
  : `No real-time data available. Generate hashtag recommendations based on current social media best practices for ${visionOutput.contentCategory} content.`}

Return:
- category: The content category
- trendingHashtags: ${realTrendingHashtags.length > 0 ? 'The actual trending hashtags provided above' : '10-15 currently popular hashtags for this category'}
- recommendedHashtags: 5-8 hashtags specifically tailored to THIS content combining trends with the unique themes
- trendScore: A score from 1-100 indicating how trendy/timely this content is
- insights: A brief insight about why these hashtags will perform well

Return structured JSON.`
          }
        ],
        output: Output.object({ schema: TrendSchema })
      })
      
      let trendOutput: TrendOutput | null = null
      for await (const chunk of trendResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('trendingHashtags' in chunk && Array.isArray(chunk.trendingHashtags) && chunk.trendingHashtags.length > 0) {
            await emit({ 
              type: "agent_thinking", 
              agent: "trend", 
              message: `Found ${chunk.trendingHashtags.length} trending hashtags` 
            })
          }
          if ('trendScore' in chunk && typeof chunk.trendScore === 'number') {
            await emit({ 
              type: "agent_thinking", 
              agent: "trend", 
              message: `Trend score: ${chunk.trendScore}/100` 
            })
          }
        }
      }
      
      const finalTrend = await trendResult.output
      trendOutput = finalTrend as TrendOutput
      
      await emit({ type: "agent_output", agent: "trend", output: trendOutput })
      await emit({ type: "agent_complete", agent: "trend", duration: Date.now() - trendStart })

      // ====== COPY AGENT ======
      await emit({ type: "agent_start", agent: "copy", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "copy", message: "Generating platform-specific content with trending hashtags..." })
      
      const copyStart = Date.now()

      await emit({ type: "agent_thinking", agent: "copy", message: "Writing Instagram caption..." })
      
      const copyResult = await streamText({
        model,
        messages: [
          {
            role: "user",
            content: `You are the Copy Agent for Momento, a world-class social media copywriter.

Visual Analysis:
${JSON.stringify(visionOutput, null, 2)}

Narrative Direction:
${JSON.stringify(narrativeOutput, null, 2)}

Trend Research:
${JSON.stringify(trendOutput, null, 2)}

Generate platform-optimized content:

INSTAGRAM:
- Engaging caption (hook in first line, conversational, strategic line breaks)
- Use the RECOMMENDED hashtags from the Trend Agent: ${trendOutput.recommendedHashtags.map(h => `#${h}`).join(' ')}
- Add 3-5 more hashtags from the trending list that fit naturally

TWITTER THREAD:
- Exactly 5 tweets
- First tweet hooks and introduces thread (use thread emoji)
- Each tweet standalone but connected
- Build narrative momentum
- Stay under 280 chars per tweet
- Include 1-2 relevant hashtags per tweet from the trend research

STORIES:
- One caption per image (${images.length} total)
- Ultra-short (1-6 words ideal)
- Suggest a sticker type for each

Tone: ${narrativeOutput.tone}

Return structured JSON.`
          }
        ],
        output: Output.object({ schema: CopySchema })
      })
      
      for await (const chunk of copyResult.partialOutputStream) {
        if (chunk && typeof chunk === 'object') {
          if ('instagram' in chunk && chunk.instagram && 'caption' in chunk.instagram) {
            await emit({ type: "agent_thinking", agent: "copy", message: "Instagram caption drafted..." })
          }
          if ('twitter' in chunk && chunk.twitter && 'thread' in chunk.twitter) {
            const thread = chunk.twitter.thread
            if (Array.isArray(thread) && thread.length > 0) {
              await emit({ type: "agent_thinking", agent: "copy", message: `Twitter thread: ${thread.length}/5 tweets...` })
            }
          }
        }
      }
      
      const copyOutput = await copyResult.output
      
      await emit({ type: "agent_thinking", agent: "copy", message: "Writing story captions..." })
      await emit({ type: "agent_output", agent: "copy", output: copyOutput })
      await emit({ type: "agent_complete", agent: "copy", duration: Date.now() - copyStart })

      // ====== FORMAT AGENT ======
      await emit({ type: "agent_start", agent: "format", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "format", message: "Structuring final deliverables..." })
      
      const formatStart = Date.now()

      const formatResult = await streamText({
        model,
        messages: [
          {
            role: "user",
            content: `You are the Format Agent for Momento. Structure the generated copy into final deliverables.

Raw Copy:
${JSON.stringify(copyOutput, null, 2)}

Format for delivery:
- Instagram: Include caption, hashtags as single string, and character count
- Twitter: Array of tweet objects with number (1-5), content, and character count
- Stories: Array with imageIndex (0-indexed), caption, suggestedSticker, and placement (top/center/bottom)

Ensure all content is polished and ready to use.

Return structured JSON.`
          }
        ],
        output: Output.object({ schema: FormatSchema })
      })
      
      await emit({ type: "agent_thinking", agent: "format", message: "Finalizing Instagram format..." })
      await emit({ type: "agent_thinking", agent: "format", message: "Finalizing Twitter thread format..." })
      await emit({ type: "agent_thinking", agent: "format", message: "Finalizing story captions..." })
      
      const formatOutput = await formatResult.output
      
      await emit({ type: "agent_output", agent: "format", output: formatOutput })
      await emit({ type: "agent_complete", agent: "format", duration: Date.now() - formatStart })

      // Final result
      const result: GeneratedContent = {
        ...formatOutput,
        metadata: {
          generatedAt: new Date().toISOString(),
          imageCount: images.length,
          processingTime: Date.now() - startTime
        }
      }

      await emit({ type: "content_ready", platform: "instagram", content: result.instagram })
      await emit({ type: "content_ready", platform: "twitter", content: result.twitter })
      await emit({ type: "content_ready", platform: "stories", content: result.stories })
      await emit({ type: "complete", result })

    } catch (error) {
      console.error("[v0] Generation error:", error)
      
      // Provide more helpful error messages
      let errorMessage = "An unexpected error occurred"
      if (error instanceof Error) {
        if (error.message.includes("credit card") || error.message.includes("customer_verification")) {
          errorMessage = "AI Gateway requires billing setup. Please add a credit card in your Vercel dashboard to unlock AI features."
        } else if (error.message.includes("MUBIT_API_KEY")) {
          errorMessage = "Mubit memory is not configured. Set MUBIT_API_KEY in your environment variables."
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Rate limit reached. Please wait a moment and try again."
        } else {
          errorMessage = error.message
        }
      }
      
      await emit({ 
        type: "error", 
        message: errorMessage 
      })
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
