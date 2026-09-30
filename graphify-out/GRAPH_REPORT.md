# Graph Report - BuonApp  (2026-09-30)

## Corpus Check
- 30 files · ~822,582 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5187 nodes · 14250 edges · 195 communities (179 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 329 edges (avg confidence: 0.85)
- Token cost: 293,731 input · 0 output

## Community Hubs (Navigation)
- Script npm del backend
- Sala, Giornata e pannello ordine
- Ordina, sala e pannello ordine
- Componenti UI base
- Moduli e UI condivisa
- Impostazioni, ordini e sconti
- Test riconciliazione conti
- Selettore fuso orario
- Tavoli, prenotazioni e giornata
- Pagina impostazioni
- Import CSV del menu
- Test tavoli, prenotazioni, giornate
- Server, sicurezza e CSP
- Servizio WhatsApp (Baileys)
- PIN master
- KDS nella dashboard
- Backup, ripristino e import DB
- Helper di test condivisi
- Database, backup e ripristino
- Inizializzazione e riparazioni DB
- Rotte ordini e clienti
- Server KDS e WebSocket
- Pagina WhatsApp e tabelle
- Servizio menu fisso
- Test impostazioni, valuta e interruttori KDS
- Config Next e storico ordini
- Idempotenza invio ordine
- Test ciclo di vita ordine
- Salute dello schema DB
- Test autorizzazioni ordini
- Barra di stato e stampante
- Giri di comanda (KOT batch)
- Rotte auth, staff e test autorizzazioni
- Rilevamento stampanti
- Doc comande, palmare e tre server
- Conti, pagamenti e stampa
- Disinstallatore Windows e CI
- Doc sala, tavoli ed endpoint
- Tipi WebUSB
- Test catalogo e spec Playwright
- Encoder preconto frontend
- Test quantità addon
- Import/export menu CSV
- Normalizzazione username
- Test integrità pagamenti
- Dipendenze e engine backend
- Registro lingue i18n
- Script kill-ports
- Server e2e e import da dist
- Server e2e di test
- Sconti e incasso anticipato
- Test clienti e autorizzazioni
- Spegnimento pulito
- Runner test a shard
- Test traduzioni
- Doc menu fisso e sconti
- Spec Playwright RTL
- Servizio Google Drive
- Test errori localizzati
- Paesi, valuta e formati
- Test larghezza carta
- Layout della comanda
- Pacchetto frontend
- Doc lingue, paesi e niente tasse
- Layout app e lingua HTML
- Layout preconto e report giornata
- Test paginazione clienti
- Test RTL delle schermate
- Test backup e ripristino
- Figlio test avvio fallito
- Indice documentazione e contributi
- Pagina prova stampa e dati di test
- Prodotti, immagini e controlli UI
- DevDependencies backend
- API strumenti database
- Rotte categorie
- Test ciclo di spegnimento
- Changelog: palmare e comande
- Dipendenze frontend
- Provider i18n e fuso SSR
- Test rimedi audit i18n
- Processo principale Electron
- Test DB legacy e stampa scontrino
- Profili stampante
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Test varianti in cucina
- Changelog 4.x: sala e prenotazioni
- Config shadcn
- tsconfig frontend
- Allowlist URL e stampa
- Test addon su righe ordine
- Finestra principale e zoom
- KDS standalone
- Invarianti del fork
- Backup Google Drive: frequenza e pulizia
- Dipendenze runtime backend
- Test impostazioni sconti
- Test interruttori KDS e comande
- tsconfig backend
- Stampa web del preconto
- Test backup su Windows
- Test spegnimento e Google Drive
- Test API stampanti
- Ordini sospesi e service worker
- Test paesi e localizzazione
- Tipi receipt-printer-encoder
- Test import DB durante lo spegnimento
- Test stampa conti
- Changelog: radice e release minori
- Verifica runtime Electron
- Messaggio WhatsApp e test locale UI
- Test finestra KDS
- Changelog 6.x: sconti, coperto e prezzi
- DevDependencies frontend
- README frontend: sala e cucina
- Sessione e API del palmare
- Test RTL di KDS, palmare e WhatsApp
- Test letture addon (KDS)
- Script metainfo AppStream
- Test fondamenta RTL
- tsconfig dei test
- Changelog 6.0: menu fisso e coperto
- Servizio stampante frontend
- Test contratto KDS
- Test metodi di pagamento
- Validazione note ordine
- Test aggiunte idempotenti
- Test prezzo di riga
- Pannello preferenze locale
- Rotte gruppi addon
- Config electron-builder
- Build macOS
- Test spegnimento WhatsApp
- Test stampa scontrino
- Screenshot POS (FloCafe)
- Override frontend
- Manifest PWA
- Badge dietetici
- Test servizio e schema WhatsApp
- Build Snap
- Test recupero stato auth
- Test ricerca per telefono
- Doc menu a conteggio e righe compatte
- Cache di avvio
- Build Linux
- Test fedeltà
- Test paginazione conti
- Test coperto
- Social preview (FloCafe)
- KDS legacy renderer
- Errori di login
- Build AppX
- Test chunk delle lingue
- Changelog: chiusura giornata
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- README frontend: cassa e ordini
- Tipi API Electron
- Righe compattate su comanda e conto
- Voce desktop Linux
- Tessere tavolo sulla mappa
- Script frontend
- Audit del database
- Disinstallatore macOS
- Logo frontend
- Azioni menu protette da PIN
- Errori API frontend
- Errori e codici di correlazione
- Avvio dei server autonomi
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Doppione dell'app nei test
- Changelog 4.1: via le tasse
- Marchio BuonApp
- Connessioni stampanti
- Build Windows
- Rubrica clienti opzionale
- Demo storico ordini
- Script verifica runtime
- Pacchetti Linux e installer
- Config PostCSS
- README frontend: stampa
- Script restart
- Note di rilascio MAS
- Script run-test
- Invariante riuso
- Tray di sistema
- SEC-02 sandbox renderer
- SEC-04 copertura scansione

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 169 edges
2. `scripts` - 158 edges
3. `now()` - 140 edges
4. `cn()` - 137 edges
5. `assertEqual()` - 120 edges
6. `initTestDb()` - 120 edges
7. `react` - 108 edges
8. `getResults()` - 106 edges
9. `createApp()` - 105 edges
10. `assert()` - 102 edges

## Surprising Connections (you probably didn't know these)
- `Kitchen stations routing by category` --references--> `KotLabels`  [INFERRED]
  docs/printers.md → main/printers/thermal.ts
- `Booked table tile writes booking name and party/seats (5/6) at every size` --references--> `TableTile()`  [INFERRED]
  CHANGELOG.md → frontend/src/components/tables/RoomMap.tsx
- `BuonApp Does Not Talk to a Vendor` --semantically_similar_to--> `Offline-First Operation Invariant`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → AGENTS.md
- `Tableside Server App for Handhelds (:3003)` --semantically_similar_to--> `Server App tableside handheld`  [INFERRED] [semantically similar]
  README.md → docs/palmare.md
- `Discount settings (/api/settings/discount, discount_methods)` --shares_data_with--> `OrderDiscountModal()`  [INFERRED]
  docs/API.md → frontend/src/components/orders/OrderDiscountModal.tsx

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, docs_i18n_decoupled_language_tenant, agents_one_order_one_bill, agents_no_joined_tables, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **Booked tables legible on the till's 1024x768 map** — docs_table_management_till_screen_fit, docs_table_management_booked_tile_label, docs_table_management_unseated_chips, docs_table_management_service_fit_to_tables, docs_table_management_size_presets [EXTRACTED 1.00]
- **POS Order Entry Flow** — docs_images_buonapp_pos_product_grid, docs_images_buonapp_pos_cart_panel, docs_images_buonapp_pos_order_type_selector, docs_images_buonapp_pos_printer_selector [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Handheld Server App device boundary** — docs_palmare_server_app, docs_palmare_proxy, docs_api_server_app_allowlist, docs_table_management_device_boundary, docs_palmare_no_cash [INFERRED 0.95]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fork removals: taxation, split checks, joined tables, small tables, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off, changelog_joined_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid, booked tiles, legend row)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom, changelog_booked_tile_name_and_party, changelog_unseated_bookings_in_legend_row, changelog_service_map_fits_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **6.5.1 discount window: new total, round figures, removal, per-method switches, carry rule** — changelog_new_total_discount, changelog_round_figure_proposals, changelog_remove_discount, changelog_discount_window, changelog_discount_methods_switches, changelog_order_discount_carry_rule [EXTRACTED 1.00]
- **Order discount given as a new total** — docs_order_flow_and_navigation_discount_new_total, docs_order_flow_and_navigation_discount_methods, docs_order_flow_and_navigation_discount_carry_rule, main_services_discounts_discountfortargettotal, main_services_discounts_enableddiscountmethods, main_services_discounts_carryorderdiscount, frontend_src_components_orders_orderdiscountmodal_orderdiscountmodal [INFERRED 0.85]

## Communities (195 total, 16 thin omitted)

### Community 0 - "Script npm del backend"
Cohesion: 0.01
Nodes (158): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+150 more)

