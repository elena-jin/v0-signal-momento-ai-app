import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

if (!API_KEY) {
  console.warn("[v0] GOOGLE_GENERATIVE_AI_API_KEY not set")
}

export function getGoogleClient() {
  if (!API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required. Get one free at aistudio.google.com")
  }
  return new GoogleGenerativeAI(API_KEY)
}

export async function generateWithGemini(
  prompt: string | Array<{ type: string; text?: string; inlineData?: { mimeType: string; data: string } }>,
  options?: { responseSchema?: object }
) {
  const client = getGoogleClient()
  const model = client.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: options?.responseSchema ? {
      responseMimeType: "application/json",
      responseSchema: options.responseSchema as object
    } : undefined
  })

  const result = await model.generateContent(prompt as string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>)
  const response = result.response
  const text = response.text()
  
  if (options?.responseSchema) {
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Failed to parse JSON response: ${text.slice(0, 200)}`)
    }
  }
  
  return text
}
