import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The row of big buttons pinned to the bottom of a screen or a panel: send to
 * the kitchen, add dishes, print the bill. Sticky, so it stays reachable
 * however long the list above it grows, and padded past the phone's home
 * indicator.
 */
function ActionBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "border-border bg-background/95 sticky bottom-0 z-10 flex shrink-0 items-center gap-2.5 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur",
        className
      )}
      {...props}
    />
  )
}

export { ActionBar }
