# Contributing to BuonApp

BuonApp welcomes outside contributions from developers, designers, operators, and translators.

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Contribution philosophy

BuonApp is an actively developed, offline-first desktop POS used in real deployments. While core business operations and data safety are stable, internal and extension architecture continues to evolve.

> **An open issue is not automatic approval of a proposed implementation.**

Issues capture bugs, use cases, operator feedback, and design proposals. Before investing substantial effort into writing code, make sure the task's scope and architectural direction are agreed upon.

### What you can start freely

You do not need prior maintainer assignment or formal approval to start working on:

- Small, isolated bug fixes
- Documentation corrections and clarifications
- Focused test additions
- Narrowly scoped issues whose implementation direction is already clear

If you plan to work on an existing issue, leave a short comment to let others know and avoid duplicated effort. Trivial, isolated fixes do not require creating a tracking issue beforehand.

### What requires maintainer approval first

Do not open implementation PRs for the following areas until maintainers have discussed and approved the proposed direction:

- New product features or major workflow changes
- Architectural changes and new public/extensibility contracts
- Database schema changes and migration designs
- Authentication, authorization, and security architecture
- Table, service-day, and reservation semantics, which are shaped around one restaurant's way of working
- Plugin execution or plugin security models
- Major internationalization (i18n) architecture, or adding new languages
- Large cross-cutting refactors across multiple subsystems

One direction is settled rather than open for discussion: **BuonApp does not talk to a vendor.** The cloud bridge and the anonymous telemetry were removed in 4.0.0 and will not be reintroduced, in any form. A feature that needs the network has to be one the owner configures and switches on, and it has to fail gracefully when offline.

### What counts as approval

Approval for architectural or feature work is indicated by an **explicit comment from a maintainer** confirming that the approach and scope are ready for implementation.

### Unsolicited large pull requests

Large or architecture-changing PRs opened before the direction has been agreed may be moved back to design discussion, kept in draft while the approach is reviewed, or closed if they commit the project to unapproved architecture.

Discussing substantial changes first prevents contributors from spending days implementing solutions that cannot be merged.

### Draft PRs

Draft PRs are welcome for sharing early prototypes, demonstrating bug reproductions, or getting feedback on an agreed direction. However, opening a draft PR does not bypass the requirement to discuss architecture-changing work before implementation.

---

## Set up a development copy

BuonApp requires **Node.js 22 or later** and npm.

```sh
# Clone your fork
git clone https://github.com/YOUR-USERNAME/BuonApp.git
cd BuonApp

# Install dependencies
npm install

# Run the full desktop application
npm run dev
```

### Development commands

```sh
npm run dev              # Build frontend & backend, launch Electron
node dev-server.js       # Backend only (API :3001, KDS :3002, Server App :3003)
npm run dev:frontend     # Frontend development server in browser
npm run lint             # Lint backend and frontend
npm run build            # Compile TypeScript backend to dist/
npm run build:frontend   # Export static Next.js frontend
npm test                 # Run default test suite
```

---

## Making a change

### Branch naming & commit conventions

Create a branch from `main` with a descriptive prefix:

- `fix/` — Bug fixes
- `feat/` — Approved features
- `docs/` — Documentation updates
- `test/` — Test additions or improvements
- `refactor/` — Code refactoring within approved scope
- `chore/` — Maintenance tasks

Use clear commit messages. Conventional Commit formatting (e.g., `fix(printer): handle USB disconnect`) is encouraged.

### Scope discipline

- **Keep PRs focused:** Do not bundle unrelated cleanup, formatting overhauls, dependency updates, or opportunistic refactors into the same pull request.
- **Discovered problems:** If you find an adjacent bug or improvement while working on a task, report it separately rather than expanding the scope of your current PR.
- **PR size:** Split large features into smaller, independently reviewable PRs where practical.

### Code style and patterns

- **Backend (`main/`):** TypeScript with strict types, Express route handlers in `main/routes/`, SQLite access via `better-sqlite3`.
- **Frontend (`frontend/src/`):** Next.js 16, React 19, Tailwind CSS, shadcn/ui components, and Zustand for shared client state.
- **Formatting:** Two spaces, single quotes, ESLint compliance (`npm run lint`).

