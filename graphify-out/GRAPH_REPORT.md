# Graph Report - BuonApp  (2026-09-29)

## Corpus Check
- 8 files · ~817,351 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5124 nodes · 14139 edges · 192 communities (170 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 240 edges (avg confidence: 0.86)
- Token cost: 323,645 input · 0 output

## Community Hubs (Navigation)
- Impostazioni, primo avvio e UI base
- Script npm del backend
- Ordina, sala e pannello ordine
- Sala, Giornata e pannello ordine
- Paesi, valuta e stampa web
- Componenti UI base
- Tavoli, prenotazioni e giornata
- Database, backup e ripristino
- Spec Playwright e2e
- Config Next e storico ordini
- Idempotenza invio ordine
- Helper di test condivisi
- Moduli e UI condivisa
- Test tavoli, prenotazioni, giornate
- CSP, feature flag e limiti HTTP
- Ordini, conti e importi
- PIN master
- Servizio WhatsApp (Baileys)
- Server e2e di test
- Server KDS e WebSocket
- Pagina POS e store
- Encoder preconto frontend
- Pagina WhatsApp e tabelle
- Test impostazioni, valuta e coperto
- Inizializzazione e riparazioni DB
- Test DB, migrazioni e KDS
- Disinstallatore Windows e CI
- Normalizzazione username
- Sicurezza, token e rate limit
- Test coperto e rotte conto
- Giri di comanda (KOT batch)
- Rilevamento stampanti
- Test autorizzazioni e ruoli
- Test ciclo di vita ordine
- Registro lingue i18n
- KDS nella dashboard
- Tipi WebUSB
- Test catalogo prodotti
- Test RTL delle schermate
- Test backup e ripristino
- Rotte auth e staff
- Rotte ordini e clienti
- Impostazioni e tipi di ordine
- Profili stampante
- Test ordini, prezzi e auth cliente
- Test quantità addon
- Import/export menu CSV
- Spec Playwright RTL
- Layout preconto e report giornata
- Test paginazione clienti
- Dipendenze e engine backend
- Salute dello schema DB
- Servizio menu fisso
- Test traduzioni
- Pannello ordine e cassa POS
- Test letture addon (KDS)
- Servizio Google Drive
- Prodotti, immagini e controlli UI
- Test e tracciamento spegnimento
- Test errori localizzati
- Spegnimento pulito
- Provider i18n e fuso SSR
- Script kill-ports
- Changelog: origini e sala
- Layout della comanda
- Layout app e lingua HTML
- Pacchetto frontend
- KDS standalone
- Test backup su Windows
- Test metodi di pagamento
- Indice documentazione
- Rotte prodotti
- Rotte gruppi addon
- Figlio test avvio fallito
- DevDependencies backend
- API strumenti database
- Changelog 6.0: menu fisso e coperto
- Test varianti in cucina
- Changelog 4.x: sala e prenotazioni
- Dipendenze frontend
- Finestra principale, zoom e aggiornamenti
- Allowlist URL e stampa
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Config shadcn
- tsconfig frontend
- Test addon su righe ordine
- Invarianti del fork (AGENTS)
- Doc rifacimento grafico e navigazione
- Test interruttori KDS e KOT
- Backup Google Drive e annullamento
- Changelog 6.x: palmare e username
- Doc giornate, coperti, tavoli uniti
- Dipendenze runtime backend
- Test impostazioni sconti
- tsconfig backend
- Test servizio e schema WhatsApp
- Test API stampanti
- Ordini sospesi e service worker
- Tipi receipt-printer-encoder
- Generazione numeri d'ordine
- Figlio test import DB
- Test stampa conti
- Test rate limit PIN manager
- Test autorizzazioni ordini
- Manutenzione DB e server KDS
- Invarianti del fork
- DevDependencies frontend
- README frontend: sala e cucina
- Rotte categorie
- Runner test a shard
- Test fondamenta RTL
- tsconfig dei test
- Invio stampe ed errori
- Test larghezza carta
- Doc menu fisso e sconti
- Verifica runtime Electron
- Runner test Electron
- Config electron-builder
- Build macOS
- Test stampa scontrino
- Architettura dei tre server
- Screenshot POS (FloCafe)
- Override frontend
- Manifest PWA
- Badge dietetici
- Build Snap
- Test recupero stato auth
- Test rimedi audit i18n
- Test ricerca per telefono
- Doc coperto e impostazioni
- Cache di avvio
- Build Linux
- Test paginazione conti
- Social preview (FloCafe)
- KDS legacy renderer
- Doc giri di comanda e API
- Doc Server App palmare
- Errori di login e test
- Uscite dei piatti
- Test Google Drive
- Build AppX
- Test finestra KDS
- Test chunk delle lingue
- Doc invio comanda e menu fisso
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- Tipi API Electron
- Voce desktop Linux
- Script afterPack e binari nativi
- Runner test disinstallatore
- Script frontend
- README frontend: cassa e ordini
- Disinstallatore macOS
- Doc menu a conteggio
- Logo frontend
- Azioni menu protette da PIN
- Errori API frontend
- Errori di stampa
- Avvio server standalone
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Doppio dell'app Electron nei test
- Marchio BuonApp
- Connessioni stampanti
- Build Windows
- Login e blocco tentativi
- Pannello ordine condiviso
- Metadati package.json
- Script verifica runtime
- Autorità del backend
- Fonti di verità e policy AI
- Retry idempotente dell'invio
- Pacchetti Linux e installer
- Accesso QR ai palmari
- Config PostCSS
- README frontend: stampa
- Script restart
- Note di rilascio MAS
- Script run-test
- Invariante riuso
- Cancellazione cliente
- Ordini sospesi (API)
- Tray di sistema
- SEC-02 sandbox renderer
- SEC-04 copertura scansione
- Rubrica clienti opzionale
- Flussi d'ordine

## God Nodes (most connected - your core abstractions)
1. `getDatabase()` - 169 edges
2. `scripts` - 158 edges
3. `now()` - 141 edges
4. `cn()` - 138 edges
5. `assertEqual()` - 125 edges
6. `initTestDb()` - 125 edges
7. `createApp()` - 110 edges
8. `getResults()` - 108 edges
9. `react` - 108 edges
10. `assert()` - 106 edges

## Surprising Connections (you probably didn't know these)
- `Table tiles show seats and the full name` --references--> `TableTile()`  [INFERRED]
  CHANGELOG.md → frontend/src/components/tables/RoomMap.tsx
- `BuonApp Does Not Talk to a Vendor` --semantically_similar_to--> `Offline-First Operation Invariant`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → AGENTS.md
- `Kitchen stations routing by category` --references--> `KotLabels`  [INFERRED]
  docs/printers.md → main/printers/thermal.ts
- `Window zoom lowered on small screens (90% on till, min 75%)` --references--> `createWindow()`  [INFERRED]
  CHANGELOG.md → main/index.ts
- `Window zoom lowered on small screens (90% on till, min 75%)` --references--> `rendererZoomFor()`  [INFERRED]
  CHANGELOG.md → main/index.ts

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, agents_one_order_one_bill, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **One static export serves POS, KDS and Server App** — frontend_readme_static_export_in_electron, frontend_readme_buonapp_ui, frontend_readme_kitchen_display, frontend_readme_server_app [EXTRACTED 1.00]
- **Three Local LAN Servers (:3001, :3002, :3003)** — readme_express_api, readme_kds_server, readme_server_app_handheld, readme_mdns_buonapp_local, security_lan_only_ports [EXTRACTED 1.00]
- **POS Order Entry Flow** — docs_images_buonapp_pos_product_grid, docs_images_buonapp_pos_cart_panel, docs_images_buonapp_pos_order_type_selector, docs_images_buonapp_pos_printer_selector [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Table service flow: reservations, floor map, service days** — frontend_readme_reservations_page, frontend_readme_tables_page, frontend_readme_service_days_page, frontend_readme_joined_tables_and_layouts [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Handheld Server App device boundary** — docs_palmare_server_app, docs_palmare_proxy, docs_api_server_app_allowlist, docs_table_management_device_boundary, docs_palmare_no_cash [INFERRED 0.95]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fork removals: taxation, split checks, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom [INFERRED 0.85]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]

## Communities (192 total, 22 thin omitted)

### Community 0 - "Impostazioni, primo avvio e UI base"
Cohesion: 0.03
Nodes (115): Settings page, Zustand global state, BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage() (+107 more)

### Community 1 - "Script npm del backend"
Cohesion: 0.01
Nodes (158): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+150 more)

### Community 2 - "Ordina, sala e pannello ordine"
Cohesion: 0.05
Nodes (110): OrderPanel split into header/lines/sheet/totals/action bar, KanbanOrderCard(), Ltr(), LtrProps, LineActionSheet(), Props, OrderHeader(), OrderLines() (+102 more)

### Community 3 - "Sala, Giornata e pannello ordine"
Cohesion: 0.03
Nodes (108): Touch UI primitives and status colour tokens, Status colors in one place (status-styles.ts), UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Filters, FilterType, OrdersKey, tabLabelKey, PostpaidAttempt (+100 more)

### Community 4 - "Paesi, valuta e stampa web"
Cohesion: 0.04
Nodes (105): WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), generateKotHtml(), generateThermalReceiptHtml(), PaperWidth, PrintTestPage(), TestMode, ElapsedTime() (+97 more)

