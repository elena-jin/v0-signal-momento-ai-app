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
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(0.1))
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current || !isRecording) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Sample 20 points across the frequency spectrum
    const levels: number[] = []
    const step = Math.floor(dataArray.length / 20)
    for (let i = 0; i < 20; i++) {
      const value = dataArray[i * step] / 255
      levels.push(Math.max(0.1, value))
    }
    
    setAudioLevels(levels)
    animationRef.current = requestAnimationFrame(updateAudioLevels)
  }, [isRecording])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      // Set up media recorder
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
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }
      
      mediaRecorderRef.current.start(100)
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      
      // Start duration counter
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        
        // Max 60 seconds
        if (elapsed >= 60) {
          stopRecording()
        }
      }, 100)
      
      // Start visualization
      animationRef.current = requestAnimationFrame(updateAudioLevels)
      
    } catch (error) {
      console.error("[v0] Error starting recording:", error)
    }
  }, [onRecordingComplete, updateAudioLevels])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      setAudioLevels(Array(20).fill(0.1))
    }
  }, [isRecording])

  // Handle pointer events for press-and-hold
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Waveform visualization */}
      <div className="flex items-center justify-center gap-0.5 h-16 w-full px-4">
        {audioLevels.map((level, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-75",
              isRecording ? "bg-primary" : "bg-muted-foreground/30"
            )}
            style={{
              height: `${Math.max(8, level * 64)}px`,
              animationDelay: isRecording ? `${i * 25}ms` : "0ms"
            }}
          />
        ))}
      </div>
      
      {/* Record button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={isRecording ? handlePointerUp : undefined}
        disabled={disabled}
        className={cn(
          "relative flex items-center justify-center size-24 rounded-full transition-all touch-none select-none",
          "border-2",
          isRecording 
            ? "bg-primary/20 border-primary scale-110 shadow-[0_0_40px_rgba(59,130,246,0.5)]" 
            : hasRecording
              ? "bg-primary/10 border-primary/50 hover:bg-primary/20 hover:border-primary"
              : "bg-muted border-muted-foreground/30 hover:bg-muted/80 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Mic className={cn(
          "size-10 transition-colors",
          isRecording ? "text-primary" : hasRecording ? "text-primary/70" : "text-muted-foreground"
        )} />
        
        {/* Pulse ring when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
        )}
      </button>
      
      {/* Instructions / Duration */}
      <div className="text-center">
        {isRecording ? (
          <div className="space-y-1">
            <p className="text-lg font-mono text-primary">{formatDuration(duration)}</p>
            <p className="text-xs text-muted-foreground">Release to stop</p>
          </div>
        ) : hasRecording ? (
          <p className="text-sm text-muted-foreground">Hold to re-record</p>
        ) : (
          <p className="text-sm text-muted-foreground">Hold to rant</p>
        )}
      </div>
    </div>
  )
}