### Community 1 - "Sala, Giornata e pannello ordine"
Cohesion: 0.03
Nodes (114): Touch UI primitives and status colour tokens, Status colors in one place (status-styles.ts), UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Filters, FilterType, OrdersKey, tabLabelKey, PostpaidAttempt (+106 more)

### Community 2 - "Ordina, sala e pannello ordine"
Cohesion: 0.04
Nodes (103): Zustand global state, normalizeBarcode(), POSPage(), Props, FixedMenuPicker(), nextTallyKey(), Props, Tally (+95 more)

### Community 3 - "Componenti UI base"
Cohesion: 0.04
Nodes (88): Collapsed sidebar shows centred icons only, PageToolbar shared page header, Sidebar with 48 px rows, collapse toggle in page header, Props, ALL_NAV_ITEMS, NavItem, NavKey, AddonModal() (+80 more)

### Community 4 - "Moduli e UI condivisa"
Cohesion: 0.06
Nodes (86): OrderPanel split into header/lines/sheet/totals/action bar, AddonGroupsPage(), OrdersPage(), DayDetailModal(), DayDetailModalProps, ServiceDaysPage(), KanbanOrderCard(), Ltr() (+78 more)

### Community 5 - "Impostazioni, ordini e sconti"
Cohesion: 0.03
Nodes (86): areCustomersEnabled(), getSettingValue(), insertOrderItemAddons(), verifyPin(), DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY (+78 more)

### Community 6 - "Test riconciliazione conti"
Cohesion: 0.03
Nodes (88): ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module, outDir (+80 more)

### Community 7 - "Selettore fuso orario"
Cohesion: 0.05
Nodes (73): Staff roles (Owner, Manager, Cashier, Server, Chef), WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), CustomersPage(), WhatsAppConsole() (+65 more)