### Community 5 - "Componenti UI base"
Cohesion: 0.03
Nodes (91): Collapsed sidebar shows centred icons only, PageToolbar shared page header, Sidebar with 48 px rows, collapse toggle in page header, getLandingPage(), PageToolbar(), Props, ALL_NAV_ITEMS, AppSidebar() (+83 more)

### Community 6 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.04
Nodes (92): Services/routes split with no import cycle, now(), parseRowJson(), upsertSetting(), createGridPlacer(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, defaultTableSize() (+84 more)

### Community 7 - "Database, backup e ripristino"
Cohesion: 0.05
Nodes (90): captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), createBackupUnlocked(), createDatabaseShutdownError(), createDatabaseShutdownTimeoutError(), createMaintenanceAbortError() (+82 more)

### Community 8 - "Spec Playwright e2e"
Cohesion: 0.03
Nodes (80): ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module, outDir (+72 more)

### Community 9 - "Config Next e storico ordini"
Cohesion: 0.03
Nodes (68): nextConfig, deleteBackup(), resolveContainedPath(), better-sqlite3, ref_node_assert, ref_node_fs, ref_node_http, ref_node_os (+60 more)

### Community 10 - "Idempotenza invio ordine"
Cohesion: 0.06
Nodes (73): clearOrderAttempt(), OrderAttempt, readOrderAttempt(), saveOrderAttempt(), byName(), roomTabs(), SalaView(), apiErrorCode() (+65 more)

