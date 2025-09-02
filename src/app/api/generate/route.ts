import { type NextRequest, NextResponse } from "next/server"

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, prompt, style } = (await req.json()) as {
      imageDataUrl: string
      prompt: string
      style: string
    }

    if (!imageDataUrl || !prompt || !style) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 })
    }

    await sleep(1000 + Math.floor(Math.random() * 1000))

    if (Math.random() < 0.2) {
      return NextResponse.json({ message: "Model overloaded" }, { status: 429 })
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const createdAt = new Date().toISOString()

    return NextResponse.json({ id, imageUrl: imageDataUrl, prompt, style, createdAt })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}