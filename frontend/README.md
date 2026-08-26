# BuonApp UI

**Frontend for BuonApp POS** — a Next.js 16 + React 19 application with Tailwind CSS v4 and shadcn/ui components.

BuonApp UI is the user interface for the BuonApp point-of-sale system. It runs as a static export inside Electron and talks to the local Express backend (`:3001`). The same export also serves the standalone Kitchen Display (`:3002`) and the tableside Server App for handhelds (`:3003`).

## Pages

### POS
- Fast order entry with product search, categories, and a cart
- Dine-in, counter, takeaway, and delivery order types
- Held orders shared across devices
- Per-item and per-order discounts, with manager PIN overrides for voids
- Optional split checks at table checkout

### Tables
- The dining room drawn as a floor map, one tab per room
- Service mode (touch a table to open what it is doing) and edit mode (drag, add, delete)
- Table shape, size, and horizontal/vertical orientation
- Joined tables, saved floor plans, and a strip of reservations still to be placed
- Per-table status colour, covers against capacity, running total, occupied-since, and a badge for courses still to send
- **Send to kitchen** dispatches only the rows that have never been sent

### Reservations
- The day's bookings listed by time, with a single-row entry form
- A booking needs only a name and a head count; table assignment can come later
- Assigning a reservation to a table that is already held swaps the two

### Service days
- The day in progress, the history, and a per-day detail view
- Close the day with its checks, its frozen totals, and its printed report

### Orders
- Bill-style order cards with status tracking, items, and totals
- Filter bar — search by order number, filter by table, type, or status
- Print receipt with a confirmation modal and a print log
- Cancel order with a reason, a free-the-table option, and manager PIN override
- WhatsApp bill sharing
- Loyalty points, when the customer book is enabled

### Kitchen Display (optional)
- Real-time order updates over WebSocket
- Dynamic IP detection for pairing over VPN/mesh networks (Tailscale, ZeroTier, etc.)
- **NEW** badge for items added after the initial order
- Table name always visible
- Status progression: pending → preparing → ready → served

### Other pages
- **Products** — catalog, categories, images, barcodes, CSV import/export
- **Add-on groups** — modifier groups linked to products
- **Customers** — the customer book and loyalty wallet, hidden when switched off
- **Staff** — accounts and roles (Owner, Manager, Cashier, Server, Chef)
- **WhatsApp** — pairing and bill delivery
- **Print test** — printer probe including the accent and code-page check
- **Settings** — store details, printers, kitchen stations, tax, and feature switches

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Icons | Lucide React |
| API Client | Axios |
| Notifications | React Hot Toast |

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. It expects the
backend to be running — from the repository root, `node dev-server.js` starts the
API, the KDS server, and the Server App without Electron.

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build the static export |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── (dashboard)/        # Authenticated app shell
│   │   ├── pos/            # Point of Sale
│   │   ├── tables/         # Floor map, rooms, joined tables, layouts
│   │   ├── reservations/   # Reservation sheet for the current service day
│   │   ├── service-days/   # Service day in progress, history, and close
│   │   ├── orders/         # Order history and management
│   │   ├── products/       # Catalog management
│   │   ├── addon-groups/   # Modifier groups
│   │   ├── customers/      # Customer book (optional)
│   │   ├── staff/          # Staff accounts and roles
│   │   ├── kds/            # Kitchen Display inside the app
│   │   ├── whatsapp/       # WhatsApp pairing and delivery
│   │   ├── print-test/     # Printer probe
│   │   └── settings/       # App configuration
│   ├── kds-standalone/     # Standalone KDS mode (:3002)
│   ├── server-standalone/  # Standalone Server App, tableside ordering (:3003)
│   ├── customer-display/   # Guest-facing second screen
│   └── setup/              # Initial setup wizard
├── components/             # React components
│   ├── pos/                # POS-specific components
│   ├── tables/             # Floor map and table sheet
│   ├── settings/           # Settings panels
│   └── ui/                 # shadcn/ui base components
├── store/                  # Zustand state stores
│   ├── auth.ts             # Authentication state
│   ├── cart.ts             # Shopping cart state
│   ├── held-orders.ts      # Held/suspended orders
│   └── pos-settings.ts     # POS configuration
├── lib/                    # Utilities
│   ├── api.ts              # Axios API client
│   ├── i18n/               # Language registry, message files, loader
│   ├── printer/            # Browser-side ESC/POS encoding (WebUSB)
│   ├── types.ts            # TypeScript types
│   ├── utils.ts            # Helper functions
│   └── countries.ts        # Country/currency data
├── hooks/                  # Custom React hooks
└── types/                  # Type declarations
```

## API Communication

BuonApp UI talks to the BuonApp backend via Axios:

```typescript
import api from '@/lib/api';

// GET orders
const { data } = await api.get('/orders', { params: { per_page: 50 } });

// PATCH order status
await api.patch(`/orders/${orderId}/status`, { status: 'cancelled' });

// POST print receipt
await api.post(`/bills/${billId}/print`, { print_type: 'receipt' });
```

The endpoints are documented in [docs/API.md](../docs/API.md).

## State Management

Uses Zustand for global state:

- **auth.ts** — User authentication, tenant info, current user
- **cart.ts** — Shopping cart items and totals
- **held-orders.ts** — Suspended/held orders
- **pos-settings.ts** — POS configuration from backend

## Integration with BuonApp

BuonApp UI lives in the BuonApp repository and is built from the repository root:

```bash
npm run build:frontend  # Builds the static export to frontend/out/
```

The static export is served by the Electron main process.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the repository root.

## License

MIT License — see [LICENSE](../LICENSE).
