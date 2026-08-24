# Table management design

**Status:** CURRENT. All four phases are implemented.

FloCafe's table model was built for a fixed dining room: tables are created once and can only be
soft-deactivated. This design reworks it for a restaurant whose room layout, table count, and seat
counts change every single day, and adds an explicit business-day cycle so a day's orders can be
reviewed after the fact.

## Problem statement

1. Tables cannot be edited from the UI and cannot be deleted at all.
2. The dining room is drawn as a card grid, not as a map, and multiple rooms are not modelled.
3. Reservations are half-wired and do not persist.
4. There is no notion of a business day, so "today's orders" is a UTC date range.

## Baseline before phase 1

What the code did when this design was written. Phase 1 has since changed the first two
points and the last one; the rest still stands.


- `PUT /tables/:id` exists in `main/routes/tables.ts` and accepts number, capacity, floor, section,
  and position, but no frontend surface calls it. Only `PATCH /:id/status`, `deactivate`, and
  `reactivate` are wired in `frontend/src/app/(dashboard)/tables/page.tsx`.
- No `DELETE` route exists. Migration v20 (`add_tables_is_active`) added soft deactivation
  specifically because hard deletes had been orphaning `orders.table_id` and `held_orders.table_id`.
- The reserve modal posts `reservation_customer_id`/`_name`/`_phone` to `PATCH /:id/status`. The
  handler reads only `status`, and those columns do not exist in the schema, so reservation details
  are silently dropped while the frontend still tries to render them.
- `tables.position_x` / `position_y` already exist and are never populated. `floor` and `section` are
  free text, not entities.
- Reports bucket days with `utcTodayDate()` / `utcDayBounds()` (`main/db.ts`). For Europe/Rome this
  cuts the day at 02:00 local during DST, which misfiles orders taken after midnight.
- All table writes are `requireRole('owner', 'manager')`.

## Key decision: denormalized table labels

`orders.table_id` is a live foreign key to `tables.id`, which is what makes tables undeletable
without losing history. Instead of keeping tables alive forever, orders carry their own snapshot of
where they were served:

- `orders.table_label` — e.g. `"Tavolo 12"`, written at order creation.
- `orders.room_label` — e.g. `"Sala Interna"`, written at order creation.

History becomes self-contained. `table_id` stays as an optional live link and is set to `NULL` when
the table is deleted. This unlocks genuine deletion, which every other part of this design depends
on.

## Data model

### `rooms` (new, phase 2)

Real entity replacing the free-text `floor`: `id`, `name`, `sort_order`, `width`, `height`,
`is_active`. Migration creates one room per distinct existing `floor` value and backfills
`tables.room_id`.

### `tables` (extended)

Stays the same table, becomes fully mutable and deletable. Phase 2 adds `room_id`, `shape`
(rect/round), `width` and `height`; `position_x`/`position_y` finally get used. Phase 4 adds
`merged_into` for joining tables.

**Amendment (phase 2):** the planned `rotation` and `notes` columns are not there.

Free-angle rotation costs a fiddly editor handle, and the thing it was actually wanted for — a table
standing on its end rather than lying across — needs no rotation at all: it is the same rectangle
with its width and height swapped. The form offers that as a horizontal/vertical toggle, and the
orientation is read back out of the stored size (taller than wide means vertical) rather than
duplicated in a column that could disagree with it. Angles that are not multiples of 90 degrees
remain unsupported.

`notes` had no reader, and a column nothing writes is worse than one added when something does.

`is_active` and the deactivate/reactivate routes are retained for backward compatibility and for
databases that already hold deactivated rows, but real deletion is the primary action in the UI.

### `service_days` (new, phase 3)

The business-day session: `id`, `business_date`, `status` (`open`/`closed`), `opened_at`,
`opened_by`, `closed_at`, `closed_by`, `notes`, `summary` (JSON of frozen totals), and
`layout_snapshot` (JSON of rooms and tables as they were that day, so a past day renders with its
real map even after the tables are gone). A partial unique index enforces at most one open day.