### Community 11 - "Helper di test condivisi"
Cohesion: 0.14
Nodes (79): main(), main(), main(), main(), api(), assert(), assertEqual(), assertIncludes() (+71 more)

### Community 12 - "Moduli e UI condivisa"
Cohesion: 0.07
Nodes (53): Staff roles (Owner, Manager, Cashier, Server, Chef), ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), CustomersPage(), DayDetailModal(), DayDetailModalProps, ServiceDaysPage() (+45 more)

### Community 13 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (72): MIGRATIONS, orderRoutes, roomRoutes, serviceDayRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
} (+64 more)

### Community 14 - "CSP, feature flag e limiti HTTP"
Cohesion: 0.06
Nodes (61): buildCspHeader(), getDbHealth(), isServerAppEnabled(), API_JSON_BODY_LIMIT, asyncHandler(), corsOptions, isAllowedPrivateIp(), normalizeIpForRateLimit() (+53 more)

### Community 15 - "Ordini, conti e importi"
Cohesion: 0.05
Nodes (57): getSettingValue(), insertOrderItemAddons(), utcDayBounds(), utcTodayDate(), verifyPin(), withTxn(), requireRole(), computeCoverCharge() (+49 more)

### Community 16 - "PIN master"
Cohesion: 0.06
Nodes (63): getSchemaVersionFromBackup(), isManagedBackupFile(), ALLOWED_IPC_KEYS, handle(), isTrustedSender(), maskSetting(), registerIpcHandlers(), SENSITIVE_SETTING_KEYS (+55 more)

### Community 17 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (67): loadBaileys(), abortable(), abortableDelay(), addToBlocklist(), advanceStatus(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers(), baileysLogger (+59 more)

### Community 18 - "Server e2e di test"
Cohesion: 0.04
Nodes (58): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver (+50 more)

### Community 19 - "Server KDS e WebSocket"
Cohesion: 0.11
Nodes (56): attachEffectiveAddons(), getKdsStationCategoryIds(), getKdsStationRoutingCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive(), isKdsEnabled() (+48 more)

### Community 20 - "Pagina POS e store"
Cohesion: 0.08
Nodes (47): AddonGroupsPage(), OrdersPage(), normalizeBarcode(), POSPage(), isOrderPaid(), OrderPanel(), Props, CartPanel() (+39 more)

### Community 21 - "Encoder preconto frontend"
Cohesion: 0.07
Nodes (43): PrinterStatus(), HardwarePrinter, KotOptions, KotSendResponse, KotSendResult, PaperWidth, PrinterState, PrintModeType (+35 more)

### Community 22 - "Pagina WhatsApp e tabelle"
Cohesion: 0.05
Nodes (49): BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS, STATUS_STEPS, StatusStep, StatusStepper() (+41 more)

### Community 23 - "Test impostazioni, valuta e coperto"
Cohesion: 0.04
Nodes (52): COUNTRIES, settingsRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os (+44 more)

### Community 24 - "Inizializzazione e riparazioni DB"
Cohesion: 0.07
Nodes (53): captureUserSecurityState(), getCurrentSchemaVersion(), getDatabase(), { authRoutes }, count(), express, { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS }, isNativeAbiMismatch() (+45 more)

### Community 25 - "Test DB, migrazioni e KDS"
Cohesion: 0.06
Nodes (50): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), closeDatabase(), initDatabase(), repairSequences(), runStartupIntegrityCheck(), getKdsPort(), stopKdsServer() (+42 more)

### Community 26 - "Disinstallatore Windows e CI"
Cohesion: 0.07
Nodes (50): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+42 more)

### Community 27 - "Normalizzazione username"
Cohesion: 0.07
Nodes (44): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+36 more)

