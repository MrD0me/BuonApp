import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The first row of every page: the `<h1>`, an optional line under it, a slot
 * before it (the sidebar toggle) and the page's actions after it.
 *
 * Every page used to write its own heading with its own classes, and the
 * heading did not always say what the sidebar said. One component, one
 * name.
 */
interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** What sits before the title, e.g. the sidebar trigger. */
  leading?: React.ReactNode
  /** Buttons and chips, after the title. */
  actions?: React.ReactNode
}

function PageHeader({ title, subtitle, leading, actions, className, children, ...props }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex min-h-touch-lg shrink-0 flex-wrap items-center gap-3", className)}
      {...props}
    >
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="text-foreground truncate text-2xl leading-tight font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground truncate text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </header>
  )
}

export { PageHeader }