`orders.service_day_id` is stamped at creation, making "the orders of 12 August" an exact query
rather than a guessed time range.

**Amendment (phase 3):** bills are *not* stamped. The plan called for `bills.service_day_id`, but a
bill always belongs to an order, and the close refuses to run while any bill is unpaid — so joining
through `orders` is both exact and impossible to desynchronise, where a second stamped column would
have to be kept in step at two insert sites. `idx_orders_service_day` makes the join cheap.

**Scope note:** the owner explicitly does not want cross-day aggregate reporting. Per-day summaries
only — no trends, comparisons, or time series.

### `reservations` (new, phase 4)

Replaces the three fields that were being bolted onto the table: `service_day_id`, `table_id`,
`customer_id`, `name`, `guests`, `booked_time` (optional), `phone` (optional), `notes`, `status`.
Name and guest count are the operationally required fields; time and phone are stored when given and
never demanded.

**Scope (decided 2026-08-25):** bookings are for the service being run right now, not for future
dates. That falls out of the rest of the design rather than being a shortcut — the room is rebuilt
daily and its tables really are deleted, so "table 12 on Saturday" names something that will not
exist until Saturday's map is built. A booking therefore points at a table that already exists.

`status` moves `booked` → `seated` when an order lands on the table, `cancelled` when the booking is
dropped or the table is freed by hand, and `expired` at close for the parties who never arrived.
`tables.status = 'reserved'` is now what having a booking looks like, not something a caller can
assert: `PATCH /tables/:id/status` refuses it and points at the booking endpoint.

### `table_layouts` (new, phase 4)

Named saved maps (`"sabato sera"`, `"estate esterno"`). Applying a template rewrites the current
tables in one transaction. Without this, rebuilding the map every morning is a daily tax.

## Day close ritual (phase 3)

1. Block if any order is still open or any bill unpaid, listing them so they can be resolved. Owner
   may force, with a recorded reason.
2. Freeze `summary`: takings total, per payment method, order count, covers, discounts, voids, top
   products.
3. Snapshot the layout.
4. Optionally print the closing report on the thermal printer (reuses `main/printers/thermal.ts`).
5. Reset the room: tables back to `available`, expired reservations closed, `held_orders` cleared.
6. Optionally wipe the map — the close dialog asks, because some nights the layout carries over and
   some nights it does not.

On open: start from yesterday's map, from a template, or empty. If an order is placed with no day
open, the day opens automatically using the business date in the tenant timezone — offline-first, no
order is ever blocked because someone forgot to press a button.

## Map (phase 2)

One page, two modes: **Service** (read-only, tap a table to open its order) and **Edit layout**
(drag, resize, add, delete), the latter restricted to owner/manager. Tabs switch rooms.

No new dependency: absolutely-positioned elements with pointer events and grid snapping are enough,
per the "reuse before adding" invariant.

Each table shows name, covers/capacity, status color, elapsed occupancy, running total, and a
"course pending" badge driven by the existing `order_items.kot_batch IS NULL`. Dragging one table
onto another moves the order via the already-existing `POST /tables/:id/move-order`.

## Device boundary

Table writes must come from the central PC only. This is already guaranteed structurally: the waiter
Server App on `:3003` forwards an explicit allowlist of endpoints (`main/server-app.ts`) and exposes
only `GET /tables`. **Do not add table write forwards to that allowlist.** Handhelds read the map and
take orders; they do not change table state, reservations, or layout.

## What phase 1 shipped

- Migration v73 adds `orders.table_label` / `orders.room_label` and backfills them from the tables
  standing at upgrade time.
