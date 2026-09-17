import * as React from "react"

import { cn } from "@/lib/utils"
import { TONE_STYLES, type Tone } from "@/lib/status-styles"

/**
 * A pill or a dot in one of the colours of state (`lib/status-styles.ts`).
 * The label comes from the caller, already translated.
 */
interface StatusBadgeProps extends React.ComponentProps<"span"> {
  tone: Tone
  size?: "sm" | "md"
}

function StatusBadge({ tone, size = "md", className, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold leading-none whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm",
        TONE_STYLES[tone].badge,
        className
      )}
      {...props}
    />
  )
}

function StatusDot({ tone, className, ...props }: React.ComponentProps<"span"> & { tone: Tone }) {
  return (
    <span
      data-slot="status-dot"
      data-tone={tone}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", TONE_STYLES[tone].dot, className)}
      {...props}
    />
  )
}

export { StatusBadge, StatusDot }
