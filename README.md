<div align="center">
  <h1>BuonApp</h1>
  <p><strong>Free, open-source, offline-first point of sale for cafés, restaurants, and small kitchens.</strong></p>
  <p>
    <a href="https://github.com/MrD0me/BuonApp">Website</a> ·
    <a href="https://github.com/MrD0me/BuonApp/releases">Download</a> ·
    <a href="https://github.com/MrD0me/BuonApp/issues">Report a bug</a>
  </p>
  <p>
    <a href="https://github.com/MrD0me/BuonApp/releases"><img src="https://img.shields.io/github/v/release/MrD0me/BuonApp?label=latest%20release" alt="Latest release"></a>
    <a href="https://github.com/MrD0me/BuonApp/releases"><img src="https://img.shields.io/github/downloads/MrD0me/BuonApp/total?label=release%20downloads" alt="Total release downloads"></a>
    <a href="https://github.com/MrD0me/BuonApp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/MrD0me/BuonApp" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Windows, macOS, and Linux">
    <a href="https://github.com/MrD0me/BuonApp/actions/workflows/ci.yml"><img src="https://github.com/MrD0me/BuonApp/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  </p>
</div>

<p align="center">
  <img src="docs/images/buonapp-pos.webp" alt="BuonApp POS screen showing product selection and an active dine-in order" width="100%">
</p>

BuonApp runs directly on the business's own computer. Orders, customers, receipts, and backups are stored in a local SQLite database, allowing counter service and kitchen displays to continue operating without an internet connection. No hosted or cloud account is required for core POS operation. Optional integrations—such as Google Drive backup and WhatsApp bill delivery—can be enabled when needed.

## Get BuonApp

Download the latest installer from [GitHub Releases](https://github.com/MrD0me/BuonApp/releases).

Releases include Windows installers, macOS DMGs, and Linux AppImage, `.deb`, and `.rpm` packages. On Linux:

```sh
# AppImage
chmod +x buonapp-*.AppImage
./buonapp-*.AppImage

# Debian or Ubuntu
sudo apt install ./buonapp-*.deb
```

For Linux package choices, updates, FUSE setup, printing permissions, and tray behavior, see [Linux installation and support](docs/linux.md).

### System requirements

| Requirement | Minimum |
| --- | --- |
| Operating system | Windows 10+, macOS 12+, or a current supported Linux distribution |
| Memory | 4 GB RAM |
| Storage | 500 MB free space, plus room for local backups |

Node.js is only required to develop BuonApp, not to run a packaged release.

## Highlights

- **Order workflows:** Counter, dine-in, takeaway, and delivery orders with table management and held orders.
- **Modifiers & pricing:** Item modifiers, add-on groups, discounts, and customer loyalty points.
- **Receipt printing:** ESC/POS thermal printing over USB, local network (TCP), and OS-managed print queues, with WebUSB supported in compatible browsers (58 mm and 80 mm paper support).
- **Kitchen operations:** Standalone Kitchen Display System (KDS) server and category-based kitchen station routing.
- **Catalog management:** Product images, barcode scanning, and CSV menu import/export.
- **Administration:** Role-based staff accounts (Owner, Manager, Cashier, Chef), sales analytics, and audit logs.
- **Data protection:** Local SQLite database with automated pre-migration backups, manual restore tools, and optional Google Drive backup.

## Project status

BuonApp is actively developed and already used in real deployments. Core customer data and upgrade safety are treated carefully, including explicit database migrations and recovery mechanisms. Some internal and extension-facing architecture is still evolving, so implementation details and internal contracts may change as the project matures.

## Offline-first by design

Core POS operation and local data are offline-first. Order entry, billing, KDS coordination, and receipt printing do not depend on internet access or external cloud services.

- **Data location:** The SQLite database and local backups reside in the operating system user-data directory, separate from installed application binaries. Standard in-place application updates do not remove them. As a best practice, create a manual backup before reinstalling, moving to a new machine, or changing distribution channels.
- **Pre-migration backups:** BuonApp automatically creates a timestamped database backup before running schema migrations.
- **Optional network features:** Services such as Google Drive backups and WhatsApp bill delivery communicate over the network only when explicitly configured and enabled by the store owner.

## Languages and regional support

BuonApp includes UI translations for:

- English
- Spanish
- Brazilian Portuguese
- Persian (Farsi), including RTL support

UI language is independent of store country and regional settings, and tax calculation rules remain a separate concern. For details on contributing translations or adding languages, see the [Internationalization and translation guide](docs/i18n.md).

## Tax support

BuonApp includes a generic calculation engine and supports signed, versioned country tax packs for regional rules, tax categories, and rounding policies. Country coverage is expanding through the catalog, and availability varies. Operators can also configure manual tax rules and rates locally.

> **Notice:** BuonApp is software, not legal or tax advice. Tax packs and configuration tools do not by themselves certify compliance with local regulations. Operators remain responsible for verifying the requirements that apply to their business.

For pack authoring, validation, and schema details, see the [Tax packs developer guide](docs/tax-packs.md).

## Development

Setting up a local development environment requires Node.js 22 or later:

```sh
git clone https://github.com/MrD0me/BuonApp.git
cd BuonApp
npm install
npm run dev
```

`npm run dev` builds the frontend and backend, then launches Electron.

### Architecture

```text
Electron main process
├── Express API and WebSocket server       :3001
├── Standalone kitchen-display server      :3002
└── SQLite database, migrations, and printing
                 ↕ HTTP and WebSocket
Next.js renderer
└── React UI and Zustand client state
```

For detailed developer workflows, coding standards, branch conventions, and testing procedures, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Contributions are welcome. Please check [CONTRIBUTING.md](CONTRIBUTING.md) before starting work:

- **Small bug fixes, documentation improvements, and focused tests** can be started freely.
- **New features, database schema changes, and architectural refactors** require maintainer discussion and approval before implementation.

If BuonApp is useful to you, consider starring the repository.

## Help and documentation

- **Documentation index:** [docs/README.md](docs/README.md)
- **Printer guide & troubleshooting:** [docs/printers.md](docs/printers.md)
- **Linux setup & support:** [docs/linux.md](docs/linux.md)
- **Internationalization & translations:** [docs/i18n.md](docs/i18n.md)
- **Google Drive backup setup:** [docs/google-drive-setup.md](docs/google-drive-setup.md)
- **Bug reports & feature proposals:** [GitHub Issues](https://github.com/MrD0me/BuonApp/issues)
- **General questions & ideas:** [GitHub Discussions](https://github.com/MrD0me/BuonApp/discussions)

## License

BuonApp is open-source software licensed under the [MIT License](LICENSE).