- Orders stamp both labels at creation; `POST /tables/:id/move-order` carries them to the new table.
- `PUT /tables/:id` sets only the fields the caller actually sent, so an optional field can be
  cleared — the previous `COALESCE(?, col)` form turned every null into a no-op. Renaming a table
  retags its open orders and leaves closed ones on the label they were served under.
- `DELETE /tables/:id` removes the row for real, refusing with 409 and a stable `code`
  (`table_has_open_order`, `table_has_held_cart`) while anything live still points at it.
- `resolveOrderTable()` in `main/routes/tables.ts` is the single place that answers "which table was
  this order served at", preferring the live row and falling back to the snapshot. Order reads and
  bill printing both go through it, so a reprint still names a table that no longer exists.
- The tables page gained edit and delete; deactivate is no longer offered, and reactivate remains
  only for rows that were soft-deactivated before deletion existed.

Covered by `tests/table-crud.test.ts` (`npm run test:table-crud`).

## What phase 3 shipped

- Migration v74 adds `service_days` and `orders.service_day_id`, then backfills: one closed day per
  business date the existing orders already fall on, bucketed in the tenant timezone. Backfilled
  days carry no frozen summary, so their totals are computed on read — exact, for data that can no
  longer change. The backfill has only timestamps to work from, so an order taken after midnight
  lands on the next calendar date rather than with the service it belonged to; only days opened
  going forward get that right. `tests/service-days.test.ts` pins this.
- A partial unique index on `status = 'open'` is the authority on "one day at a time".
- Placing an order opens a day if none is running (`getOrOpenServiceDay`). An offline-first till
  must never refuse an order because nobody pressed a button that morning.
- `main/services/service-day.ts` owns the domain: blockers, summary, close, reopen. The HTTP layer
  in `main/routes/service-days.ts` only authorizes and translates errors.
- The close freezes the summary *before* resetting anything, so the numbers describe the day as it
  was served rather than as the reset leaves it. It then clears held carts, frees the tables, and
  optionally deletes them — reusing `tableDeletionBlocker()`/`deleteTableRow()` from phase 1, so the
  wipe cannot strand history any more than a single delete can.
- Force-closing is owner-only, requires a reason, records it in the day's notes, and leaves open
  orders and their tables in place.
- Reopening drops the frozen summary on purpose: the day is live again, so its totals go back to
  being computed.
- `formatServiceDayReport()` / `printServiceDayReport()` in `main/printers/thermal.ts` print the
  paper closing report, with en/it labels following the same policy as receipts and kitchen tickets.
  The close dialog offers it by default; a printer that is off never turns a completed close into a
  failure.
- A `/service-days` page shows the running day with live totals and blockers, the day history, and
  a per-day detail with orders, payment split and best sellers.

Covered by `tests/service-days.test.ts` (`npm run test:service-days`).

**Still open:** reports elsewhere in the app (`main/routes/reports.ts`, the dashboard) continue to
bucket by UTC day. Service days fix the *filing* of orders, not those legacy report queries; moving
them over is a follow-up, and the owner has said aggregate reporting is not wanted anyway.

## What phase 2 shipped

- Migration v75 adds `rooms` plus `room_id`, `shape`, `width` and `height` on `tables`. It promotes
  each distinct `floor` value into a real room, gives tables with no floor a placeholder `Main room`,
  and lays every table out on a grid — nothing had ever written `position_x`/`position_y`, so without
  that pass the first map would open with every table stacked at the origin.
- `main/lib/table-geometry.ts` holds the shared geometry (default sizes from seat count, the grid
  placer) so the migration and the routes cannot disagree about what a table looks like.
- `GET /rooms` returns the whole floor in three queries: `hydrateTables()` batches each table's live
  order and customer, replacing a per-table lookup that the map would have multiplied by every table
  on screen.
- `POST /tables` puts a new table in a room and scans for the first free spot, so it never lands on
  top of another one. Setup's seeded sample tables go through the same path.
- Order labels now read the room name rather than the legacy `floor`, and moving a table to another
  room retags its open orders.
