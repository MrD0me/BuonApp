# BuonApp agent guide

BuonApp is an open-source, offline-first Electron desktop POS for restaurants with table service, forked from FloCafe. `main/` contains the Electron main process, Express API (`:3001`), standalone KDS server (`:3002`), Server App for tableside handhelds (`:3003`), SQLite database, printing, and background services. `frontend/` is a statically exported Next.js 16 and React 19 application. `tests/` contains backend, integration, and release test suites.

The domains this fork added on top of upstream — service days, rooms and the floor map, reservations, joined tables, saved layouts, kitchen-ticket rounds, the cover charge, and fixed menus — keep their logic in `main/services/` and use `main/routes/` only for authorization and HTTP translation. Do not reintroduce an import cycle between the two.

## Progressive disclosure

Before starting non-trivial work:

1. **Understand task scope:** Read the task and any linked issue/PR, then identify scope and acceptance criteria.
2. **Consult documentation index:** Check [docs/README.md](docs/README.md) to locate relevant `CURRENT` or `ACTIVE DESIGN` documents.
3. **Inspect current code:** Verify active runtime paths and existing patterns.
4. **Identify tests:** Locate existing test coverage in `tests/`.
5. **Plan and execute:** Keep changes focused on the approved task.

For minor typos or isolated one-line edits, formal planning is not required.

## Source of truth

- **Current runtime behavior:** Current code and automated tests define what BuonApp does today.
- **Intended change:** The approved task description, issue, or PR defines what the specific change must achieve.
- **Project invariants:** This document (`AGENTS.md`) and documentation marked `CURRENT` define project-wide boundaries.
- **Active design:** Documents marked `ACTIVE DESIGN` or `FORWARD-LOOKING` in `docs/` describe target architecture and may be ahead of current code.
- **Historical records:** Docs marked `HISTORICAL` provide context only.

If a task or design doc contradicts current code or references files that no longer exist, investigate and report the discrepancy rather than inventing unapproved architecture.

## Repository layout

```text
main/           Electron main process, Express API, SQLite access, and ESC/POS printing
main/routes/    HTTP surface: authorization, request parsing, error translation
main/services/  Domain logic for tables, service days, reservations, and layouts
frontend/src/   Next.js/React renderer, Zustand state, UI components, and translations
tests/          Backend unit, integration, and release test suites
docs/           Documentation, design specifications, and audits (see docs/README.md)
.github/        Issue/PR templates, CODEOWNERS, and CI/CD workflows
```

## Core invariants

1. **Offline-first operation:** Core POS operation (orders, billing, tables and service days, kitchen tickets, printing) must function without internet connectivity. This fork carries no cloud bridge and no usage telemetry — they were removed, along with the settings that armed them (migration v80). The only things that may reach the network are features the owner explicitly configures (Google Drive backup, WhatsApp) and the update check against this fork's own GitHub releases; all of them must fail gracefully when offline. Do not reintroduce an outbound channel to a vendor.
2. **Data safety:** Existing customer data must survive upgrades. Never reset, truncate, or drop user databases as a shortcut for migration design.
3. **Architecture boundaries:** UI language and tenant regional settings are separate, decoupled domains. This fork computes no taxes: prices are what the guest pays, the bill is a preconto, and the fiscal receipt comes from the till beside it. Do not reintroduce a taxation engine, country tax packs, or per-item tax fields.
4. **One order, one bill:** Splitting a check between guests was removed in 5.0.0 (migration v91), columns and all. An order has one bill; who among the party pays what is settled at the till. Paying one bill with several methods, and pulling joined tables apart, are different features and stay. Do not reintroduce per-guest shares of a check.
5. **Business timestamps:** Persisted timestamps follow BuonApp's canonical storage conventions; configured store timezone applies to business-local presentation, day/shift boundaries, and reporting intervals.
6. **Backend authority:** Security-critical and payment calculations remain backend-authoritative.
7. **Reuse before adding:** Reuse existing helpers, utilities, and dependencies before introducing new packages.
8. **Scope discipline:** Implement only the approved task. Do not make opportunistic refactors across unrelated files.

## Working conventions & safety rules

- **Secrets & data protection:** Never commit credentials, API keys, `.env` files, customer data, backups, internal URLs, or private tokens.
- **Private specs boundary:** Never add the private `specs` repository as a submodule, build dependency, CI dependency, or runtime dependency.
- **Security checks:** Do not bypass platform or OS security checks merely to make a local development binary run.
- **Legacy code check:** Before modifying legacy-looking files, verify they are part of the active build, import, or packaging path (search imports, routes, and `package.json`).
- **Discovered issues:** If you encounter an adjacent bug or potential improvement during a task, note it in your report rather than expanding implementation scope.
- **No unapproved mutations:** Do not create, edit, close, label, or assign GitHub issues or pull requests unless the task specifically instructs issue maintenance. Do not commit, tag, or push without instruction.
- **Dependencies:** Evaluate built-in Node/Electron/browser APIs and existing project packages before proposing new dependencies.

## Commands

BuonApp requires **Node.js 22 or later**.

```sh
npm run dev              # Full Electron app (cleans ports, builds frontend & backend)
node dev-server.js       # Backend only (API :3001, KDS :3002, Server App :3003)
npm run dev:frontend     # Frontend browser development server
npm run lint             # Lint backend (main/) and frontend (frontend/)
npm run build            # Compile TypeScript backend to dist/
npm run build:frontend   # Build and export static Next.js frontend
npm test                 # Run standard test suite
npm run test:url-allowlist
npm run audit:db
npm run i18n:check
npm run i18n:add -- de   # scaffold an approved new language locally
```

## Verification

Select checks that cover the changed subsystem:

| Change type | Minimum verification |
| --- | --- |
| Documentation / templates | `git diff --check` and relative markdown link verification |
| Frontend | `npm run lint` and `npm run build:frontend` |
| Translations / i18n | `npm run i18n:check` |
| Backend / API | `npm run lint`, `npm run build`, and focused test suites |
| Database migrations | Fresh database test and upgrade-path migration test |
| Tables / service days / reservations | `npm run test:table-crud`, `test:rooms-map`, `test:reservations`, `test:reservation-sheet`, `test:table-merge-layouts`, `test:service-days` |
| Cover charge / fixed menus | `npm run test:cover-charge`, `test:fixed-menu`, plus `test:printer` when the printed line changes |
| Printing / kitchen tickets | `npm run test:printer`, `test:kot-batch`, `test:receipt-printing` |
| Auth / Security | Relevant focused test suite plus broader integration tests |
| Packaging / Releases | Target platform build commands and release checks |

Run `npm test` when a full validation pass is requested, before releases, or when changes touch multiple core subsystems; every suite named in the table above is part of that chain. The Playwright end-to-end specs are not: they run from `frontend/` with `npx playwright test`, and in CI only on pull requests.