### Community 8 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.05
Nodes (82): Services/routes split with no import cycle, businessDateToday(), now(), createGridPlacer(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, isTableShape(), ROOM_MARGIN (+74 more)

### Community 9 - "Pagina impostazioni"
Cohesion: 0.05
Nodes (62): BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage(), DISCOUNT_METHOD_ROWS, formatBackupSize() (+54 more)

### Community 10 - "Import CSV del menu"
Cohesion: 0.04
Nodes (66): getDatabase(), getKdsPort(), stopKdsServer(), cleanupExpiredRevocations(), clearRevokedTokens(), getUserAuthStatus(), hashRevokedToken(), invalidateUserAuthCache() (+58 more)

### Community 11 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (71): MIGRATIONS, orderRoutes, roomRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
}, Module (+63 more)

### Community 12 - "Server, sicurezza e CSP"
Cohesion: 0.06
Nodes (61): buildCspHeader(), getDbHealth(), isServerAppEnabled(), upsertSettings(), WHATSAPP_AVAILABLE, API_JSON_BODY_LIMIT, resolveContainedPath(), asyncHandler() (+53 more)

### Community 13 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (69): libphonenumber-js, loadBaileys(), abortable(), abortableDelay(), addToBlocklist(), advanceStatus(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers() (+61 more)

### Community 14 - "PIN master"
Cohesion: 0.06
Nodes (61): deleteBackup(), getSchemaVersionFromBackup(), isManagedBackupFile(), ALLOWED_IPC_KEYS, handle(), isTrustedSender(), maskSetting(), registerIpcHandlers() (+53 more)

### Community 15 - "KDS nella dashboard"
Cohesion: 0.06
Nodes (54): Settings page, KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), ElapsedTime(), formatElapsed(), KdsColumn(), KdsColumnProps (+46 more)

### Community 16 - "Backup, ripristino e import DB"
Cohesion: 0.07
Nodes (62): appendJsonArray(), captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), createBackup(), createBackupUnlocked(), dataOnlyRestore() (+54 more)

### Community 17 - "Helper di test condivisi"
Cohesion: 0.18
Nodes (65): main(), main(), main(), main(), api(), assert(), assertEqual(), assertIncludes() (+57 more)

### Community 18 - "Database, backup e ripristino"
Cohesion: 0.05
Nodes (56): clampFinancialYearStart(), createDatabaseShutdownError(), createDatabaseShutdownTimeoutError(), createMaintenanceAbortError(), createMaintenanceDrainTimeoutError(), DATABASE_MAINTENANCE_ROUTES, databaseIdleWaiters, databaseMaintenanceEndListeners (+48 more)

### Community 19 - "Inizializzazione e riparazioni DB"
Cohesion: 0.05
Nodes (57): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), closeDatabase(), getCurrentSchemaVersion(), initDatabase(), repairSequences(), runMigrations(), runStartupIntegrityCheck() (+49 more)

### Community 20 - "Rotte ordini e clienti"
Cohesion: 0.04
Nodes (54): createSchema(), defaultTableSize(), authRoutes, DEMO_MENUS, DEMO_TABLE_SEATS, DemoLang, demoLanguage(), DemoMenu (+46 more)

### Community 21 - "Server KDS e WebSocket"
Cohesion: 0.11
Nodes (55): attachEffectiveAddons(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive(), isKdsEnabled(), isKdsStationItemAllowed() (+47 more)

### Community 22 - "Pagina WhatsApp e tabelle"
Cohesion: 0.05
Nodes (51): BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS, STATUS_STEPS, StatusStep, StatusStepper() (+43 more)

### Community 23 - "Servizio menu fisso"
Cohesion: 0.06
Nodes (43): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+35 more)

### Community 24 - "Test impostazioni, valuta e interruttori KDS"
Cohesion: 0.04
Nodes (51): settingsRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os, path (+43 more)

### Community 25 - "Config Next e storico ordini"
Cohesion: 0.05
Nodes (44): nextConfig, better-sqlite3, ref_node_fs, ref_node_http, ref_node_net, ref_node_os, ref_node_path, fs (+36 more)

### Community 26 - "Idempotenza invio ordine"
Cohesion: 0.10
Nodes (45): APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, AppendAttemptCompletion, AppendAttemptOptions, appendAttemptsMatch(), AppendAttemptStorage, assertVerifiedCompletionReads(), clearAppendAttempt() (+37 more)

### Community 27 - "Test ciclo di vita ordine"
Cohesion: 0.05
Nodes (44): ref_worker_threads, { assertEqual, assert }, { buildIdealSchemaDb }, db, ins, Module, bcrypt, fs (+36 more)

### Community 28 - "Salute dello schema DB"
Cohesion: 0.06
Nodes (45): buildIdealSchemaDb(), applySafeFixes(), ApplySafeFixesResult, ColumnDef, DbSchemaSnapshot, diffSchemas(), FindingKind, fkSignature() (+37 more)

### Community 29 - "Test autorizzazioni ordini"
Cohesion: 0.05
Nodes (46): getJWTSecret(), seedUser(), bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt (+38 more)

### Community 30 - "Barra di stato e stampante"
Cohesion: 0.07
Nodes (35): StatusBar(), StatusInfo, UpdateBadge(), HistoryOrder, Props, PosKey, STATUS_CONFIG, DropdownMenu() (+27 more)

### Community 31 - "Giri di comanda (KOT batch)"
Cohesion: 0.05
Nodes (44): claimKotBatch(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), { billRoutes }, { fixedMenuRoutes } (+36 more)

