"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { usePosSettingsStore } from "@/store/pos-settings"
import { getLanguageDirection } from "@/lib/i18n"

/** How much of the row fades out on a side that has more behind it. */
const EDGE_FADE_PX = 28

/**
 * Whether the scrolling row has anything left of its left edge, or right of
 * its right edge — in physical sides, because that is where the fade goes.
 *
 * A right-to-left row scrolls into negative numbers, so the distance from the
 * start is the absolute value, and "start" is then the right-hand side.
 */
function useScrollEdges(enabled: boolean, rtl: boolean, items: unknown) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ left: false, right: false })

  React.useEffect(() => {
    const node = ref.current
    if (!enabled || !node) return
    const measure = () => {
      const room = node.scrollWidth - node.clientWidth
      const past = Math.abs(node.scrollLeft)
      // A pixel of slack: fractional layouts never land on exactly 0 or max.
      const fromStart = past > 1
      const toEnd = past < room - 1
      setEdges({ left: rtl ? toEnd : fromStart, right: rtl ? fromStart : toEnd })
    }
    measure()
    node.addEventListener("scroll", measure, { passive: true })
    // The row also stops overflowing when the pane is widened, or when a
    // shorter set of items arrives — a resize watcher catches both.
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      node.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [enabled, rtl, items])

  return { ref, edges }
}

/**
 * One choice among a few, all visible: the rooms of the floor, the filters of
 * the day, the wave a dish goes out in. Radix ToggleGroup in single mode,
 * which gives `aria-pressed` and arrow-key movement for free.
 *
 * A toggle group lets the user press the active item to clear it; here that
 * is never wanted (a floor with no room selected is not a state), so an empty
 * value is swallowed.
 */
export interface SegmentedItem {
  value: string
  label: React.ReactNode
  /** A small number after the label — tables in a room, orders in a filter. */
  count?: number
  icon?: React.ReactNode
  disabled?: boolean
}

interface SegmentedControlProps {
  value: string
  onValueChange: (value: string) => void
  items: SegmentedItem[]
  size?: "md" | "lg"
  /** Items keep their width and the row scrolls sideways instead of squeezing. */
  scrollable?: boolean
  /** Fill the width given, sharing it equally — for a row that owns its line. */
  stretch?: boolean
  "aria-label": string
  className?: string
  dir?: "ltr" | "rtl"
}

function SegmentedControl({
  value, onValueChange, items, size = "md", scrollable = false, stretch = false, className, dir, ...props
}: SegmentedControlProps) {
  const language = usePosSettingsStore((s) => s.language)
  const direction = dir ?? getLanguageDirection(language)
  const { ref, edges } = useScrollEdges(scrollable, direction === "rtl", items)
  // The chosen item, brought back into the strip. A row that scrolls can be
  // drawn with its selection off screen — after a remount, or when the value
  // is set from outside — and then nothing looks selected at all. `nearest`
  // on both axes moves the strip and leaves the page where it is.
  React.useEffect(() => {
    if (!scrollable) return
    ref.current
      ?.querySelector<HTMLElement>('[data-state="on"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [scrollable, value, items, ref])
  // A scrolling row with no scrollbar and no fade is a row that lies: on a
  // phone the categories past the edge are simply not there, and the floor
  // reports them missing. The fade appears only on a side that has something
  // behind it, so a row that fits is left alone.
  const fade = edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? `transparent 0, #000 ${EDGE_FADE_PX}px` : "#000 0"}, ${edges.right ? `#000 calc(100% - ${EDGE_FADE_PX}px), transparent 100%` : "#000 100%"})`
    : undefined
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      type="single"
      value={value}
      onValueChange={(next) => { if (next) onValueChange(next) }}
      dir={direction}
      data-slot="segmented-control"
      aria-label={props["aria-label"]}
      style={fade ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
      className={cn(
        "bg-muted flex gap-1 rounded-xl p-1",
        // By default the row sizes to its content and refuses to be squeezed
        // by a neighbour: a filter reading "Non p…" is a filter nobody can
        // use. `stretch` is for a row that owns its line and should fill it.
        scrollable ? "w-full overflow-x-auto [scrollbar-width:none]"
          : stretch ? "w-full"
          : "w-fit max-w-full shrink-0",
        className
      )}
    >
      {items.map((item) => (
        <ToggleGroupPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          data-slot="segmented-item"
          className={cn(
            "text-muted-foreground focus-visible:ring-ring/50 inline-flex items-center justify-center gap-2 rounded-lg px-4 font-semibold whitespace-nowrap outline-none transition select-none focus-visible:ring-[3px] disabled:opacity-40",
            "data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
            size === "lg" ? "h-touch text-base" : "h-10 text-sm",
            scrollable || !stretch ? "shrink-0" : "min-w-0 flex-1"
          )}
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
          {item.count !== undefined && (
            <span
              className="bg-foreground/10 text-foreground/70 rounded-full px-1.5 py-0.5 text-xs leading-none tabular-nums"
              dir="ltr"
            >
              {item.count}
            </span>
          )}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

export { SegmentedControl }
