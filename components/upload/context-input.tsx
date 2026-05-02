"use client"

import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ContextInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  maxLength?: number
}

export function ContextInput({ 
  value, 
  onChange, 
  disabled = false,
  maxLength = 500 
}: ContextInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        What was this moment?
        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        disabled={disabled}
        placeholder="Share some context about these images..."
        className={cn(
          "min-h-[80px] resize-none bg-muted/30 border-border",
          "placeholder:text-muted-foreground/60"
        )}
      />
      <div className="flex justify-end">
        <span className={cn(
          "text-xs",
          value.length > maxLength * 0.9 
            ? "text-destructive" 
            : "text-muted-foreground"
        )}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