### Community 32 - "Rotte auth, staff e test autorizzazioni"
Cohesion: 0.05
Nodes (42): staffRoutes, tests_helpers_test_setup_now, { authRoutes, getJWTSecret }, bcrypt, { clearRevokedTokens, revokeToken, isTokenRevoked }, { initDatabase }, {
  initTestDb,
  createApp,
  assertEqual,
  assert,
  getResults,
  closeDatabase,
  now,
}, jwt (+34 more)

### Community 33 - "Rilevamento stampanti"
Cohesion: 0.09
Nodes (44): annotateProfile(), BRIDGE_CHIP_VENDORS, CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP, DAY_REPORT_LABELS, DayReportLabels, describeCupsQueueProblem() (+36 more)

### Community 34 - "Doc comande, palmare e tre server"
Cohesion: 0.08
Nodes (42): Backend Authority Invariant, POST /api/auth/login (JWT), Idempotency-Key retry-safe append, KDS and Server App login routes (role-gated), order_items.kot_batch round ledger, Login lockout (5 attempts, 15 minutes), PUT /orders/:id/menu-groups/:groupId/courses/:courseId, POST /api/orders (guest_count, service_run, menu_selection) (+34 more)

### Community 35 - "Conti, pagamenti e stampa"
Cohesion: 0.07
Nodes (32): isKotPrintingEnabled(), parseRowJson(), withTxn(), escPosToText(), applyPaymentBatch(), calculateCashback(), canonicalizePaymentRequest(), getOrdersWithItemsForBills() (+24 more)

### Community 36 - "Disinstallatore Windows e CI"
Cohesion: 0.11
Nodes (38): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+30 more)

### Community 37 - "Doc sala, tavoli ed endpoint"
Cohesion: 0.09
Nodes (39): Business Timestamps Invariant, Services/Routes Boundary for Fork Domains, Held orders (/api/held-orders), Reports summary and sales (UTC dates), Reservations endpoints, Rooms endpoints (/api/rooms), Service Days endpoints, Floor plan endpoints (/api/table-layouts) (+31 more)

### Community 38 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 39 - "Test catalogo e spec Playwright"
Cohesion: 0.05
Nodes (36): addonGroupRoutes, categoryRoutes, productRoutes, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path (+28 more)

### Community 40 - "Encoder preconto frontend"
Cohesion: 0.13
Nodes (33): dishIdentity(), billRowIdentity(), menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes (+25 more)

### Community 41 - "Test quantità addon"
Cohesion: 0.07
Nodes (25): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), { addonGroupRoutes } (+17 more)

### Community 42 - "Import/export menu CSV"
Cohesion: 0.06
Nodes (32): main_routes_menu_csv_menucsvroutes, { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, { menuCsvRoutes }, { MIGRATIONS }, Module (+24 more)

### Community 43 - "Normalizzazione username"
Cohesion: 0.10
Nodes (31): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+23 more)

### Community 44 - "Test integrità pagamenti"
Cohesion: 0.06
Nodes (31): billRoutes, seedWalletCredit(), { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer, seedWalletCredit,
  api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes } (+23 more)

### Community 45 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (31): allowScripts, author, email, name, description, engines, node, homepage (+23 more)

### Community 46 - "Registro lingue i18n"
Cohesion: 0.16
Nodes (24): ServerStandalonePage(), resolveInitialLanguage(), getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS (+16 more)

### Community 47 - "Script kill-ports"
Cohesion: 0.10
Nodes (28): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+20 more)

### Community 48 - "Server e2e e import da dist"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 49 - "Server e2e di test"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 50 - "Sconti e incasso anticipato"
Cohesion: 0.11
Nodes (27): PrepaidAttempt, TablesPage(), OrderDiscountModal(), Props, round2(), OrderPanelProps, BUILT_IN_PAYMENT_KEYS, LoyaltySettings (+19 more)

### Community 51 - "Test clienti e autorizzazioni"
Cohesion: 0.08
Nodes (27): customerRoutes, bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken() (+19 more)

### Community 52 - "Spegnimento pulito"
Cohesion: 0.10
Nodes (29): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeWebSocketServer(), createTimeoutError(), drainWebSocketClients(), HttpRequestState (+21 more)

### Community 53 - "Runner test a shard"
Cohesion: 0.08
Nodes (24): ref_node_child_process, fs, index, mine, packageJsonPath, path, pkg, { spawnSync } (+16 more)

### Community 54 - "Test traduzioni"
Cohesion: 0.15
Nodes (29): assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES, findDuplicateKeys() (+21 more)

### Community 55 - "Doc menu fisso e sconti"
Cohesion: 0.10
Nodes (29): Discount after the check changes (percentage recomputed, euros kept), New-total order discount (discount_type total, target_total), Discount settings (/api/settings/discount, discount_methods), Order, item and bill discounts with limits, Order item cancel / void (void_adjustment), Manager/owner PIN override, Order status transition matrix, fixed_menu_course_products per-dish exceptions (v93) (+21 more)

### Community 56 - "Spec Playwright RTL"
Cohesion: 0.11
Nodes (6): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), @playwright/test

### Community 57 - "Servizio Google Drive"
Cohesion: 0.21
Nodes (6): createDriveShutdownError(), getTokenFilePath(), GoogleDriveService, isSecureStorageAvailable(), requestSignal(), waitForDriveOperation()

### Community 58 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 59 - "Paesi, valuta e formati"
Cohesion: 0.16
Nodes (22): generateThermalReceiptHtml(), formatAmount(), formatReceiptDate(), calendarOption(), DEFAULT_COUNTRY_PROFILE, dn, formatCurrencyForTenant(), formatDateForTenant() (+14 more)

