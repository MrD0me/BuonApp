"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

/**
 * The one window primitive for anything that interrupts a screen: add-ons,
 * a fixed menu, a line's actions, a PIN.
 *
 * On a phone it is a sheet that rises from the bottom, on the PC a centred
 * card; the caller writes it once. Built on Radix Dialog, so it has what the
 * hand-rolled `fixed inset-0` overlays never had: focus trap, Escape, scroll
 * lock, a labelled title. It sits at `z-modal`, above side panels and
 * drawers (`z-panel`) whatever the DOM order — which is what lets the
 * handheld keep its table screen mounted under the menu picker.
 */

const SIZE_CLASS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
} as const

interface ModalProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  size?: keyof typeof SIZE_CLASS
  /** Classes for the content box. */
  className?: string
  children: React.ReactNode
}

function Modal({ size = "md", className, children, ...props }: ModalProps) {
  const isMobile = useIsMobile()
  const contentRef = React.useRef<HTMLDivElement>(null)
  return (
    <DialogPrimitive.Root data-slot="modal" {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="modal-overlay"
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-modal bg-black/50"
        />
        <DialogPrimitive.Content
          ref={contentRef}
          data-slot="modal-content"
          data-mobile={isMobile ? "true" : undefined}
          // Focus lands on the window itself, not on its close button: a
          // ring around the X the moment a dish opens reads as "close me".
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          className={cn(
            "bg-background text-foreground fixed z-modal flex flex-col shadow-lg outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            isMobile
              ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom-8"
              : cn(
                  "top-[50%] left-[50%] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-2xl max-h-[85vh] data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  SIZE_CLASS[size]
                ),
            className
          )}
        >
          {isMobile && (
            <div aria-hidden="true" className="bg-muted mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full" />
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Title row. Give it a `closeLabel` to get the 44 px close button. */
function ModalHeader({
  className,
  closeLabel,
  children,
  ...props
}: React.ComponentProps<"div"> & { closeLabel?: string }) {
  return (
    <div
      data-slot="modal-header"
      className={cn("border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 pt-4 pb-3", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      {closeLabel && (
        <DialogPrimitive.Close
          data-slot="modal-close"
          aria-label={closeLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -me-2 -mt-1 flex size-touch shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px]"
        >
          <XIcon className="size-6" />
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="modal-title"
      className={cn("text-foreground text-lg leading-tight font-bold", className)}
      {...props}
    />
  )
}

function ModalDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="modal-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

/** The scrolling middle. */
function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  )
}

/** The action row, pinned under the body. */
function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("border-border flex shrink-0 flex-col gap-2 border-t px-5 py-4", className)}
      {...props}
    />
  )
}

const ModalClose = DialogPrimitive.Close

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, ModalClose }
