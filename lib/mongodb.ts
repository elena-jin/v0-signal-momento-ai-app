import { MongoClient, Db } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.warn("[v0] MONGODB_URI not set - generation history will not be saved")
}

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db | null> {
  if (!MONGODB_URI) return null
  
  if (db) return db
  
  try {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000
    })
    await client.connect()
    db = client.db("signal")
    return db
  } catch (error) {
    console.error("[v0] MongoDB connection error:", error)
    return null
  }
}

export interface GenerationRecord {
  id?: string
  timestamp: Date
  inputType: "voice" | "image" | "text" | "voice+image"
  rawInput: {
    voiceDuration?: number
    hasImage?: boolean
    context?: string
  }
  generatedContent: {
    linkedin: { content: string; hook: string; cta: string }
    twitter: { tweets: Array<{ content: string }> }
  }
  platforms: string[]
  engagementScore: number | null
  topics: string[]
}

export async function saveGeneration(record: GenerationRecord): Promise<boolean> {
  const database = await getDb()
  if (!database) return false
  
  try {
    await database.collection("generations").insertOne({
      ...record,
      createdAt: new Date()
    })
    return true
  } catch (error) {
    console.error("[v0] Failed to save generation:", error)
    return false
  }
}

export async function getGenerationStats(): Promise<{
  thisWeek: number
  totalGenerations: number
  topTopics: Array<{ topic: string; count: number }>
  learningProgress: number
}> {
  const database = await getDb()
  if (!database) {
    return { thisWeek: 0, totalGenerations: 0, topTopics: [], learningProgress: 0 }
  }
  
  try {
    const collection = database.collection("generations")
    
    // Get total count
    const totalGenerations = await collection.countDocuments()
    
    // Get this week's count
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeek = await collection.countDocuments({
      timestamp: { $gte: weekAgo }
    })
    
    // Get top topics
    const topicsAgg = await collection.aggregate([
      { $unwind: "$topics" },
      { $group: { _id: "$topics", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray()
    
    const topTopics = topicsAgg.map(t => ({ topic: t._id as string, count: t.count as number }))
    
    // Learning progress: 100 generations = fully learned
    const learningProgress = Math.min(100, Math.round((totalGenerations / 100) * 100))
    
    return { thisWeek, totalGenerations, topTopics, learningProgress }
  } catch (error) {
    console.error("[v0] Failed to get stats:", error)
    return { thisWeek: 0, totalGenerations: 0, topTopics: [], learningProgress: 0 }
  }
}
