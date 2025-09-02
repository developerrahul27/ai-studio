"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import NextImage from "next/image"
import Spinner from "./spinner"
import getErrorMessage from "@/utils/constant"
import Header from "@/container/header"

type StyleOption = "Editorial" | "Streetwear" | "Vintage"

type Generation = {
  id: string
  imageUrl: string
  prompt: string
  style: StyleOption
  createdAt: string
}

type ChatUserItem = {
  id: string
  role: "user"
  imageUrl: string
  createdAt: string
}

type ChatAssistantItem =
  | { id: string; role: "assistant"; pending: true }
  | { id: string; role: "assistant"; result: Generation }
  | { id: string; role: "assistant"; error: string }

type ChatItem = ChatUserItem | ChatAssistantItem

const STYLE_OPTIONS: StyleOption[] = ["Editorial", "Streetwear", "Vintage"]
const CHAT_KEY = "ai-studio-chat-v1"

async function downscaleImageToDataUrl(file: File, maxDim = 1920): Promise<string> {
  const isImage = /^image\/(png|jpeg|jpg)$/.test(file.type)
  if (!isImage) throw new Error("Only PNG or JPG images are supported.")

  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = fileDataUrl
  })

  const { width, height } = img
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context.")

  ctx.drawImage(img, 0, 0, targetW, targetH)


  return canvas.toDataURL("image/jpeg", 0.9)
}

function loadChat(): ChatItem[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatItem[]

    return Array.isArray(parsed) ? parsed.slice(-10) : []
  } catch {
    return []
  }
}

function saveChat(items: ChatItem[]) {
  const next = items.slice(-10)
  localStorage.setItem(CHAT_KEY, JSON.stringify(next))
}