### Community 60 - "Test larghezza carta"
Cohesion: 0.11
Nodes (26): classifyPrintFailure(), dispatchPrint(), extractPlatformErrorCode(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus(), getPrintLanguage(), initPrinter() (+18 more)

### Community 61 - "Layout della comanda"
Cohesion: 0.16
Nodes (26): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+18 more)

### Community 62 - "Pacchetto frontend"
Cohesion: 0.08
Nodes (24): eslintConfig, eslint, @types/node, typescript, name, private, version, clsx (+16 more)

### Community 63 - "Doc lingue, paesi e niente tasse"
Cohesion: 0.11
Nodes (25): No Taxation Engine (Architecture Boundary), Printed Output Languages (RECEIPT_LABELS, en/it only), Business settings (timezone, currency, localeOptions), mDNS advertisement buonapp.local, Standalone KDS server (:3002), Country profiles (main/countries.ts, localeOptions), UI language decoupled from tenant regional settings, useSyncServerLanguage for standalone surfaces (+17 more)

### Community 64 - "Layout app e lingua HTML"
Cohesion: 0.14
Nodes (16): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+8 more)

### Community 65 - "Layout preconto e report giornata"
Cohesion: 0.19
Nodes (25): addonRows(), buildEscPos(), capitalize(), coverChargeLabel(), encodeCodePageLine(), financialRows(), formatClassicReceipt(), formatCompactReceipt() (+17 more)

### Community 66 - "Test paginazione clienti"
Cohesion: 0.08
Nodes (23): ref_events, assertGreaterThan(), { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer, seedWalletCredit,
  api, assert, assertEqual, assertGreaterThan,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes } (+15 more)

### Community 67 - "Test RTL delle schermate"
Cohesion: 0.11
Nodes (18): frontend_src_lib_i18n_getlanguagelocale, ALLOWLIST, assert(), frontendRequire, loadComponents(), Module, ROOT, run() (+10 more)

### Community 68 - "Test backup e ripristino"
Cohesion: 0.09
Nodes (16): backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables(), invalidBackup (+8 more)

### Community 69 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 70 - "Indice documentazione e contributi"
Cohesion: 0.13
Nodes (20): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Source of Truth Hierarchy (CURRENT / ACTIVE DESIGN / HISTORICAL), Code of Conduct, Contributor Covenant 2.1, AI-Assisted Contributions Policy (+12 more)

### Community 71 - "Pagina prova stampa e dati di test"
Cohesion: 0.20
Nodes (19): generateKotHtml(), PaperWidth, PrintTestPage(), TestMode, formatDate(), formatTime(), createTestBill(), createTestCustomer() (+11 more)

### Community 72 - "Prodotti, immagini e controlli UI"
Cohesion: 0.10
Nodes (17): CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, ImageUploader(), ImageUploaderProps, Mode (+9 more)

### Community 73 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 74 - "API strumenti database"
Cohesion: 0.10
Nodes (21): { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes }, downloadServer (+13 more)

### Community 75 - "Rotte categorie"
Cohesion: 0.18
Nodes (20): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+12 more)

### Community 76 - "Test ciclo di spegnimento"
Cohesion: 0.21
Nodes (16): closeServerResources(), delay(), getFreeTcpPort(), ProcessDouble, testActiveHttpAndWebSocketDrain(), testCoordinatorOrderingAndIdempotency(), testDatabaseImportShutdownCancellation(), testDir (+8 more)

### Community 77 - "Changelog: palmare e comande"
Cohesion: 0.13
Nodes (21): docs/API.md staff routes corrected, auto_print_kot setting removed, Cloud bridge and telemetry removal (migration v80), Handheld catalogue/settings refresh on tick and visibility, Handheld Ordering screen as a list, Handheld / Server App (:3003), Handhelds sidebar entry with join QR, Kitchen ticket has one road (backend only) (+13 more)

### Community 78 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 79 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (18): getDefaultTimeZone(), handleI18nError(), I18nProvider(), assert(), buildHtmlDocument(), frontendRequire, { I18nProvider, handleI18nError, getDefaultTimeZone }, { IntlProvider, useFormatter, useTranslations } (+10 more)

### Community 80 - "Test rimedi audit i18n"
Cohesion: 0.11
Nodes (16): Locale, getCachedMessages(), inFlightPromises, messageCache, Messages, AppConfig, Messages, use-intl (+8 more)

### Community 81 - "Processo principale Electron"
Cohesion: 0.14
Nodes (19): beginDatabaseShutdown(), checkForUpdates(), cleanupCoordinator, createMenu(), createTray(), initialize(), logPath, { runCleanup, isShutdownRequested, shutdownSignal } (+11 more)

### Community 82 - "Test DB legacy e stampa scontrino"
Cohesion: 0.17
Nodes (20): captureUserSecurityState(), isNativeAbiMismatch(), {
  assert,
  assertEqual,
  getResults,
  createApp,
  seedOwnerUser,
  isNativeAbiMismatch,
}, backend, checkMigration(), checkRestoreMerge(), checkRule(), checkStaffApi() (+12 more)

### Community 83 - "Profili stampante"
Cohesion: 0.10
Nodes (14): getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile, buildTestPage() (+6 more)

### Community 84 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 85 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 86 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 87 - "Test varianti in cucina"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 88 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.22
Nodes (20): Booked table tile writes booking name and party/seats (5/6) at every size, Change table / Take off this table on a booked table's card, Back to the floor from the booking sheet, New order starts from the table's covers, Customer book switch customers_enabled (migration v79), Floor map with rooms (migration v75), Joined tables (migration v77, merged_into; removed in v97), Release 4.0.0 - first BuonApp fork release (+12 more)