### Community 28 - "Sicurezza, token e rate limit"
Cohesion: 0.05
Nodes (34): areCustomersEnabled(), authRateLimit(), cleanupExpiredRevocations(), clearRevokedTokens(), hashRevokedToken(), invalidateUserAuthCache(), RateLimitOptions, RateLimitRecord (+26 more)

### Community 29 - "Test coperto e rotte conto"
Cohesion: 0.05
Nodes (43): billRoutes, tests_helpers_test_setup_now, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os (+35 more)

### Community 30 - "Giri di comanda (KOT batch)"
Cohesion: 0.05
Nodes (43): claimKotBatch(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), { billRoutes }, { fixedMenuRoutes } (+35 more)

### Community 31 - "Rilevamento stampanti"
Cohesion: 0.09
Nodes (43): annotateProfile(), BRIDGE_CHIP_VENDORS, CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP, DAY_REPORT_LABELS, DayReportLabels, describeCupsQueueProblem() (+35 more)

### Community 32 - "Test autorizzazioni e ruoli"
Cohesion: 0.06
Nodes (39): getUserAuthStatus(), seedSetupProfile(), bcryptjs, ref_node_net, bcrypt, buildApp(), express, { getJWTSecret } (+31 more)

### Community 33 - "Test ciclo di vita ordine"
Cohesion: 0.05
Nodes (37): ref_events, ref_worker_threads, { assertEqual, assert }, { buildIdealSchemaDb }, db, ins, Module, assertGreaterThan() (+29 more)

### Community 34 - "Registro lingue i18n"
Cohesion: 0.11
Nodes (31): ServerStandalonePage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS, OrdersKey, PAYMENT_STATUS_LABEL_KEYS (+23 more)

### Community 35 - "KDS nella dashboard"
Cohesion: 0.10
Nodes (34): KdsColumn(), KdsColumnProps, KdsItemModal(), KdsItemModalProps, BoardStatus, DragData, DropData, KdsKanbanBoard() (+26 more)

### Community 36 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 37 - "Test catalogo prodotti"
Cohesion: 0.05
Nodes (36): addonGroupRoutes, categoryRoutes, productRoutes, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path (+28 more)

### Community 38 - "Test RTL delle schermate"
Cohesion: 0.07
Nodes (32): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_getlanguagedirection, frontend_src_lib_i18n_getlanguagelocale, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), frontendRequire (+24 more)

### Community 39 - "Test backup e ripristino"
Cohesion: 0.06
Nodes (29): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+21 more)

### Community 40 - "Rotte auth e staff"
Cohesion: 0.06
Nodes (35): staffRoutes, { authRoutes, getJWTSecret }, bcrypt, { clearRevokedTokens, revokeToken, isTokenRevoked }, { initDatabase }, {
  initTestDb,
  createApp,
  assertEqual,
  assert,
  getResults,
  closeDatabase,
  now,
}, jwt, Module (+27 more)

### Community 41 - "Rotte ordini e clienti"
Cohesion: 0.07
Nodes (30): libphonenumber-js, createSchema(), upsertSettings(), NormalizedPhoneResult, normalizeOptionalPhone(), parsePhoneE164(), stripPhoneDigits(), customerReadRateLimit (+22 more)

### Community 42 - "Impostazioni e tipi di ordine"
Cohesion: 0.07
Nodes (30): DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType, serializeOrderTypes() (+22 more)

### Community 43 - "Profili stampante"
Cohesion: 0.07
Nodes (25): isKotPrintingEnabled(), getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile (+17 more)

### Community 44 - "Test ordini, prezzi e auth cliente"
Cohesion: 0.06
Nodes (33): jsonwebtoken, bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken() (+25 more)

### Community 45 - "Test quantità addon"
Cohesion: 0.07
Nodes (25): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), { addonGroupRoutes } (+17 more)

### Community 46 - "Import/export menu CSV"
Cohesion: 0.06
Nodes (32): main_routes_menu_csv_menucsvroutes, { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, { menuCsvRoutes }, { MIGRATIONS }, Module (+24 more)

### Community 47 - "Spec Playwright RTL"
Cohesion: 0.09
Nodes (6): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), @playwright/test

### Community 48 - "Layout preconto e report giornata"
Cohesion: 0.13
Nodes (33): addonRows(), billRowIdentity(), buildEscPos(), capitalize(), compactBillRows(), compactKotItems(), coverChargeLabel(), encodeCodePageLine() (+25 more)

### Community 49 - "Test paginazione clienti"
Cohesion: 0.07
Nodes (30): customerRoutes, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken(), Module (+22 more)

### Community 50 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (30): allowScripts, description, engines, node, homepage, license, main, name (+22 more)

### Community 51 - "Salute dello schema DB"
Cohesion: 0.10
Nodes (30): appendJsonArray(), buildIdealSchemaDb(), isSafeIdentifier(), applySafeFixes(), ApplySafeFixesResult, ColumnDef, DbSchemaSnapshot, diffSchemas() (+22 more)

