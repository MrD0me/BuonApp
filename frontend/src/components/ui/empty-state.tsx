import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * "Nothing here" said properly: an icon, a title, one line of why, and the
 * one thing to do about it.
 */
interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  hint?: React.ReactNode
  action?: React.ReactNode
}

function EmptyState({ icon, title, hint, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className)}
      {...props}
    >
      {icon && (
        <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full [&_svg]:size-8">
          {icon}
        </div>
      )}
      <p className="text-foreground text-lg font-bold">{title}</p>
      {hint && <p className="text-muted-foreground max-w-xs text-sm">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