export default function StudioApp() {

  const [imageDataUrl, setImageDataUrl] = useState<string>("")
  const [prompt, setPrompt] = useState<string>("")
  const [style, setStyle] = useState<StyleOption | "">("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")


  const [chat, setChat] = useState<ChatItem[]>([])


  const currentController = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" })

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(message: string) {
    setToast({ show: true, message })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToast({ show: false, message: "" }), 2500)
  }

  useEffect(() => {
    setChat(loadChat())
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [chat])

  const liveSummary = useMemo(() => {
    const parts: string[] = []
    if (imageDataUrl) parts.push("Image selected")
    if (prompt) parts.push(`Prompt: ${prompt}`)
    if (style) parts.push(`Style: ${style}`)
    return parts.join(". ")
  }, [imageDataUrl, prompt, style])

  async function handleFileChange(file: File | null) {
    if (!file) {
      setImageDataUrl("")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File too large (max 10MB).")
      setStatus("error")
      return
    }
    try {
      const dataUrl = await downscaleImageToDataUrl(file, 1920)
      setImageDataUrl(dataUrl)
      if (status === "error") setStatus("idle")
      setErrorMsg("")
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err) || "Failed to process image.")
      setStatus("error")
    }
  }

  function onPause() {
    currentController.current?.abort()
    setChat((prev) => {
      const next = prev.filter((m) => !(m.role === "assistant" && "pending" in m && m.pending))
      saveChat(next)
      return next
    })
    showToast("Stopped generating image")
  }

  function clearInputs() {
    setImageDataUrl("")
    setPrompt("")
    setStyle("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function fetchWithRetry(body: { imageDataUrl: string; prompt: string; style: StyleOption }) {
    try {
      const controller = new AbortController()
      currentController.current = controller

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        let msg = `Request failed (${res.status})`
        try {
          const payload = (await res.json()) as { message?: string }
          msg = payload?.message || msg
        } catch (err) {
          console.log(err)
        }
        setErrorMsg(msg)
        setStatus("error")
        return { data: null as Generation | null, aborted: false }
      }

      const data = (await res.json()) as Generation
      setStatus("success")
      return { data, aborted: false }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        setStatus("idle")
        return { data: null as Generation | null, aborted: true }
      }
      setErrorMsg(getErrorMessage(err) || "Network error")
      setStatus("error")
      return { data: null as Generation | null, aborted: false }
    } finally {
      currentController.current = null
    }
  }

  async function onGenerateClick() {
    if (!imageDataUrl || !prompt || !style) return

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const createdAt = new Date().toISOString()


    const userMsg: ChatUserItem = {
      id: `user-${id}`,
      role: "user",
      imageUrl: imageDataUrl,
      createdAt,
    }
    const pendingId = `pending-${id}`
    setChat((prev: any) => {
      const next = [...prev, userMsg, { id: pendingId, role: "assistant", pending: true }]
      saveChat(next)
      return next
    })

    setStatus("loading")
    setErrorMsg("")
    const payload = { imageDataUrl, prompt, style: style as StyleOption }

    clearInputs()

    const { data, aborted } = await fetchWithRetry(payload)

    if (aborted) {
      setChat((prev) => {
        const next = prev.filter((m) => m.id !== pendingId)
        saveChat(next)
        return next
      })
      return
    }

    if (data) {
      setChat((prev: any) => {
        const next = prev.map((m: any) =>
          m.id === pendingId ? { id: `assistant-${data.id}`, role: "assistant", result: data } : m,
        )
        saveChat(next)
        return next
      })
    } else {
      setChat((prev: any) => {
        const next = prev.map((m: any) =>
          m.id === pendingId
            ? { id: `assistant-error-${Date.now()}`, role: "assistant", error: errorMsg || "Error" }
            : m,
        )
        saveChat(next)
        return next
      })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col p-4 md:p-6">
      <Header />

      <section className="flex flex-1 flex-col gap-4 rounded-lg border bg-card p-3 md:p-4 shadow-lg">
        {chat.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Send an image to get started.</p>
        ) : (
          <ul className="flex flex-1 flex-col gap-4">
            {chat.map((msg) => {
              if (msg.role === "user") {
                return (
                  <li key={msg.id} className="ml-auto max-w-[85%]">
                    <div className="rounded-lg border bg-primary/10 p-3">
                      <div className="relative h-48 w-full overflow-hidden rounded bg-muted md:h-60">
                        <img
                          src={msg.imageUrl || "/placeholder.svg?height=300&width=400&query=user%20preview"}
                          alt="User preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="mt-1 text-right text-[11px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                )
              }

              if ("pending" in msg && msg.pending) {
                return (
                  <li key={msg.id} className="w-full max-w-[85%]">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Spinner className="h-4 w-4" />
                        Generating...
                      </div>
                    </div>
                  </li>
                )
              }

              if ("error" in msg) {
                return (
                  <li key={msg.id} className="w-full max-w-[85%]">
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      {errorMsg || "Model Overloaded"}
                    </div>
                  </li>
                )
              }

              if ("result" in msg) {
                const r = msg.result
                return (
                  <li key={msg.id} className="w-full max-w-[60%]">
                    <div className="rounded-lg border bg-card p-3">
                      <div className="space-y-3">
                        <div className="relative h-80 w-full overflow-hidden rounded bg-muted md:h-96">
                          <NextImage
                            src={r.imageUrl || "/placeholder.svg?height=720&width=1280&query=generated%20result"}
                            alt="Generated result"
                            fill
                            sizes="(max-width: 768px) 100vw, 66vw"
                            className="object-contain"
                          />
                        </div>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="font-medium">Prompt:</span> <span className="text-pretty">{r.prompt}</span>
                          </p>
                          <p>
                            <span className="font-medium">Style:</span> {r.style}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">ID:</span> {r.id} · <span className="font-medium">At:</span>{" "}
                            {new Date(r.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              }

              return null
            })}
          </ul>
        )}
        <div ref={chatEndRef} />
      </section>

      <section className="sticky bottom-0 mt-4 rounded-lg border bg-card p-3 md:p-4 shadow-lg">
        <div className="grid gap-3">
          {imageDataUrl && (
            <div className="relative h-40 w-full overflow-hidden rounded bg-muted md:h-44">
              <img
                src={imageDataUrl || "/placeholder.svg?height=240&width=400&query=composer%20preview"}
                alt="Selected image preview"
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                aria-label="Remove selected image"
                onClick={() => {
                  setImageDataUrl("")
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                title="Remove"
              >
                {"\u00D7"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <input
                  id="prompt"
                  name="prompt"
                  type="text"
                  aria-label="Prompt"
                  className="w-full rounded-md border bg-background px-3 py-2 pr-12 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  placeholder="Describe your idea..."
                  value={prompt}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload image"
                  title="Upload image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/80 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="6" width="14" height="12" rx="2" />
                    <circle cx="9" cy="10" r="1.2" />
                    <path d="M5.5 16l3.2-3.2 2.3 2.3 2.3-2.3 3.2 3.2" />
                    <path d="M19 4v4" />
                    <path d="M17.5 5.5L19 4l1.5 1.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="md:w-48">
              <select
                id="style"
                name="style"
                aria-label="Style"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                value={style}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStyle(e.target.value as StyleOption | "")}
              >
                <option value="">Select a style</option>
                {STYLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-36">
              <button
                type="button"
                onClick={status === "loading" ? onPause : onGenerateClick}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                disabled={status !== "loading" ? !imageDataUrl || !prompt || !style : false}
                aria-disabled={status !== "loading" ? !imageDataUrl || !prompt || !style : false}
              >
                {status === "loading" ? (
                  <>
                    <Spinner className="h-4 w-4 text-primary-foreground" />
                    <span className="sr-only">Generating</span>
                    Stop
                  </>
                ) : (
                  "Generate"
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  )
}