### Community 52 - "Servizio menu fisso"
Cohesion: 0.14
Nodes (30): attachFixedMenuCourses(), buildMenuRows(), cancelTargetIds(), choiceNote(), choicePortions(), courseAllowsDish(), courseLimit(), courseLimitMessage() (+22 more)

### Community 53 - "Test traduzioni"
Cohesion: 0.15
Nodes (29): assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES, findDuplicateKeys() (+21 more)

### Community 54 - "Pannello ordine e cassa POS"
Cohesion: 0.11
Nodes (24): PrepaidAttempt, DiscountModal, BUILT_IN_PAYMENT_KEYS, LoyaltySettings, ORDER_TYPE_SUFFIX_KEYS, OrderType, Payment, PosKey (+16 more)

### Community 55 - "Test letture addon (KDS)"
Cohesion: 0.07
Nodes (27): kdsRoutes, orderItemRoutes, getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes } (+19 more)

### Community 56 - "Servizio Google Drive"
Cohesion: 0.20
Nodes (7): computeFilesToDelete(), createDriveShutdownError(), getTokenFilePath(), GoogleDriveService, isSecureStorageAvailable(), requestSignal(), waitForDriveOperation()

### Community 57 - "Prodotti, immagini e controlli UI"
Cohesion: 0.09
Nodes (21): CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, ImageUploader(), ImageUploaderProps, Mode (+13 more)

### Community 58 - "Test e tracciamento spegnimento"
Cohesion: 0.18
Nodes (22): cancelHttpShutdownWork(), closeServerResources(), createShutdownEntrypoints(), installHttpShutdownTracking(), trackHttpRequestWork(), ws, delay(), getFreeTcpPort() (+14 more)

### Community 59 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 60 - "Spegnimento pulito"
Cohesion: 0.11
Nodes (26): abortHttpRequests(), ClosableHttpServer, closeHttpServer(), closeWebSocketServer(), createTimeoutError(), drainWebSocketClients(), HttpRequestState, httpRequestStates (+18 more)

### Community 61 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (22): getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getBrowserLanguage(), isLanguage(), getCachedMessages(), assert() (+14 more)

### Community 62 - "Script kill-ports"
Cohesion: 0.14
Nodes (23): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+15 more)

### Community 63 - "Changelog: origini e sala"
Cohesion: 0.12
Nodes (24): Clean shutdown and single-instance lock handling, Database export named buonapp-export-<date>.json, FloCafe (upstream project), Floor map with rooms (migration v75), Floor map keeps its size in edit mode, Floor map scale fits width and height (30% floor), New application icon in two variants (simplified mark and full illustration), Products tab category filter (+16 more)

### Community 64 - "Layout della comanda"
Cohesion: 0.17
Nodes (25): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+17 more)

### Community 65 - "Layout app e lingua HTML"
Cohesion: 0.14
Nodes (16): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+8 more)

### Community 66 - "Pacchetto frontend"
Cohesion: 0.08
Nodes (23): eslintConfig, eslint, @types/node, typescript, name, private, version, clsx (+15 more)

### Community 67 - "KDS standalone"
Cohesion: 0.16
Nodes (18): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps (+10 more)

### Community 68 - "Test backup su Windows"
Cohesion: 0.11
Nodes (23): createBackup(), assertNoRestoreAttachment(), clearLinkedData(), copyAndStamp(), Module, run(), seedLinkedData(), testDir (+15 more)

### Community 69 - "Test metodi di pagamento"
Cohesion: 0.08
Nodes (23): reportRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  seedCustomer, seedWalletCredit, api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+15 more)

### Community 70 - "Indice documentazione"
Cohesion: 0.14
Nodes (21): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Code of Conduct, Contributor Covenant 2.1, Local API Reference (docs/API.md), Coperto e menu fisso (+13 more)

### Community 71 - "Rotte prodotti"
Cohesion: 0.11
Nodes (12): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+4 more)

### Community 72 - "Rotte gruppi addon"
Cohesion: 0.13
Nodes (18): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+10 more)

### Community 73 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 74 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 75 - "API strumenti database"
Cohesion: 0.10
Nodes (21): { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes }, downloadServer (+13 more)

### Community 76 - "Changelog 6.0: menu fisso e coperto"
Cohesion: 0.16
Nodes (22): Any waiter can work any open order, Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), New order starts from the table's covers, Fixed menu (migration v92), Folding identical dishes (ticket, table, bill), Joined tables (migration v77, merged_into) (+14 more)

### Community 77 - "Test varianti in cucina"
Cohesion: 0.12
Nodes (21): kitchenRoutes, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+13 more)

### Community 78 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.14
Nodes (21): Bill of a cancelled order is owed by nobody, Cloud bridge and telemetry removal (migration v80), Customer book switch customers_enabled (migration v79), Dashboard removal, Service day close, Forced day close (owner-only, cancels open orders), Orders keep a snapshot of their table (migration v73), Release 4.0.0 - first BuonApp fork release (+13 more)