---

## AI-assisted contributions

AI coding assistants and tools are welcome. BuonApp itself utilizes AI-assisted engineering workflows.

- **Contributor responsibility:** Contributors remain fully responsible for understanding, explaining, testing, and maintaining everything they submit.
- **Low-quality submissions:** Bulk-generated, speculative, issue-farming, or low-understanding PRs may be closed regardless of whether they were written by a human or an AI tool.
- **Architectural discipline:** AI assistants should help implement approved designs, not silently invent unreviewed project architecture in pull requests.

---

## Check your work & verification

Before opening a pull request, run checks appropriate to the affected subsystem:

- **Frontend changes:** Run `npm run lint` and `npm run build:frontend`.
- **Translation / i18n changes:** Run `npm run i18n:check`.
- **Backend changes:** Run `npm run lint`, `npm run build`, and relevant focused test suites (e.g., `npm run test:printer`, `npm run test:table-crud`).
- **Behavior changes:** Add or update focused tests demonstrating the fix or feature.
- **Cross-cutting or release-sensitive work:** Run the full `npm test` suite.

### Additional review for high-risk areas

Changes touching database migrations, customer data handling, authentication, payment or bill totals, or plugin boundaries receive deeper maintainer scrutiny and require thorough automated test verification.

---

## Database and customer-data safety

BuonApp runs on real business data that must survive software upgrades.

- **Versioned migrations:** Every schema modification must use a new integer migration version via SQLite's `PRAGMA user_version` in `main/db.ts`.
- **Destructive changes:** Destructive schema modifications require explicit maintainer approval, a documented data-preservation strategy, a tested upgrade path, and an appropriate recovery/rollback plan.
- **Verification:** Database changes must be verified against both a fresh database installation and an upgraded database migrated from the latest released schema. For high-risk migrations affecting long-lived data, test against representative older database snapshots.
- **No data wipes:** Never reset or purge database contents as a shortcut for migration design.

---

## Translations and i18n

BuonApp currently provides translations for English (`en`), Italian (`it`), Spanish (`es`), Brazilian Portuguese (`pt`), and Persian (`fa`, including RTL support).

Printed output is a narrower set: receipts, bills, and kitchen tickets render their labels in English or Italian and fall back to English for the other languages, rather than printing a half-translated document. Adding a printed language means adding its entry to `RECEIPT_LABELS` in `main/printers/thermal.ts`, not just a message file.

- **Existing languages:** Narrowly scoped fixes and improvements to existing translation strings are always welcome. Verify changes with `npm run i18n:check`.
- **New languages:** Adding an entirely new language needs coordination through an issue first, since every new locale has to hold full key parity with English.
- **Local scaffolding:** Once a new language is approved, run `npm run i18n:add -- de` (using the lowercase two- or three-letter code) to copy the English schema without overwriting an existing file. Add the generated language entry to `frontend/src/lib/i18n/languages.ts`, translate the copied leaves while preserving ICU placeholders/tags, then run `npm run i18n:check`.

The validation command is fully offline and checks registry/file consistency, exact English key parity, string and ICU validity, placeholder/tag parity, Persian fallback safeguards, and frontend translation-key safety.

For complete authoring, scaffolding, RTL support, and verification instructions, see the [Internationalization and translation guide](docs/i18n.md).

---

## Opening a pull request

1. Fill out the [.github/pull_request_template.md](.github/pull_request_template.md). Substantive PRs should reference their approved issue or discussion; trivial isolated fixes do not require an issue.
2. State the exact verification commands executed and summarize results.
3. Note any data migration, offline/network impact, or UI changes (include screenshots for visual adjustments).

---

## Getting help

- **Operator & general questions:** [GitHub Issues](https://github.com/MrD0me/BuonApp/issues), using the workflow-feedback template for anything about real service flows
- **Bug reports & feature requests:** [GitHub Issues](https://github.com/MrD0me/BuonApp/issues)
- **Security vulnerabilities:** Report privately per [SECURITY.md](SECURITY.md) (do not open public issues)
