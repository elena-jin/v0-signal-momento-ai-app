"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
  disabled?: boolean
  hasRecording?: boolean
}

export function VoiceRecorder({ onRecordingComplete, disabled, hasRecording }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      audioContextRef.current = new AudioContext()
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        onRecordingComplete(blob, finalDuration)
        
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }
      
      mediaRecorderRef.current.start(100)
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        
        if (elapsed >= 60) {
          stopRecording()
        }
      }, 100)
      
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startRecording()
  }, [disabled, startRecording])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    stopRecording()
  }, [stopRecording])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular mic button with glow */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={isRecording ? handlePointerUp : undefined}
        disabled={disabled}
        className={cn(
          "relative flex items-center justify-center size-20 rounded-full transition-all touch-none select-none",
          "border-2",
          isRecording 
            ? "bg-primary/20 border-primary shadow-[0_0_30px_rgba(20,184,166,0.5)] scale-105" 
            : hasRecording
              ? "bg-primary/10 border-primary/50 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]"
              : "bg-card border-border hover:bg-primary/10 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className={cn(
          "size-8 transition-colors",
          isRecording ? "text-primary" : hasRecording ? "text-primary/70" : "text-muted-foreground"
        )} />
        
        {/* Pulse ring when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-primary/30 animate-pulse" />
          </>
        )}
      </button>
      
      {/* Status text */}
      {isRecording ? (
        <p className="text-xs font-mono text-primary uppercase tracking-wider">
          Recording {duration}s...
        </p>
      ) : hasRecording ? (
        <p className="text-xs font-mono text-primary uppercase tracking-wider">
          Voice Active
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Hold to record</p>
      )}
    </div>
  )
}
