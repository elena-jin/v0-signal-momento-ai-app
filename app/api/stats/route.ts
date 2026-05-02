import { getGenerationStats } from "@/lib/mongodb"

export async function GET() {
  const stats = await getGenerationStats()
  return Response.json(stats)
}
