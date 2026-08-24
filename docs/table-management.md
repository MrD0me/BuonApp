# Table management design

**Status:** ACTIVE DESIGN. Phase 1 is implemented; phases 2-4 are approved but not yet built.

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
(rect/round), `width`, `height`, `rotation`, and `notes`; `position_x`/`position_y` finally get used.
Phase 4 adds `merged_into` for joining tables.

`is_active` and the deactivate/reactivate routes are retained for backward compatibility and for
databases that already hold deactivated rows, but real deletion is the primary action in the UI.

### `service_days` (new, phase 3)

The business-day session: `id`, `business_date`, `status` (`open`/`closed`), `opened_at`,
`opened_by`, `closed_at`, `closed_by`, `notes`, `summary` (JSON of frozen totals), and
`layout_snapshot` (JSON of rooms and tables as they were that day, so a past day renders with its
real map even after the tables are gone). A partial unique index enforces at most one open day.

`orders.service_day_id` and `bills.service_day_id` are stamped at creation, making "the orders of
12 August" an exact query rather than a guessed time range.

**Scope note:** the owner explicitly does not want cross-day aggregate reporting. Per-day summaries
only — no trends, comparisons, or time series.

### `reservations` (new, phase 4)

Replaces the three fields that were being bolted onto the table: `service_day_id`, `table_id`,
`name`, `guests`, `time` (optional), `phone` (optional), `notes`, `status`. Name and guest count are
the operationally required fields; time and phone are stored for completeness but never required.

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

## Phases

| Phase | Content |
| --- | --- |
| 1 | Full table CRUD: edit, real deletion, label snapshot on orders — **done** (migration v73, `tests/table-crud.test.ts`) |
| 2 | Rooms as entities, graphical map, service/edit modes |
| 3 | Service days: open/close, order stamping, closing report, day history |
| 4 | Reservations, table merging, layout templates |

Phases 1 and 3 are coupled: "wipe the map at close" needs both. Phase 2 is independent.