### Community 89 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 90 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 91 - "Allowlist URL e stampa"
Cohesion: 0.16
Nodes (16): isAllowedLocalWindowUrl(), isSafeExternalUrl(), originFor(), assert(), express, failures, { initDatabase, getDatabase, closeDatabase, now }, { isAllowedLocalWindowUrl, isSafeExternalUrl } (+8 more)

### Community 92 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 93 - "Finestra principale e zoom"
Cohesion: 0.20
Nodes (19): Ordering product grid columns from its own container, Window zoom lowered on small screens (90% on till, min 75%), Window sized to display work area (1024x768 till), Coperto e menu fisso, Flusso ordini e navigazione, Giornata screen (current service day, not calendar day), Il palmare (Server App), Rifacimento grafico (+11 more)

### Community 94 - "KDS standalone"
Cohesion: 0.20
Nodes (14): createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps, KdsWorkspace(), ConnectionMode, UseKdsConnectionResult (+6 more)

### Community 95 - "Invarianti del fork"
Cohesion: 0.12
Nodes (18): Feature Request Issue Template, Pull Request Template, Full Cross-Platform Matrix Workflow, Unsigned Windows NSIS Installer, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work (+10 more)

### Community 96 - "Backup Google Drive: frequenza e pulizia"
Cohesion: 0.12
Nodes (15): BackupFrequency, cancelDriveOperation(), computeFilesToDelete(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials(), GoogleDriveStatus, isBackupDue() (+7 more)

### Community 97 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 98 - "Test impostazioni sconti"
Cohesion: 0.15
Nodes (16): ref_http, assert(), assertEqual(), assertIncludes(), fs, http, main(), mockApp (+8 more)

### Community 99 - "Test interruttori KDS e comande"
Cohesion: 0.12
Nodes (17): bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsInfoRoutes }, { kdsRoutes }, { kitchenRoutes } (+9 more)

### Community 100 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 101 - "Stampa web del preconto"
Cohesion: 0.22
Nodes (16): ensureReceiptMessagesLoaded(), escapeHtml(), generateBillHtml(), getPaperStyles(), getReceiptTranslator(), ltrSpan(), PaperSize, PAYMENT_METHOD_KEYS (+8 more)

### Community 102 - "Test backup su Windows"
Cohesion: 0.15
Nodes (16): databaseRoutes, { authRoutes, getJWTSecret }, check(), Database, { databaseRoutes }, express, fs, {
  initDatabase,
  getDatabase,
  closeDatabase,
  createBackup,
  getCurrentSchemaVersion,
} (+8 more)

### Community 103 - "Test spegnimento e Google Drive"
Cohesion: 0.12
Nodes (16): createExitCodeAwareShutdown(), isShutdownTimeout(), runShutdownSteps(), { initDatabase, closeDatabase }, main(), mockApp, mockSafeStorage, mockShell (+8 more)

### Community 104 - "Test API stampanti"
Cohesion: 0.15
Nodes (15): app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now }, { kitchenStationRoutes } (+7 more)

### Community 105 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 106 - "Test paesi e localizzazione"
Cohesion: 0.15
Nodes (9): HistoryOrderCard(), frontend_src_lib_countries_countries, formatCurrency(), ref_node_assert, ref_node_test, assert, {
  COUNTRIES,
  countryMatchesQuery,
  getCountryByCode,
  getLocalizedCountryName,
  sortCountriesByLocalizedName,
}, Module (+1 more)

### Community 107 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 108 - "Test import DB durante lo spegnimento"
Cohesion: 0.16
Nodes (15): createShutdownCoordinator(), {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs, http, mockApp (+7 more)

### Community 109 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 110 - "Changelog: radice e release minori"
Cohesion: 0.19
Nodes (14): Clean shutdown and single-instance lock handling, Database export named buonapp-export-<date>.json, FloCafe (upstream project), Floor map keeps its size in edit mode, Floor map scale fits width and height (30% floor), New application icon in two variants (simplified mark and full illustration), Products tab category filter, Release 4.0.1 - new application icon (+6 more)

### Community 111 - "Verifica runtime Electron"
Cohesion: 0.14
Nodes (12): { contextBridge, ipcRenderer }, electron, args, electronPath, path, rebuildCli, result, runElectronNode() (+4 more)

### Community 112 - "Messaggio WhatsApp e test locale UI"
Cohesion: 0.14
Nodes (14): captureScreenshot(), { formatDateForTenant, getCountryByCode }, frontendRequire, { generateBillHtml }, { getWhatsAppMessage, getWhatsAppShareUrl, sendBillViaFlo }, { IntlProvider, useLocale }, { LANGUAGES }, Module (+6 more)

### Community 113 - "Test finestra KDS"
Cohesion: 0.14
Nodes (6): FakeBrowserWindow, FakeWebContents, Module, registered, run(), windows

### Community 114 - "Changelog 6.x: sconti, coperto e prezzi"
Cohesion: 0.30
Nodes (14): Cover charge (migrations v88-v90), Per-method discount switches, discount_methods (migration v99), Discount window opens on the first method switched on, no Cancel button, Discount given as the new total (discount_type total, target_total), Price written on the row (migrations v84, v87), One rule for carrying an order discount when the check changes, Order screen (formerly till) takes no money, Preconto (bill, not a receipt) (+6 more)

### Community 115 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 116 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Saved floor plans and strip of reservations still to place, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 117 - "Sessione e API del palmare"
Cohesion: 0.26
Nodes (11): apiErrorCode(), clearServerToken(), createServerApi(), newIdempotencyKey(), readServerToken(), SERVER_APP_TOKEN_KEY, storeServerToken(), ServerSession (+3 more)

### Community 118 - "Test RTL di KDS, palmare e WhatsApp"
Cohesion: 0.19
Nodes (13): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), dummyStorage, frontendRequire, loadComponents() (+5 more)