### Community 79 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 80 - "Finestra principale, zoom e aggiornamenti"
Cohesion: 0.14
Nodes (18): beginDatabaseShutdown(), WHATSAPP_AVAILABLE, checkForUpdates(), cleanupCoordinator, createMenu(), createTray(), initialize(), logPath (+10 more)

### Community 81 - "Allowlist URL e stampa"
Cohesion: 0.15
Nodes (17): printerRoutes, isAllowedLocalWindowUrl(), isSafeExternalUrl(), originFor(), assert(), express, failures, { initDatabase, getDatabase, closeDatabase, now } (+9 more)

### Community 82 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 83 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 84 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 85 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 86 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 87 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 88 - "Invarianti del fork (AGENTS)"
Cohesion: 0.12
Nodes (19): Restaurant Workflow Feedback Template, Business Timestamps Invariant, No Taxation Engine (Architecture Boundary), One Order, One Bill Invariant, Services/Routes Boundary for Fork Domains, Printed Output Languages (RECEIPT_LABELS, en/it only), Cover Charge, Express API and WebSocket Server (:3001) (+11 more)

### Community 89 - "Doc rifacimento grafico e navigazione"
Cohesion: 0.18
Nodes (19): Ordering product grid columns from its own container, Window zoom lowered on small screens (90% on till, min 75%), Window sized to display work area (1024x768 till), Archivio (past service days, expandable orders), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio), Giornata screen (current service day, not calendar day), Rifacimento grafico, Floor table panel as 672 px SidePanel (+11 more)

### Community 90 - "Test interruttori KDS e KOT"
Cohesion: 0.12
Nodes (18): kdsInfoRoutes, bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsInfoRoutes }, { kdsRoutes } (+10 more)

### Community 91 - "Backup Google Drive e annullamento"
Cohesion: 0.12
Nodes (16): BackupFrequency, cancelDriveOperation(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials(), googleDrive, GoogleDriveStatus, isBackupDue() (+8 more)

### Community 92 - "Changelog 6.x: palmare e username"
Cohesion: 0.16
Nodes (18): docs/API.md staff routes corrected, auto_print_kot setting removed, Handheld catalogue/settings refresh on tick and visibility, Handheld Ordering screen as a list, Handheld / Server App (:3003), Handhelds sidebar entry with join QR, Kitchen ticket has one road (backend only), Kitchen tickets sent in rounds (kot_batch, migration v72) (+10 more)

### Community 93 - "Doc giornate, coperti, tavoli uniti"
Cohesion: 0.14
Nodes (17): Joined tables endpoints (merge/split), Reports summary and sales (UTC dates), Reservations endpoints, Service Days endpoints, Floor plan endpoints (/api/table-layouts), Tables endpoints (/api/tables), coversForNewOrder (covers start from table), BuonApp GitHub social preview card (+9 more)

### Community 94 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 95 - "Test impostazioni sconti"
Cohesion: 0.14
Nodes (15): ref_http, assertEqual(), assertIncludes(), fs, http, main(), mockApp, mockIpcMain (+7 more)

### Community 96 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 97 - "Test servizio e schema WhatsApp"
Cohesion: 0.14
Nodes (15): ref_node_module, { buildIdealSchemaDb }, Database, getSetting(), main(), tableColumns(), tableIndexes(), { createShutdownEntrypoints } (+7 more)

### Community 98 - "Test API stampanti"
Cohesion: 0.15
Nodes (15): app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now }, { kitchenStationRoutes } (+7 more)

### Community 99 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 100 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 101 - "Generazione numeri d'ordine"
Cohesion: 0.17
Nodes (15): businessDateToday(), clampFinancialYearStart(), dateStampInTimezone(), generateBillNumber(), generateOrderNumber(), getNextSequence(), invoicePeriodSegment(), fs (+7 more)

### Community 102 - "Figlio test import DB"
Cohesion: 0.15
Nodes (15): databaseRoutes, {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs, http, mockApp (+7 more)

### Community 103 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 104 - "Test rate limit PIN manager"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 105 - "Test autorizzazioni ordini"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 106 - "Manutenzione DB e server KDS"
Cohesion: 0.15
Nodes (14): bcrypt, Database, fs, { getJWTSecret, authRoutes }, { initDatabase, getDbPath }, {
  initTestDb, createApp, assertEqual, getResults, getDatabase, closeDatabase, now,
}, { isTokenRevoked, revokeToken }, jwt (+6 more)

### Community 107 - "Invarianti del fork"
Cohesion: 0.15
Nodes (14): Feature Request Issue Template, Pull Request Template, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work, BuonApp Does Not Talk to a Vendor, Versioned Migrations via PRAGMA user_version (+6 more)

### Community 108 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 109 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Joined tables and saved floor plans, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 110 - "Rotte categorie"
Cohesion: 0.29
Nodes (13): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+5 more)

