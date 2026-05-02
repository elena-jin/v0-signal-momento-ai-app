import { streamText, Output } from "ai"
import { z } from "zod"
import type { StreamEvent, VisionAnalysis, NarrativeOutput, GeneratedContent } from "@/lib/types"

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
  suggestedNarrative: z.string()
})

const NarrativeSchema = z.object({
  storyArc: z.string(),
  emotionalJourney: z.string(),
  keyThemes: z.array(z.string()),
  tone: z.enum(["playful", "inspirational", "reflective", "energetic", "intimate"]),
  hooks: z.array(z.string()),
  callToAction: z.string()
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

  ;(async () => {
    try {
      // ====== VISION AGENT ======
      await emit({ type: "agent_start", agent: "vision", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "vision", message: "Analyzing uploaded images..." })
      
      const visionStart = Date.now()
      
      const imageContents = images.map((img, idx) => ({
        type: "image" as const,
        image: img.data,
        mimeType: img.type
      }))
      
      await emit({ type: "agent_thinking", agent: "vision", message: `Processing ${images.length} image${images.length > 1 ? 's' : ''}...` })

      const visionResult = await streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: [
              ...imageContents,
              {
                type: "text",
                text: `You are the Vision Agent. Analyze the provided ${images.length} image(s) with extreme attention to detail.
                
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

${context ? `User provided context: "${context}"` : "No additional context provided."}

Return your analysis as structured JSON.`
              }
            ]
          }
        ],
        output: Output.object({ schema: VisionSchema })
      })
      
      let visionOutput: VisionAnalysis | null = null
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
      visionOutput = finalVision as VisionAnalysis
      
      await emit({ type: "agent_output", agent: "vision", output: visionOutput })
      await emit({ type: "agent_complete", agent: "vision", duration: Date.now() - visionStart })

      // ====== NARRATIVE AGENT ======
      await emit({ type: "agent_start", agent: "narrative", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "narrative", message: "Constructing story arc from visual analysis..." })
      
      const narrativeStart = Date.now()

      const narrativeResult = await streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: `You are the Narrative Agent. Using the following visual analysis, construct a compelling story arc.

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

      // ====== COPY AGENT ======
      await emit({ type: "agent_start", agent: "copy", timestamp: new Date().toISOString() })
      await emit({ type: "agent_thinking", agent: "copy", message: "Generating platform-specific content..." })
      
      const copyStart = Date.now()

      await emit({ type: "agent_thinking", agent: "copy", message: "Writing Instagram caption..." })
      
      const copyResult = await streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: `You are the Copy Agent, a world-class social media copywriter.

Visual Analysis:
${JSON.stringify(visionOutput, null, 2)}

Narrative Direction:
${JSON.stringify(narrativeOutput, null, 2)}

Generate platform-optimized content:

INSTAGRAM:
- Engaging caption (hook in first line, conversational, strategic line breaks)
- 5-10 relevant hashtags (mix of popular and niche)

TWITTER THREAD:
- Exactly 5 tweets
- First tweet hooks and introduces thread (use thread emoji)
- Each tweet standalone but connected
- Build narrative momentum
- Stay under 280 chars per tweet

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
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: `You are the Format Agent. Structure the generated copy into final deliverables.

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
      console.error("Generation error:", error)
      await emit({ 
        type: "error", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
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
