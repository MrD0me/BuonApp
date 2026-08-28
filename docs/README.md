# BuonApp documentation index

This index classifies documentation in `docs/` so contributors and AI agents know which documents describe current runtime behavior, which describe planned designs, and which are historical records.

## Document authority

- **CURRENT**: Primary documentation for current supported behavior, setup, and developer workflows.
- **ACTIVE DESIGN**: Approved architecture currently being implemented. These describe target states that may be partially ahead of current code.
- **FORWARD-LOOKING**: Architecture proposals and plans that do not yet represent runtime contracts.
- **HISTORICAL**: Point-in-time audits, design records, or superseded specifications retained for context. Do not use these to drive new implementation unless an approved task or issue explicitly directs it.

> **Source of truth principle**: Current code and automated tests define what BuonApp does now. Approved task descriptions and GitHub issues define what a specific change is intended to accomplish. Cross-project invariants in `AGENTS.md` and `CURRENT` documentation govern broader constraints.

---

## Documentation catalog

### Current documentation

| Document | Description | Scope |
| --- | --- | --- |
| [API.md](API.md) | Endpoint and WebSocket reference for the local servers: Express API (`:3001`), KDS (`:3002`), and the tableside Server App (`:3003`). | CURRENT |
| [table-management.md](table-management.md) | Table CRUD, the multi-room graphical map, service days with an explicit close ritual, reservations, joined tables, and saved floor plans. | CURRENT |
| [linux.md](linux.md) | Linux package formats (AppImage, deb, rpm, Snap) built from source, FUSE setup, CUPS printing, and system tray behavior. | CURRENT |
| [printers.md](printers.md) | ESC/POS printer configuration, network/USB/OS-queue/WebUSB connection types, kitchen stations, kitchen-ticket layout, code pages, and troubleshooting. | CURRENT |
| [google-drive-setup.md](google-drive-setup.md) | Maintainer setup for the optional Google Drive backup OAuth client. | CURRENT |
| [i18n.md](i18n.md) | Internationalization guide, translation editing, language scaffolding (`npm run i18n:add`), and RTL layout support. | CURRENT |

### Historical records

| Document | Description | Status |
| --- | --- | --- |
| [security-audit-2.7.0.md](security-audit-2.7.0.md) | Security audit report dated 2026-08-04, covering version 2.7.0 — the codebase as it stood upstream, before this fork's changes and the rename. | HISTORICAL |

---

## Other repository assets

- [social-preview.html](social-preview.html): HTML template used to render Open Graph preview card graphics.
- `images/buonapp-pos.webp`: Screenshot of the BuonApp point-of-sale interface used in `README.md`.