### Community 119 - "Test letture addon (KDS)"
Cohesion: 0.14
Nodes (13): getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes }, { kitchenRoutes }, Module (+5 more)

### Community 120 - "Script metainfo AppStream"
Cohesion: 0.14
Nodes (13): date, escapedVersion, { execFileSync }, META_FILE, notes, NOTES_HELPER, path, pkg (+5 more)

### Community 121 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 122 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 123 - "Changelog 6.0: menu fisso e coperto"
Cohesion: 0.23
Nodes (13): Any waiter can work any open order, Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Fixed menu (migration v92), Folding identical dishes (ticket, table, bill), Per-dish exceptions in menu courses (migration v93), Fixed menu filled in as the meal goes (migration v95), Line discount follows menu count; cash discount capped (+5 more)

### Community 125 - "Test contratto KDS"
Cohesion: 0.15
Nodes (12): bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, seedOwnerUser, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsRoutes }, Module, { orderItemRoutes } (+4 more)

### Community 126 - "Test metodi di pagamento"
Cohesion: 0.15
Nodes (12): { billRoutes }, fs, { initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct, api, assert, assertEqual, getResults, closeDatabase, now }, { MIGRATIONS }, Module, { orderRoutes }, os, path (+4 more)

### Community 127 - "Validazione note ordine"
Cohesion: 0.23
Nodes (7): validateItemNotes(), validateNoteLength(), validateOrderNotes(), db, dbPath, now, TestDb

### Community 128 - "Test aggiunte idempotenti"
Cohesion: 0.17
Nodes (11): bcrypt, fs, { getJWTSecret }, {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  seedCategory,
  seedProduct,
  api,
  assert,
  assertEqual,
  getResults,
  closeDatabase,
  getDatabase,
  now,
}, jwt, Module, { orderRoutes }, os (+3 more)

### Community 129 - "Test prezzo di riga"
Cohesion: 0.17
Nodes (11): bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, jwt, Module, { orderRoutes }, os (+3 more)

### Community 130 - "Pannello preferenze locale"
Cohesion: 0.25
Nodes (10): CALENDAR_LABELS, CURRENCY_DISPLAY_LABELS, DIGIT_LABELS, LocalePreferencesPanel(), Props, SettingsKey, CalendarMode, CountryLocaleOptions (+2 more)

### Community 131 - "Rotte gruppi addon"
Cohesion: 0.29
Nodes (10): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+2 more)

### Community 132 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 133 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 134 - "Test spegnimento WhatsApp"
Cohesion: 0.18
Nodes (10): ref_node_module, eventHandlers, fakeBaileys, fakeSocket, { initDatabase, getDatabase, closeDatabase }, pendingPresence, presenceStartedPromise, { runShutdownSteps } (+2 more)

### Community 135 - "Test stampa scontrino"
Cohesion: 0.20
Nodes (9): assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt }, runTests(), testBillId (+1 more)

### Community 136 - "Screenshot POS (FloCafe)"
Cohesion: 0.22
Nodes (10): Cart Panel, Customer Phone Lookup with Name Auto-fill, FloCafe Upstream Branding, Order Type Selector (Dine in / Takeaway / Delivery), POS Order Entry Screen, Printer Selector, Product Grid with Category Filters, BuonApp POS Screenshot (+2 more)

### Community 137 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 138 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 139 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 140 - "Test servizio e schema WhatsApp"
Cohesion: 0.22
Nodes (9): createShutdownEntrypoints(), { createShutdownEntrypoints }, eventHandlers, fakeBaileys, fakeSocket, main(), pendingPresence, presenceStartedPromise (+1 more)

### Community 141 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 142 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 143 - "Test ricerca per telefono"
Cohesion: 0.20
Nodes (9): fs, { initTestDb, closeDatabase, seedOwnerUser, api, assertEqual, assert, getResults, createApp, startServer }, insertCustomer(), mockApp, Module, os, path, { registerRoutes } (+1 more)

### Community 144 - "Doc menu a conteggio e righe compatte"
Cohesion: 0.22
Nodes (9): Restaurant Workflow Feedback Template, No Joined Tables (removed in migration v97), One Order, One Bill Invariant, compactKotItems / compactBillRows / compactOrderRows, Menu a conteggio (counted fixed menu), planCourseFill matching, printableBillRows (cancelled rows excluded from preconto), pendingDishCount (counts dishes not rows) (+1 more)

### Community 145 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 146 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 147 - "Test fedeltà"
Cohesion: 0.22
Nodes (8): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path, testDir

### Community 148 - "Test paginazione conti"
Cohesion: 0.22
Nodes (8): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path, seedBill(), testDir

### Community 149 - "Test coperto"
Cohesion: 0.28
Nodes (8): assert, booking(), { coversForNewOrder, validCovers }, main(), Module, path, table(), { useCartStore }

### Community 150 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 151 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 152 - "Errori di login"
Cohesion: 0.25
Nodes (6): LoginFailure, assert, frontendRequire, Module, { parseLoginFailure }, path

### Community 153 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 154 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 155 - "Changelog: chiusura giornata"
Cohesion: 0.38
Nodes (7): Bill of a cancelled order is owed by nobody, Dashboard removal, Service day close, Forced day close (owner-only, cancels open orders), Orders keep a snapshot of their table (migration v73), Release 6.2.3 - cancelled order bill no longer blocks day close, Deactivate instead of hard-delete (1.8.6)

