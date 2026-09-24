"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Ltr } from "@/components/layout/Ltr"

/**
 * `−  4  +` for covers and quantities, with buttons a finger can hit.
 *
 * Labels come from the caller (it knows whether it is counting guests or
 * dishes); the number is an LTR island so it reads the same in Persian.
 */
const SIZES = {
  /** Inside a row. */
  sm: { button: "size-10", value: "min-w-8 text-lg", icon: "size-5" },
  md: { button: "size-touch", value: "min-w-10 text-xl", icon: "size-5" },
  lg: { button: "size-touch-xl", value: "min-w-14 text-2xl", icon: "size-6" },
} as const

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: keyof typeof SIZES
  decreaseLabel: string
  increaseLabel: string
  disabled?: boolean
  className?: string
  /** For the number: a list of steppers can quiet the ones still at nought. */
  valueClassName?: string
}

function Stepper({
  value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, size = "md",
  decreaseLabel, increaseLabel, disabled = false, className, valueClassName,
}: StepperProps) {
  const s = SIZES[size]
  const button = cn(
    "bg-muted text-foreground hover:bg-accent focus-visible:ring-ring/50 flex shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-[3px] active:scale-95 disabled:opacity-40 disabled:active:scale-100",
    s.button
  )
  return (
    <div data-slot="stepper" className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={button}
      >
        <Minus className={s.icon} />
      </button>
      <Ltr className={cn("text-foreground text-center font-bold tabular-nums", s.value, valueClassName)}>{value}</Ltr>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={button}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  )
}

export { Stepper }