### Community 111 - "Runner test a shard"
Cohesion: 0.14
Nodes (13): date, escapedVersion, { execFileSync }, META_FILE, notes, NOTES_HELPER, path, pkg (+5 more)

### Community 112 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 113 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 114 - "Invio stampe ed errori"
Cohesion: 0.27
Nodes (13): classifyPrintFailure(), extractPlatformErrorCode(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus(), getPrintLanguage(), prepareReceipt(), printKOT() (+5 more)

### Community 115 - "Test larghezza carta"
Cohesion: 0.19
Nodes (12): escPosToText(), initPrinter(), warmUpPrintHelper(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main() (+4 more)

### Community 116 - "Doc menu fisso e sconti"
Cohesion: 0.17
Nodes (12): Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix, fixed_menu_course_products per-dish exceptions (v93), Menu fisso (fixed menu as a product), insertOrderItemRows() unified row writer, order_items.menu_group_id and menu_role, NOT_A_MENU_PACKAGE KDS filter (services/kds.ts) (+4 more)

### Community 117 - "Verifica runtime Electron"
Cohesion: 0.24
Nodes (10): ref_node_child_process, fail(), classifyQuarantine(), { execFileSync }, fs, main(), path, readQuarantine() (+2 more)

### Community 118 - "Runner test Electron"
Cohesion: 0.18
Nodes (10): args, electronPath, path, rebuildCli, result, runElectronNode(), { spawnSync }, sqliteCheck (+2 more)

### Community 119 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 120 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 121 - "Test stampa scontrino"
Cohesion: 0.20
Nodes (9): assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt }, runTests(), testBillId (+1 more)

### Community 122 - "Architettura dei tre server"
Cohesion: 0.20
Nodes (10): Express API and WebSocket (:3001), mDNS advertisement buonapp.local, Role-based access (owner, manager, cashier, server, chef), Staff accounts deactivated, never deleted, Standalone KDS server (:3002), useSyncServerLanguage for standalone surfaces, Every waiter on every table (ownership constraint dropped), SEC-01 LAN traffic not encrypted (+2 more)

### Community 123 - "Screenshot POS (FloCafe)"
Cohesion: 0.22
Nodes (10): Cart Panel, Customer Phone Lookup with Name Auto-fill, FloCafe Upstream Branding, Order Type Selector (Dine in / Takeaway / Delivery), POS Order Entry Screen, Printer Selector, Product Grid with Category Filters, BuonApp POS Screenshot (+2 more)

### Community 124 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 125 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 126 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 127 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 128 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 129 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }, run()

### Community 130 - "Test ricerca per telefono"
Cohesion: 0.20
Nodes (9): fs, { initTestDb, closeDatabase, seedOwnerUser, api, assertEqual, assert, getResults, createApp, startServer }, insertCustomer(), mockApp, Module, os, path, { registerRoutes } (+1 more)

### Community 131 - "Doc coperto e impostazioni"
Cohesion: 0.22
Nodes (9): Business settings (timezone, currency, localeOptions), Coperto (cover charge, migrations v88-v90), orderCharges() single charge sum (main/money.ts), orderCoverCharge() / computeCoverCharge, Country profiles (main/countries.ts, localeOptions), UI language decoupled from tenant regional settings, Split check removed (migration v91), Receipt language (English/Italian) (+1 more)

### Community 132 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 133 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 134 - "Test paginazione conti"
Cohesion: 0.22
Nodes (8): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path, seedBill(), testDir

### Community 135 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 136 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 137 - "Doc giri di comanda e API"
Cohesion: 0.29
Nodes (8): order_items.kot_batch round ledger, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, PATCH /orders/:id/items/:itemId/service-run, cancelTargetIds split cancel (package vs dish), isPendingKot (lib/kot.ts), order_items.menu_course_id (v95), Menu aperto: a container that fills (v95), TableScreen (full page table view)

### Community 138 - "Doc Server App palmare"
Cohesion: 0.32
Nodes (8): Server App for handhelds (:3003), Server App narrow forwarding allowlist, Handheld has no cash, table writes or customers, Unauthenticated product image passthrough with ETag, Server App proxy (main/server-app.ts), Sala view (table list, natural order), Server App tableside handheld, Device boundary: table writes only from central PC

### Community 139 - "Errori di login e test"
Cohesion: 0.25
Nodes (6): LoginFailure, assert, frontendRequire, Module, { parseLoginFailure }, path

### Community 140 - "Uscite dei piatti"
Cohesion: 0.39
Nodes (7): Db, DEFAULT_SERVICE_RUN, defaultServiceRunForProduct(), groupItemsByServiceRun(), MAX_SERVICE_RUNS, normalizeServiceRun(), resolveServiceRun()

### Community 141 - "Test Google Drive"
Cohesion: 0.25
Nodes (8): createExitCodeAwareShutdown(), createShutdownCoordinator(), isShutdownTimeout(), runShutdownSteps(), main(), testDatabaseCloseRequiresSuccessfulDrains(), testExitCodeEscalation(), testTimedOutCleanupUsesFatalBarrier()

### Community 142 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 144 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 145 - "Doc invio comanda e menu fisso"
Cohesion: 0.33
Nodes (7): POST /api/printers/print-kot, AttachToMenuModal and ServiceRunPicker, FixedMenuPicker window, Derived append-target order, OrdinaView product list with stepper, Kitchen ticket rounds (only unsent rows), WebUSB printers print bills only

### Community 146 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 147 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 148 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 149 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 150 - "Script afterPack e binari nativi"
Cohesion: 0.29
Nodes (5): ref_child_process, fs, NATIVE_BINARY_NAMES, path, { spawnSync }

### Community 151 - "Runner test disinstallatore"
Cohesion: 0.29
Nodes (5): path, result, runtime, { spawnSync }, testPath

### Community 152 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 153 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (6): Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 154 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 155 - "Doc menu a conteggio"
Cohesion: 0.40
Nodes (5): compactKotItems / compactBillRows / compactOrderRows, Menu a conteggio (counted fixed menu), planCourseFill matching, printableBillRows (cancelled rows excluded from preconto), pendingDishCount (counts dishes not rows)

### Community 156 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 157 - "Azioni menu protette da PIN"
Cohesion: 0.80
Nodes (5): MenuActionHandler(), beginPinGatedAction(), handlePinSubmit(), runBackup(), runRestore()

### Community 158 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

### Community 159 - "Errori di stampa"
Cohesion: 0.60
Nodes (4): correlatedError, correlationId(), errorDetails(), FloErrorCode

### Community 160 - "Avvio server standalone"
Cohesion: 0.50
Nodes (4): StandaloneStartupOptions, startStandaloneServers(), throwIfShutdownRequested(), testStandaloneStartupCancellation()

### Community 161 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 162 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 163 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 164 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 166 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 167 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 168 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

### Community 169 - "Login e blocco tentativi"
Cohesion: 0.67
Nodes (3): POST /api/auth/login (JWT), Login lockout (5 attempts, 15 minutes), Username-based login (migration v96)

### Community 170 - "Pannello ordine condiviso"
Cohesion: 0.67
Nodes (3): Ordina composes and sends, never takes payment, Pannello ordine condiviso (OrderPanel), useSendKot shared hook

### Community 171 - "Metadati package.json"
Cohesion: 0.67
Nodes (3): author, email, name

## Ambiguous Edges - Review These
- `Release Notes from CHANGELOG.md` → `Branch Naming & Conventional Commits`  [AMBIGUOUS]
  .github/workflows/release.yml · relation: conceptually_related_to
- `End-to-End Playwright & Release Regression Job` → `Verification Matrix by Change Type`  [AMBIGUOUS]
  AGENTS.md · relation: references
- `Business settings (timezone, currency, localeOptions)` → `Split check removed (migration v91)`  [AMBIGUOUS]
  docs/API.md · relation: conceptually_related_to
- `Country profiles (main/countries.ts, localeOptions)` → `Tax-pack Ed25519 signature verification (upstream)`  [AMBIGUOUS]
  docs/security-audit-2.7.0.md · relation: conceptually_related_to
- `connect()` → `KDS WebSocket /kds protocol`  [AMBIGUOUS]
  renderer/kds.html · relation: implements
- `Restaurant Workflow Feedback Template` → `One Order, One Bill Invariant`  [AMBIGUOUS]
  .github/ISSUE_TEMPLATE/workflow_feedback.yml · relation: conceptually_related_to

## Knowledge Gaps
- **2133 isolated node(s):** `PosKey`, `ProductsKey`, `TabType`, `DayDetailModalProps`, `LtrProps` (+2128 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2443 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release Notes from CHANGELOG.md` and `Branch Naming & Conventional Commits`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `End-to-End Playwright & Release Regression Job` and `Verification Matrix by Change Type`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Business settings (timezone, currency, localeOptions)` and `Split check removed (migration v91)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Country profiles (main/countries.ts, localeOptions)` and `Tax-pack Ed25519 signature verification (upstream)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `connect()` and `KDS WebSocket /kds protocol`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **What is the exact relationship between `Restaurant Workflow Feedback Template` and `One Order, One Bill Invariant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `getCountryByCode()` connect `Paesi, valuta e stampa web` to `Impostazioni, primo avvio e UI base`, `Ordina, sala e pannello ordine`, `Tavoli, prenotazioni e giornata`, `Impostazioni e tipi di ordine`, `Profili stampante`, `Helper di test condivisi`, `Pagina POS e store`, `Encoder preconto frontend`, `Pagina WhatsApp e tabelle`, `Test impostazioni, valuta e coperto`, `Normalizzazione username`, `Rilevamento stampanti`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._