- The tables page became the map: room tabs, a service mode where a tap opens what the table is
  doing, and an edit mode where tables are dragged, added and removed. Rooms are laid out in abstract
  units and scaled to the available width, so the same map reads on the central PC and on a tablet.
- Each table shows status colour, covers against capacity, running total, elapsed occupancy, and a
  badge for courses still to send — driven by the same `order_items.kot_batch IS NULL` the kitchen
  ticket uses.

Covered by `tests/rooms-map.test.ts` (`npm run test:rooms-map`) and a dine-in seeding scenario in
`tests/first-run-setup.test.ts`.

**Found by running it, not by the tests:** setup seeded sample tables straight into `tables`, so a
brand-new dine-in install opened on a floor plan of tables belonging to no room; the map measured
itself only through a `ResizeObserver`, which left the first paint unscaled; and a quick drag whose
move and release landed in the same frame was dropped, because the landing position was read back
from React state that had not updated yet. All three are fixed and pinned.

**Still open:** tables cannot be resized by dragging a handle — size comes from presets, and
orientation from the horizontal/vertical toggle. `section` survives as a free-text field and has no
role in the map.

## What phase 4 shipped

**Reservations** (migration v76). The reserve dialog had been posting
`reservation_customer_id`/`_name`/`_phone` into columns that never existed, against a handler that
read only `status` — so "reserved" was a colour and nothing else, and the POS read those fields back
as `undefined`. That whole path is gone. A booking is now a row with a name, a head count, and
optionally a time, a phone, a note and a link to a customer already in the book. `POST
/tables/:id/reserve` books, re-posting corrects, `DELETE` cancels, an order seats it, and the day
close expires whoever did not turn up.

**Joining tables** (migration v77). `tables.merged_into` points a folded table at the one leading its
group. Deliberately one level deep: a member can never itself lead, so there are no chains to walk
and splitting is always one step. The leader keeps the order — `POST /orders` refuses a table that
has been folded in and names the leader to use instead. Joining is refused for a table that is
working, holding a cart, booked, or already in a group, and the refusal names the table in the way.
Deleting a leader releases its members rather than stranding them.

**Saved floor plans** (migration v78). `table_layouts` stores rooms and tables under a name.
Applying one rebuilds the floor in a single transaction, tearing the current tables down through the
same safe path a single delete takes — so history keeps its labels — and is refused while any table
is still working. Plans store names rather than ids, which is what lets one survive the map being
wiped. That is the point: it is the answer to the daily tax the close ritual creates.

**Structural:** the table lifecycle helpers moved from `main/routes/tables.ts` to
`main/services/tables.ts`. Reservations needed the service day and the day close needed table
deletion, which had the route and the service importing each other in a circle. Services now hold
the domain and routes only speak HTTP; there are no import cycles left in `main/`.

Covered by `tests/reservations.test.ts` and `tests/table-merge-layouts.test.ts`.

**Still open:** reserving and joining are owner/manager, the same as every other table write. A
cashier taking a booking at the till cannot, and widening that is a decision rather than an
oversight. There is no booking agenda, by design.

## Phases

| Phase | Content |
| --- | --- |
| 1 | Full table CRUD: edit, real deletion, label snapshot on orders — **done** (migration v73, `tests/table-crud.test.ts`) |
| 2 | Rooms as entities, graphical map, service/edit modes — **done** (migration v75, `tests/rooms-map.test.ts`) |
| 3 | Service days: open/close, order stamping, closing report, day history — **done** (migration v74, `tests/service-days.test.ts`) |
| 4 | Reservations, table merging, layout templates — **done** (migrations v76-v78, `tests/reservations.test.ts`, `tests/table-merge-layouts.test.ts`) |

All four phases are in. What the design set out to fix — a room that cannot be edited, a day that has no boundary, and a floor plan that has to be rebuilt by hand every morning — is done.