### Community 156 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 157 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 158 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (7): Per-item and per-order discounts, new total included, Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 159 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 160 - "Righe compattate su comanda e conto"
Cohesion: 0.29
Nodes (7): billRowIdentity(), compactBillRows(), compactKotItems(), formatReceipt(), kotItemIdentity(), normalizeReceiptTemplate(), printableBillRows()

### Community 161 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 162 - "Tessere tavolo sulla mappa"
Cohesion: 0.33
Nodes (6): Release 6.2.2 - table seats and names on floor map, Table tiles show seats and the full name, layOutBooking(), minutesSince(), TableTile(), textWidth()

### Community 163 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 164 - "Audit del database"
Cohesion: 0.33
Nodes (5): ref_node_sqlite, candidatePaths, Database, NOTE: This is a diagnostic utility, not an automated test. It audits, targets

### Community 165 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 167 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 168 - "Azioni menu protette da PIN"
Cohesion: 0.80
Nodes (5): MenuActionHandler(), beginPinGatedAction(), handlePinSubmit(), runBackup(), runRestore()

### Community 169 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

### Community 170 - "Errori e codici di correlazione"
Cohesion: 0.60
Nodes (4): correlatedError, correlationId(), errorDetails(), FloErrorCode

### Community 171 - "Avvio dei server autonomi"
Cohesion: 0.50
Nodes (4): StandaloneStartupOptions, startStandaloneServers(), throwIfShutdownRequested(), testStandaloneStartupCancellation()

### Community 172 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 173 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 174 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 175 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 177 - "Changelog 4.1: via le tasse"
Cohesion: 0.67
Nodes (4): Receipt-template plugin path removal (migration v82), Release 4.1.0 - taxation module removed, Taxation module removal (migration v81), Upstream country tax packs and manual tax builder

### Community 178 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 179 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 180 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

### Community 181 - "Rubrica clienti opzionale"
Cohesion: 0.67
Nodes (3): DELETE /api/customers/:id hard erase, Customers endpoints (customers_disabled switch), Optional Customer Book Switch

## Ambiguous Edges - Review These
- `Release Notes from CHANGELOG.md` → `Branch Naming & Conventional Commits`  [AMBIGUOUS]
  .github/workflows/release.yml · relation: conceptually_related_to
- `Country profiles (main/countries.ts, localeOptions)` → `Tax-pack Ed25519 signature verification (upstream)`  [AMBIGUOUS]
  docs/security-audit-2.7.0.md · relation: conceptually_related_to
- `connect()` → `KDS WebSocket /kds protocol`  [AMBIGUOUS]
  renderer/kds.html · relation: implements
- `Restaurant Workflow Feedback Template` → `One Order, One Bill Invariant`  [AMBIGUOUS]
  .github/ISSUE_TEMPLATE/workflow_feedback.yml · relation: conceptually_related_to

## Knowledge Gaps
- **2125 isolated node(s):** `BusinessTypeKey`, `StaffRoleKey`, `DayDetailModalProps`, `PendingPinAction`, `StatusInfo` (+2120 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2428 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release Notes from CHANGELOG.md` and `Branch Naming & Conventional Commits`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Country profiles (main/countries.ts, localeOptions)` and `Tax-pack Ed25519 signature verification (upstream)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `connect()` and `KDS WebSocket /kds protocol`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **What is the exact relationship between `Restaurant Workflow Feedback Template` and `One Order, One Bill Invariant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `getCountryByCode()` connect `Paesi, valuta e formati` to `Rilevamento stampanti`, `Ordina, sala e pannello ordine`, `Conti, pagamenti e stampa`, `Stampa web del preconto`, `Impostazioni, ordini e sconti`, `Selettore fuso orario`, `Pagina prova stampa e dati di test`, `Encoder preconto frontend`, `Tavoli, prenotazioni e giornata`, `Test paesi e localizzazione`, `Messaggio WhatsApp e test locale UI`, `Helper di test condivisi`, `Profili stampante`, `Rotte ordini e clienti`, `Demo storico ordini`, `Pagina WhatsApp e tabelle`, `Test impostazioni, valuta e interruttori KDS`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `Import CSV del menu` to `Rotte gruppi addon`, `Impostazioni, ordini e sconti`, `Test spegnimento WhatsApp`, `Test stampa scontrino`, `Tavoli, prenotazioni e giornata`, `Server, sicurezza e CSP`, `Servizio WhatsApp (Baileys)`, `PIN master`, `Test servizio e schema WhatsApp`, `Backup, ripristino e import DB`, `Helper di test condivisi`, `Database, backup e ripristino`, `Inizializzazione e riparazioni DB`, `Rotte ordini e clienti`, `Server KDS e WebSocket`, `Servizio menu fisso`, `Config Next e storico ordini`, `Test ciclo di vita ordine`, `Salute dello schema DB`, `Test autorizzazioni ordini`, `Rilevamento stampanti`, `Conti, pagamenti e stampa`, `Test quantità addon`, `Servizio Google Drive`, `Test larghezza carta`, `API strumenti database`, `Rotte categorie`, `Processo principale Electron`, `Test DB legacy e stampa scontrino`, `Test integrità prezzi addon`, `Test annulli con override`, `Test sistema sconti`, `Test varianti in cucina`, `Allowlist URL e stampa`, `Test addon su righe ordine`, `Backup Google Drive: frequenza e pulizia`, `Test impostazioni sconti`, `Test backup su Windows`, `Test spegnimento e Google Drive`, `Test API stampanti`, `Test stampa conti`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._