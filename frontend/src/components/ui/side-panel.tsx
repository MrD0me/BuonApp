"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A panel that slides in from the inline end and leaves the page visible
 * beside it: the table on the floor map, the order picked from the day's
 * list. Radix Dialog underneath, at `z-panel`, so a `Modal` opened from
 * inside it (a line's actions, a PIN) sits above it.
 *
 * Positioned on the inline end on purpose, never on a physical side: in a
 * Persian document the panel comes in from the other edge, with the rest of
 * the page.
 */

interface SidePanelProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /** Classes for the panel box; the default width is `max-w-2xl`. */
  className?: string
  children: React.ReactNode
}

function SidePanel({ className, children, ...props }: SidePanelProps) {
  return (
    <DialogPrimitive.Root data-slot="side-panel" {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="side-panel-overlay"
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-panel bg-black/40"
        />
        <DialogPrimitive.Content
          data-slot="side-panel-content"
          className={cn(
            "bg-background text-foreground fixed inset-y-0 end-0 z-panel flex h-full w-full max-w-2xl flex-col shadow-xl outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function SidePanelHeader({
  className,
  closeLabel,
  children,
  ...props
}: React.ComponentProps<"div"> & { closeLabel?: string }) {
  return (
    <div
      data-slot="side-panel-header"
      className={cn("border-border flex shrink-0 items-start justify-between gap-3 border-b px-6 pt-5 pb-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      {closeLabel && (
        <DialogPrimitive.Close
          data-slot="side-panel-close"
          aria-label={closeLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -me-2 -mt-1 flex size-touch shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px]"
        >
          <XIcon className="size-6" />
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function SidePanelTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="side-panel-title"
      className={cn("text-foreground text-2xl leading-tight font-bold", className)}
      {...props}
    />
  )
}

function SidePanelDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="side-panel-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function SidePanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="side-panel-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  )
}

function SidePanelFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="side-panel-footer"
      className={cn("border-border bg-background/95 flex shrink-0 items-center gap-2 border-t px-6 py-4 backdrop-blur", className)}
      {...props}
    />
  )
}

export { SidePanel, SidePanelHeader, SidePanelTitle, SidePanelDescription, SidePanelBody, SidePanelFooter }
