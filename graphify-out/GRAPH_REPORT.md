# Graph Report - BuonApp  (2026-09-27)

## Corpus Check
- 11 files · ~815,835 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5116 nodes · 14135 edges · 204 communities (181 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 211 edges (avg confidence: 0.85)
- Token cost: 172,812 input · 0 output

## Community Hubs (Navigation)
- Moduli e UI condivisa
- Script npm del backend
- Componenti UI base
- Sala, Giornata e pannello ordine
- Pagine Ordina, palmare e menu fisso
- Database, backup e ripristino
- Rotte ordini e clienti
- Finestra principale, zoom e aggiornamenti
- Tipi e componenti ordine
- Spec Playwright e2e
- Rotte auth e staff
- Test tavoli, prenotazioni, giornate
- Pagina WhatsApp e tabelle
- Servizio WhatsApp (Baileys)
- Config Next e storico ordini
- Inizializzazione e riparazioni DB
- CSP, feature flag e limiti HTTP
- Pagina Impostazioni
- Server KDS e WebSocket
- Spegnimento pulito
- Helper di test condivisi
- Test coperto e rotte conto
- Test idempotenza aggiunte e impostazioni
- Normalizzazione username
- KDS nella dashboard
- Primo avvio e paesi
- Idempotenza invio ordine
- Geometria tavoli e sale
- Manutenzione DB e server KDS
- PIN master
- Stampa termica ESC/POS
- Test ciclo di vita ordine
- Pannello ordine e cassa POS
- Tipi WebUSB
- Test backup e ripristino
- Pagina prova stampa
- Impostazioni e tipi di ordine
- Encoder preconto frontend
- Backup e segnale di manutenzione
- Dipendenze e engine backend
- Spec Playwright RTL
- Script kill-ports
- Test paginazione clienti
- Test fedeltà tasso globale
- Runner test a shard
- Registro lingue i18n
- Server e2e di test
- Dev server
- Test catalogo prodotti
- Servizio menu fisso
- Test traduzioni
- Stampa web del preconto
- Profili stampante
- Rotte prenotazioni e servizio ordini
- Giri di comanda (KOT batch)
- Pacchetto frontend
- Test RTL delle schermate
- Rotte gruppi addon
- Test letture addon (KDS)
- Test errori localizzati
- Conti e pagamenti
- Servizio giornata e mappe salvate
- Figlio test import DB
- Doc giri di comanda e API
- Importi, coperto e addebiti
- Rilevamento stampanti
- Test metodi di pagamento
- Indice documentazione
- Provider i18n e fuso SSR
- Rotte prodotti
- Test menu fisso e giri
- Test Google Drive
- Disinstallatore Windows
- Figlio test avvio fallito
- Changelog 6.0: menu fisso e coperto
- Changelog 6.x: palmare e username
- DevDependencies backend
- API strumenti database
- Rotte categorie
- Test integrità prezzi addon
- Dipendenze frontend
- Import/export menu CSV
- Allowlist URL e stampa
- Test annulli con override
- Test sistema sconti
- Test varianti in cucina
- Config shadcn
- tsconfig frontend
- Salute dello schema DB
- Layout preconto e report giornata
- Test addon su righe ordine
- Invarianti del fork (AGENTS)
- Changelog 4.x: sala e prenotazioni
- KDS standalone
- Test interruttori KDS e KOT
- Test quantità addon
- Doc giornate, coperti, tavoli uniti
- Layout app e lingua HTML
- Dipendenze runtime backend
- tsconfig backend
- Changelog: origini e sala
- Generazione numeri d'ordine
- Test backup su Windows
- Test impostazioni sconti
- Test API stampanti
- Doc menu a conteggio e impostazioni
- Ordini sospesi e service worker
- Hook usePrinter
- Tipi receipt-printer-encoder
- Test stampa conti
- Test rate limit PIN manager
- Test autorizzazioni ordini
- Doc menu fisso e sconti
- Invarianti del fork
- DevDependencies frontend
- README frontend: sala e cucina
- PrinterService
- Test stampa scontrino
- Test immagini prodotto
- Test fondamenta RTL
- tsconfig dei test
- Test larghezza carta
- Test primo avvio
- Layout standalone e tema
- Sessione API palmare
- Validazione note ordine
- Test ESC/POS
- Test ruolo cameriere su Server App
- Test prezzo riga ordine
- Runner test Electron
- Doc rifacimento grafico e navigazione
- Pagina staff e username frontend
- Config electron-builder
- Build macOS
- Test RTL setup e impostazioni
- Verifica runtime Electron
- Test auth cliente
- Test simbolo valuta in stampa
- Workflow di rilascio
- Architettura dei tre server
- Screenshot POS (FloCafe)
- Override frontend
- Manifest PWA
- Badge dietetici
- Errori di stampa
- Build Snap
- Test recupero stato auth
- Test rimedi audit i18n
- Test crash codice paese Windows
- Pipeline CI
- Build Linux
- Test integrità migrazioni
- Test ID tavoli stringa
- Social preview (FloCafe)
- KDS legacy renderer
- Build AppX
- Test schema WhatsApp
- Test finestra KDS
- Test chunk delle lingue
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- Tipi API Electron
- Profili paese e valuta
- Voce desktop Linux
- Script i18n:add
- Test ricerca cliente per telefono
- Script frontend
- README frontend: cassa e ordini
- Disinstallatore macOS
- Test preconti nel browser
- Test ripristino FK legacy
- Logo frontend
- Errori API frontend
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Doppio dell'app Electron nei test
- Changelog 5.0: preconto e rimozioni
- Marchio BuonApp
- Connessioni stampanti
- Build Windows
- Login e blocco tentativi
- Pannello ordine condiviso
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
1. `getDatabase()` - 171 edges
2. `scripts` - 158 edges
3. `now()` - 145 edges
4. `cn()` - 138 edges
5. `assertEqual()` - 126 edges
6. `initTestDb()` - 126 edges
7. `createApp()` - 110 edges
8. `getResults()` - 109 edges
9. `react` - 108 edges
10. `assert()` - 107 edges

## Surprising Connections (you probably didn't know these)
- `Table tiles show seats and the full name` --references--> `TableTile()`  [INFERRED]
  CHANGELOG.md → frontend/src/components/tables/RoomMap.tsx
- `BuonApp Does Not Talk to a Vendor` --semantically_similar_to--> `Offline-First Operation Invariant`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → AGENTS.md
- `Feature Request Issue Template` --semantically_similar_to--> `Maintainer Approval Before Architectural Work`  [INFERRED] [semantically similar]
  .github/ISSUE_TEMPLATE/feature_request.yml → CONTRIBUTING.md
- `Code of Conduct` --semantically_similar_to--> `Private Vulnerability Reporting`  [INFERRED] [semantically similar]
  CODE_OF_CONDUCT.md → SECURITY.md
- `Window zoom lowered on small screens (90% on till, min 75%)` --references--> `rendererZoomFor()`  [INFERRED]
  CHANGELOG.md → main/index.ts

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, agents_one_order_one_bill, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **One static export serves POS, KDS and Server App** — frontend_readme_static_export_in_electron, frontend_readme_buonapp_ui, frontend_readme_kitchen_display, frontend_readme_server_app [EXTRACTED 1.00]
- **Three Local LAN Servers (:3001, :3002, :3003)** — readme_express_api, readme_kds_server, readme_server_app_handheld, readme_mdns_buonapp_local, security_lan_only_ports [EXTRACTED 1.00]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **POS Order Entry Flow** — docs_images_buonapp_pos_product_grid, docs_images_buonapp_pos_cart_panel, docs_images_buonapp_pos_order_type_selector, docs_images_buonapp_pos_printer_selector [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Table service flow: reservations, floor map, service days** — frontend_readme_reservations_page, frontend_readme_tables_page, frontend_readme_service_days_page, frontend_readme_joined_tables_and_layouts [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Handheld Server App device boundary** — docs_palmare_server_app, docs_palmare_proxy, docs_api_server_app_allowlist, docs_table_management_device_boundary, docs_palmare_no_cash [INFERRED 0.95]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom [INFERRED 0.85]
- **Fork removals: taxation, split checks, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off [INFERRED 0.85]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]

## Communities (204 total, 23 thin omitted)

### Community 0 - "Moduli e UI condivisa"
Cohesion: 0.04
Nodes (119): Staff roles (Owner, Manager, Cashier, Server, Chef), ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), CustomersPage(), CATEGORY_COLORS, PosKey, PRESET_TAGS (+111 more)

### Community 1 - "Script npm del backend"
Cohesion: 0.01
Nodes (158): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+150 more)

### Community 2 - "Componenti UI base"
Cohesion: 0.03
Nodes (104): Collapsed sidebar shows centred icons only, PageToolbar shared page header, Sidebar with 48 px rows, collapse toggle in page header, getLandingPage(), ALL_NAV_ITEMS, AppSidebar(), NavItem, NavKey (+96 more)

### Community 3 - "Sala, Giornata e pannello ordine"
Cohesion: 0.04
Nodes (105): Touch UI primitives and status colour tokens, OrderPanel split into header/lines/sheet/totals/action bar, Status colors in one place (status-styles.ts), Filters, FilterType, OrdersKey, tabLabelKey, PostpaidAttempt (+97 more)

### Community 4 - "Pagine Ordina, palmare e menu fisso"
Cohesion: 0.05
Nodes (81): AddonGroupsPage(), OrdersPage(), normalizeBarcode(), POSPage(), ServerStandalonePage(), AttachToMenuModal(), FixedMenuPicker(), nextTallyKey() (+73 more)

### Community 5 - "Database, backup e ripristino"
Cohesion: 0.05
Nodes (78): captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), createBackupUnlocked(), createDatabaseShutdownTimeoutError(), createMaintenanceAbortError(), createMaintenanceDrainTimeoutError() (+70 more)

### Community 6 - "Rotte ordini e clienti"
Cohesion: 0.04
Nodes (62): createSchema(), NormalizedPhoneResult, normalizeOptionalPhone(), parsePhoneE164(), stripPhoneDigits(), asyncHandler(), requireRole(), customerReadRateLimit (+54 more)

### Community 7 - "Finestra principale, zoom e aggiornamenti"
Cohesion: 0.05
Nodes (50): Window zoom lowered on small screens (90% on till, min 75%), Window sized to display work area (1024x768 till), Page zoom on small screens (webPreferences.zoomFactor), Touch targets 44/48/56 px, createWindow sized to workAreaSize (1024x768 cash screen), beginDatabaseShutdown(), checkForUpdates(), cleanupCoordinator (+42 more)

### Community 8 - "Tipi e componenti ordine"
Cohesion: 0.06
Nodes (64): UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Zustand global state, AddonModal(), groupInitialAddons(), Props, Props, CartPanel(), Props (+56 more)

### Community 9 - "Spec Playwright e2e"
Cohesion: 0.03
Nodes (67): ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module, outDir (+59 more)

### Community 10 - "Rotte auth e staff"
Cohesion: 0.03
Nodes (69): validatePassword(), authRoutes, getJWTSecret(), kitchenRoutes, OPERATIONAL_ROLES, router, staffRoutes, USERNAME_INVALID (+61 more)

### Community 11 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (72): MIGRATIONS, orderRoutes, roomRoutes, serviceDayRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
} (+64 more)

### Community 12 - "Pagina WhatsApp e tabelle"
Cohesion: 0.04
Nodes (63): BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage(), BlocklistRow, InboxMessage (+55 more)

### Community 13 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (69): loadBaileys(), abortable(), abortableDelay(), addToBlocklist(), advanceStatus(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers(), baileysLogger (+61 more)

### Community 14 - "Config Next e storico ordini"
Cohesion: 0.04
Nodes (54): nextConfig, HistoryOrderCard(), formatCurrency(), better-sqlite3, ref_node_assert, ref_node_fs, ref_node_http, ref_node_os (+46 more)

### Community 15 - "Inizializzazione e riparazioni DB"
Cohesion: 0.06
Nodes (66): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), buildIdealSchemaDb(), captureUserSecurityState(), getCurrentSchemaVersion(), getDatabase(), initDatabase(), repairSequences() (+58 more)

### Community 16 - "CSP, feature flag e limiti HTTP"
Cohesion: 0.06
Nodes (59): buildCspHeader(), areCustomersEnabled(), getDbHealth(), isServerAppEnabled(), WHATSAPP_AVAILABLE, API_JSON_BODY_LIMIT, resolveContainedPath(), authRateLimit() (+51 more)

### Community 17 - "Pagina Impostazioni"
Cohesion: 0.06
Nodes (49): Settings page, formatBackupSize(), invoicePreviewSegment(), InvoiceResetPeriod, KdsDefaultViewCard(), ORDER_TYPE_SETTING_LABELS, SELECTABLE_LANGUAGES, SettingsKey (+41 more)

### Community 18 - "Server KDS e WebSocket"
Cohesion: 0.11
Nodes (58): attachEffectiveAddons(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive(), isKdsEnabled(), isKdsStationItemAllowed() (+50 more)

### Community 19 - "Spegnimento pulito"
Cohesion: 0.07
Nodes (55): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeServerResources(), closeWebSocketServer(), createExitCodeAwareShutdown(), createTimeoutError() (+47 more)

### Community 20 - "Helper di test condivisi"
Cohesion: 0.22
Nodes (62): main(), main(), main(), main(), api(), assert(), assertEqual(), assertIncludes() (+54 more)

### Community 21 - "Test coperto e rotte conto"
Cohesion: 0.04
Nodes (51): billRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os, path (+43 more)

### Community 22 - "Test idempotenza aggiunte e impostazioni"
Cohesion: 0.04
Nodes (50): settingsRoutes, tests_helpers_test_setup_closedatabase, tests_helpers_test_setup_getdatabase, bcrypt, fs, { getJWTSecret }, {
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
}, jwt (+42 more)

### Community 23 - "Normalizzazione username"
Cohesion: 0.07
Nodes (46): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+38 more)

### Community 24 - "KDS nella dashboard"
Cohesion: 0.08
Nodes (44): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), ElapsedTime(), formatElapsed(), KdsColumn(), KdsColumnProps, KdsItemModal() (+36 more)

### Community 25 - "Primo avvio e paesi"
Cohesion: 0.07
Nodes (44): SELECTABLE_LANGUAGES, SERVICE_MODEL_KEYS, SERVICE_MODELS, ServiceModel, SETUP_PROFILE_KEYS, SETUP_PROFILES, SetupKey, SetupPage() (+36 more)

### Community 26 - "Idempotenza invio ordine"
Cohesion: 0.09
Nodes (47): APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, AppendAttemptCompletion, AppendAttemptOptions, appendAttemptsMatch(), AppendAttemptStorage, assertVerifiedCompletionReads(), buildAppendItemsFingerprint() (+39 more)

### Community 27 - "Geometria tavoli e sale"
Cohesion: 0.08
Nodes (41): createGridPlacer(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, defaultTableSize(), isTableShape(), ROOM_MARGIN, TABLE_GAP, TABLE_SHAPES (+33 more)

### Community 28 - "Manutenzione DB e server KDS"
Cohesion: 0.07
Nodes (42): closeDatabase(), databaseMaintenanceMiddleware(), registerDatabaseMaintenanceStartListener(), getKdsPort(), stopKdsServer(), clearRevokedTokens(), invalidateUserAuthCache(), getServerPort() (+34 more)

### Community 29 - "PIN master"
Cohesion: 0.09
Nodes (41): authorizeMasterPin(), checkMasterPinRateLimit(), getMasterPinFilePath(), isMasterPinAvailable(), isMasterPinRateLimited(), isMasterPinSet(), MasterPinAuthResult, MasterPinBlob (+33 more)

### Community 30 - "Stampa termica ESC/POS"
Cohesion: 0.07
Nodes (44): billRowIdentity(), BRIDGE_CHIP_VENDORS, buildEscPos(), buildTestPage(), columnsForPaperWidth(), compactBillRows(), compactKotItems(), CP1252_HIGH_RANGE (+36 more)

### Community 31 - "Test ciclo di vita ordine"
Cohesion: 0.06
Nodes (40): registerRoutes(), ref_worker_threads, bcrypt, fs, http, { initDatabase, getDatabase, closeDatabase, now }, jwt, IMPORTANT: Each test file must mock Electron BEFORE importing this helper. (+32 more)

### Community 32 - "Pannello ordine e cassa POS"
Cohesion: 0.09
Nodes (32): WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), PrepaidAttempt, HistoryOrder, BUILT_IN_PAYMENT_KEYS, Payment, PaymentModal(), PosKey (+24 more)

### Community 33 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 34 - "Test backup e ripristino"
Cohesion: 0.06
Nodes (29): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+21 more)

### Community 35 - "Pagina prova stampa"
Cohesion: 0.10
Nodes (33): generateKotHtml(), PaperWidth, PrintTestPage(), TestMode, formatDate(), formatTime(), createTestBill(), createTestCustomer() (+25 more)

### Community 36 - "Impostazioni e tipi di ordine"
Cohesion: 0.07
Nodes (30): DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType, serializeOrderTypes() (+22 more)

### Community 37 - "Encoder preconto frontend"
Cohesion: 0.13
Nodes (30): OrderHistoryGrid(), menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes, capitalize() (+22 more)

### Community 38 - "Backup e segnale di manutenzione"
Cohesion: 0.09
Nodes (30): createBackup(), createDatabaseShutdownError(), deleteBackup(), getMaintenanceSignal(), getSchemaVersionFromBackup(), isManagedBackupFile(), releaseDatabaseIdleWaiters(), releaseMaintenanceDrainWaiters() (+22 more)

### Community 39 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (32): allowScripts, author, email, name, description, engines, node, homepage (+24 more)

### Community 40 - "Spec Playwright RTL"
Cohesion: 0.09
Nodes (6): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), @playwright/test

### Community 41 - "Script kill-ports"
Cohesion: 0.10
Nodes (28): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+20 more)

### Community 42 - "Test paginazione clienti"
Cohesion: 0.07
Nodes (30): customerRoutes, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken(), Module (+22 more)

### Community 43 - "Test fedeltà tasso globale"
Cohesion: 0.06
Nodes (30): productRoutes, { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, { menuCsvRoutes }, { MIGRATIONS }, Module (+22 more)

### Community 44 - "Runner test a shard"
Cohesion: 0.06
Nodes (28): ref_node_child_process, fs, index, mine, packageJsonPath, path, pkg, { spawnSync } (+20 more)

### Community 45 - "Registro lingue i18n"
Cohesion: 0.16
Nodes (25): getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS, PAYMENT_STATUS_LABEL_KEYS, ROLE_LABEL_KEYS, TENANT_STATUS_LABEL_KEYS, isLanguage() (+17 more)

### Community 46 - "Server e2e di test"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 47 - "Dev server"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 48 - "Test catalogo prodotti"
Cohesion: 0.07
Nodes (28): addonGroupRoutes, categoryRoutes, { addonGroupRoutes }, fs, {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  api,
  assert,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, Module, os, path (+20 more)

### Community 49 - "Servizio menu fisso"
Cohesion: 0.14
Nodes (30): attachFixedMenuCourses(), buildMenuRows(), cancelTargetIds(), choiceNote(), choicePortions(), courseAllowsDish(), courseLimit(), courseLimitMessage() (+22 more)

### Community 50 - "Test traduzioni"
Cohesion: 0.14
Nodes (30): @formatjs/icu-messageformat-parser, assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES (+22 more)

### Community 51 - "Stampa web del preconto"
Cohesion: 0.14
Nodes (27): generateThermalReceiptHtml(), ensureReceiptMessagesLoaded(), escapeHtml(), formatAmount(), formatReceiptDate(), generateBillHtml(), getPaperStyles(), getReceiptTranslator() (+19 more)

### Community 52 - "Profili stampante"
Cohesion: 0.11
Nodes (27): getSettingValue(), isKotPrintingEnabled(), getSupportedPrinterProfiles(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile (+19 more)

### Community 53 - "Rotte prenotazioni e servizio ordini"
Cohesion: 0.12
Nodes (26): now(), syncCustomerTagCounts(), readInput(), reservationRoutes, router, cancelOrder(), CancelOrderOptions, Db (+18 more)

### Community 54 - "Giri di comanda (KOT batch)"
Cohesion: 0.09
Nodes (28): claimKotBatch(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), seedServerUser(), addItem(), fs (+20 more)

### Community 55 - "Pacchetto frontend"
Cohesion: 0.07
Nodes (27): eslintConfig, eslint, libphonenumber-js, @types/node, typescript, name, private, version (+19 more)

### Community 56 - "Test RTL delle schermate"
Cohesion: 0.10
Nodes (24): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_getlanguagedirection, frontend_src_lib_i18n_getlanguagelocale, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), frontendRequire (+16 more)

### Community 57 - "Rotte gruppi addon"
Cohesion: 0.10
Nodes (18): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), heldOrderReadRateLimit (+10 more)

### Community 58 - "Test letture addon (KDS)"
Cohesion: 0.07
Nodes (26): kdsRoutes, orderItemRoutes, { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes }, { kitchenRoutes } (+18 more)

### Community 59 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 60 - "Conti e pagamenti"
Cohesion: 0.11
Nodes (21): utcDayBounds(), utcTodayDate(), verifyPin(), applyPaymentBatch(), calculateCashback(), canonicalizePaymentRequest(), OrderBillSyncValues, PAYMENT_METHODS (+13 more)

### Community 61 - "Servizio giornata e mappe salvate"
Cohesion: 0.15
Nodes (23): businessDateToday(), router, expireOpenReservations(), captureLayout(), closeServiceDay(), CloseServiceDayOptions, CloseServiceDayResult, computeServiceDaySummary() (+15 more)

### Community 62 - "Figlio test import DB"
Cohesion: 0.10
Nodes (24): createShutdownCoordinator(), createShutdownEntrypoints(), {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs, http (+16 more)

### Community 63 - "Doc giri di comanda e API"
Cohesion: 0.10
Nodes (25): order_items.kot_batch round ledger, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, POST /api/printers/print-kot, Rooms endpoints (/api/rooms), Server App for handhelds (:3003), Server App narrow forwarding allowlist, PATCH /orders/:id/items/:itemId/service-run, cancelTargetIds split cancel (package vs dish) (+17 more)

### Community 64 - "Importi, coperto e addebiti"
Cohesion: 0.14
Nodes (18): insertOrderItemAddons(), computeCoverCharge(), COVER_CHARGE_SETTING_KEY, orderCharges(), parseCoverChargeAmount(), roundMoney(), syncUnpaidBillsForOrder(), checkPinRateLimit() (+10 more)

### Community 65 - "Rilevamento stampanti"
Cohesion: 0.14
Nodes (25): matchSupportedPrinterProfile(), annotateProfile(), describeCupsQueueProblem(), detectConnectedPrinters(), detectLinuxPrinters(), detectMacOSPrinters(), detectWindowsMakeModel(), detectWindowsPrinters() (+17 more)

### Community 66 - "Test metodi di pagamento"
Cohesion: 0.08
Nodes (23): reportRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  seedCustomer, seedWalletCredit, api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+15 more)

### Community 67 - "Indice documentazione"
Cohesion: 0.14
Nodes (21): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Code of Conduct, Contributor Covenant 2.1, Local API Reference (docs/API.md), Coperto e menu fisso (+13 more)

### Community 68 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (20): getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getCachedMessages(), assert(), buildHtmlDocument(), frontendRequire (+12 more)

### Community 69 - "Rotte prodotti"
Cohesion: 0.11
Nodes (12): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+4 more)

### Community 70 - "Test menu fisso e giri"
Cohesion: 0.08
Nodes (22): routeItemsToStations(), { billRoutes }, { fixedMenuRoutes }, { formatKOT, formatReceipt, escPosToText }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedServerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes } (+14 more)

### Community 71 - "Test Google Drive"
Cohesion: 0.09
Nodes (22): runShutdownSteps(), { initDatabase, closeDatabase }, main(), mockApp, mockSafeStorage, mockShell, Module, openedUrls (+14 more)

### Community 72 - "Disinstallatore Windows"
Cohesion: 0.25
Nodes (23): Add-ChildUninstallerProcessIds(), Close-BuonApp(), Confirm-BuonAppStopped(), Confirm-ChildUninstallerStopped(), Confirm-NoActiveUninstallWork(), Get-FloProcesses(), Get-ProcessTreeIds(), Invoke-BuonAppUninstall() (+15 more)

### Community 73 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 74 - "Changelog 6.0: menu fisso e coperto"
Cohesion: 0.15
Nodes (23): Any waiter can work any open order, Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), New order starts from the table's covers, Fixed menu (migration v92), Folding identical dishes (ticket, table, bill), Joined tables (migration v77, merged_into) (+15 more)

### Community 75 - "Changelog 6.x: palmare e username"
Cohesion: 0.11
Nodes (23): docs/API.md staff routes corrected, auto_print_kot setting removed, Cloud bridge and telemetry removal (migration v80), Handheld catalogue/settings refresh on tick and visibility, Handheld Ordering screen as a list, Handheld / Server App (:3003), Handhelds sidebar entry with join QR, Kitchen ticket has one road (backend only) (+15 more)

### Community 76 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 77 - "API strumenti database"
Cohesion: 0.10
Nodes (21): { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes }, downloadServer (+13 more)

### Community 78 - "Rotte categorie"
Cohesion: 0.18
Nodes (20): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+12 more)

### Community 79 - "Test integrità prezzi addon"
Cohesion: 0.11
Nodes (19): ref_http, assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 80 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 81 - "Import/export menu CSV"
Cohesion: 0.10
Nodes (19): main_routes_menu_csv_menucsvroutes, addonCsv(), addonCsvWithHeader(), fs, {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  seedCategory,
  api,
  assert,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, { menuCsvRoutes }, Module, os (+11 more)

### Community 82 - "Allowlist URL e stampa"
Cohesion: 0.15
Nodes (17): printerRoutes, isAllowedLocalWindowUrl(), isSafeExternalUrl(), originFor(), assert(), express, failures, { initDatabase, getDatabase, closeDatabase, now } (+9 more)

### Community 83 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 84 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 85 - "Test varianti in cucina"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 86 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 87 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 88 - "Salute dello schema DB"
Cohesion: 0.14
Nodes (19): appendJsonArray(), isSafeIdentifier(), ApplySafeFixesResult, ColumnDef, DbSchemaSnapshot, diffSchemas(), FindingKind, fkSignature() (+11 more)

### Community 89 - "Layout preconto e report giornata"
Cohesion: 0.26
Nodes (20): parseDbTimestamp(), addonRows(), capitalize(), coverChargeLabel(), financialRows(), formatClassicReceipt(), formatCompactReceipt(), formatCurrency() (+12 more)

### Community 90 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 91 - "Invarianti del fork (AGENTS)"
Cohesion: 0.12
Nodes (19): Restaurant Workflow Feedback Template, Business Timestamps Invariant, No Taxation Engine (Architecture Boundary), One Order, One Bill Invariant, Services/Routes Boundary for Fork Domains, Printed Output Languages (RECEIPT_LABELS, en/it only), Cover Charge, Express API and WebSocket Server (:3001) (+11 more)

### Community 92 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.17
Nodes (19): Bill of a cancelled order is owed by nobody, Customer book switch customers_enabled (migration v79), Dashboard removal, Service day close, Forced day close (owner-only, cancels open orders), Orders keep a snapshot of their table (migration v73), Release 4.0.0 - first BuonApp fork release, Release 6.2.3 - cancelled order bill no longer blocks day close (+11 more)

### Community 93 - "KDS standalone"
Cohesion: 0.20
Nodes (14): createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps, KdsWorkspace(), ConnectionMode, UseKdsConnectionResult (+6 more)

### Community 94 - "Test interruttori KDS e KOT"
Cohesion: 0.12
Nodes (18): kdsInfoRoutes, bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsInfoRoutes }, { kdsRoutes } (+10 more)

### Community 95 - "Test quantità addon"
Cohesion: 0.13
Nodes (18): { addonGroupRoutes }, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+10 more)

### Community 96 - "Doc giornate, coperti, tavoli uniti"
Cohesion: 0.14
Nodes (17): Joined tables endpoints (merge/split), Reports summary and sales (UTC dates), Reservations endpoints, Service Days endpoints, Floor plan endpoints (/api/table-layouts), Tables endpoints (/api/tables), coversForNewOrder (covers start from table), BuonApp GitHub social preview card (+9 more)

### Community 97 - "Layout app e lingua HTML"
Cohesion: 0.20
Nodes (14): geistMono, geistSans, metadata, viewport, DirectionalToaster(), HtmlLangSync(), MenuActionHandler(), beginPinGatedAction() (+6 more)

### Community 98 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 99 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 100 - "Changelog: origini e sala"
Cohesion: 0.19
Nodes (16): Clean shutdown and single-instance lock handling, Database export named buonapp-export-<date>.json, FloCafe (upstream project), Floor map with rooms (migration v75), Floor map keeps its size in edit mode, Floor map scale fits width and height (30% floor), New application icon in two variants (simplified mark and full illustration), Products tab category filter (+8 more)

### Community 101 - "Generazione numeri d'ordine"
Cohesion: 0.16
Nodes (16): clampFinancialYearStart(), datePartsInTimezone(), dateStampInTimezone(), financialYearSegment(), generateBillNumber(), generateOrderNumber(), getNextSequence(), invoicePeriodSegment() (+8 more)

### Community 102 - "Test backup su Windows"
Cohesion: 0.15
Nodes (16): databaseRoutes, { authRoutes, getJWTSecret }, check(), Database, { databaseRoutes }, express, fs, {
  initDatabase,
  getDatabase,
  closeDatabase,
  createBackup,
  getCurrentSchemaVersion,
} (+8 more)

### Community 103 - "Test impostazioni sconti"
Cohesion: 0.15
Nodes (14): assertEqual(), assertIncludes(), fs, http, main(), mockApp, mockIpcMain, Module (+6 more)

### Community 104 - "Test API stampanti"
Cohesion: 0.15
Nodes (15): app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now }, { kitchenStationRoutes } (+7 more)

### Community 105 - "Doc menu a conteggio e impostazioni"
Cohesion: 0.13
Nodes (16): Business settings (timezone, currency, localeOptions), AttachToMenuModal and ServiceRunPicker, compactKotItems / compactBillRows / compactOrderRows, FixedMenuPicker window, Menu a conteggio (counted fixed menu), planCourseFill matching, printableBillRows (cancelled rows excluded from preconto), Country profiles (main/countries.ts, localeOptions) (+8 more)

### Community 106 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 107 - "Hook usePrinter"
Cohesion: 0.19
Nodes (14): HardwarePrinter, KotOptions, KotSendResponse, KotSendResult, PaperWidth, PrinterState, PrintModeType, ReceiptTenant (+6 more)

### Community 108 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 109 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 110 - "Test rate limit PIN manager"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 111 - "Test autorizzazioni ordini"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 112 - "Doc menu fisso e sconti"
Cohesion: 0.13
Nodes (15): Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix, fixed_menu_course_products per-dish exceptions (v93), Coperto (cover charge, migrations v88-v90), Menu fisso (fixed menu as a product), insertOrderItemRows() unified row writer, order_items.menu_group_id and menu_role (+7 more)

### Community 113 - "Invarianti del fork"
Cohesion: 0.15
Nodes (14): Feature Request Issue Template, Pull Request Template, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work, BuonApp Does Not Talk to a Vendor, Versioned Migrations via PRAGMA user_version (+6 more)

### Community 114 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 115 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Joined tables and saved floor plans, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 117 - "Test stampa scontrino"
Cohesion: 0.18
Nodes (11): printReceipt(), PrintType, assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt } (+3 more)

### Community 118 - "Test immagini prodotto"
Cohesion: 0.14
Nodes (13): ref_events, assertGreaterThan(), { closeHttpServer, installHttpShutdownTracking, cancelHttpShutdownWork }, dns, { EventEmitter }, fs, https, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, assertIncludes, assertGreaterThan,
  closeDatabase, getDatabase, now,
} (+5 more)

### Community 119 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 120 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 121 - "Test larghezza carta"
Cohesion: 0.19
Nodes (12): escPosToText(), initPrinter(), warmUpPrintHelper(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main() (+4 more)

### Community 122 - "Test primo avvio"
Cohesion: 0.23
Nodes (12): { authRoutes }, count(), express, { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS }, isNativeAbiMismatch(), listen(), main(), mockApp (+4 more)

### Community 123 - "Layout standalone e tema"
Cohesion: 0.23
Nodes (7): Dark theme tokens unused, frontend_src_app_globals, metadata, metadata, viewport, KdsHtmlLang(), loadLocaleMessages()

### Community 124 - "Sessione API palmare"
Cohesion: 0.33
Nodes (9): clearServerToken(), createServerApi(), readServerToken(), SERVER_APP_TOKEN_KEY, storeServerToken(), ServerSession, ServerUser, useServerSession() (+1 more)

### Community 125 - "Validazione note ordine"
Cohesion: 0.23
Nodes (7): validateItemNotes(), validateNoteLength(), validateOrderNotes(), db, dbPath, now, TestDb

### Community 126 - "Test ESC/POS"
Cohesion: 0.17
Nodes (6): row(), failures, fixtureBill, fixtureBusiness, fixtureOrder, loadFrontendPrinterModules()

### Community 127 - "Test ruolo cameriere su Server App"
Cohesion: 0.26
Nodes (11): ref_node_net, DISH_PHOTO, getFreeTcpPort(), getJson(), main(), Module, postJson(), rawGetStatus() (+3 more)

### Community 128 - "Test prezzo riga ordine"
Cohesion: 0.17
Nodes (11): bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, jwt, Module, { orderRoutes }, os (+3 more)

### Community 129 - "Runner test Electron"
Cohesion: 0.18
Nodes (10): args, electronPath, path, rebuildCli, result, runElectronNode(), { spawnSync }, sqliteCheck (+2 more)

### Community 130 - "Doc rifacimento grafico e navigazione"
Cohesion: 0.22
Nodes (11): Archivio (past service days, expandable orders), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio), Giornata screen (current service day, not calendar day), Rifacimento grafico, Floor table panel as 672 px SidePanel, Giornata orders as a list opening the shared order panel, Map MIN_SCALE 0.7 with overflow scroll, Product form still asks supermarket fields (SKU, barcode, cost, stock) (+3 more)

### Community 131 - "Pagina staff e username frontend"
Cohesion: 0.22
Nodes (8): roleLabel(), StaffSettings(), COMBINING_MARKS, isUsernameShape(), isValidUsername(), normalizeUsername(), USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH

### Community 132 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 133 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 134 - "Test RTL setup e impostazioni"
Cohesion: 0.25
Nodes (8): ALLOWLIST, assert(), frontendRequire, loadLtrComponent(), Module, ROOT, run(), SCREEN_FILES

### Community 135 - "Verifica runtime Electron"
Cohesion: 0.27
Nodes (9): fail(), classifyQuarantine(), { execFileSync }, fs, main(), path, readQuarantine(), { classifyQuarantine } (+1 more)

### Community 136 - "Test auth cliente"
Cohesion: 0.22
Nodes (10): bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken(), Module (+2 more)

### Community 137 - "Test simbolo valuta in stampa"
Cohesion: 0.18
Nodes (10): fs, {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  api,
  assert,
  assertEqual,
  assertIncludes,
  getResults,
  closeDatabase,
  now,
}, Module, os, path, { printerRoutes }, seedPrintableBill(), { settingsRoutes } (+2 more)

### Community 138 - "Workflow di rilascio"
Cohesion: 0.20
Nodes (9): Full Cross-Platform Matrix Workflow, Release Workflow, Release Notes from CHANGELOG.md, Unsigned Windows NSIS Installer, Release Tag Validation (strict X.Y.Z = package.json), Windows Auto-Update Assets (latest.yml + .exe.blockmap), Branch Naming & Conventional Commits, Windows-Only Published Releases (+1 more)

### Community 139 - "Architettura dei tre server"
Cohesion: 0.20
Nodes (10): Express API and WebSocket (:3001), mDNS advertisement buonapp.local, Role-based access (owner, manager, cashier, server, chef), Staff accounts deactivated, never deleted, Standalone KDS server (:3002), useSyncServerLanguage for standalone surfaces, Every waiter on every table (ownership constraint dropped), SEC-01 LAN traffic not encrypted (+2 more)

### Community 140 - "Screenshot POS (FloCafe)"
Cohesion: 0.22
Nodes (10): Cart Panel, Customer Phone Lookup with Name Auto-fill, FloCafe Upstream Branding, Order Type Selector (Dine in / Takeaway / Delivery), POS Order Entry Screen, Printer Selector, Product Grid with Category Filters, BuonApp POS Screenshot (+2 more)

### Community 141 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 142 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 143 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 144 - "Errori di stampa"
Cohesion: 0.33
Nodes (9): correlatedError, correlationId(), errorDetails(), FloErrorCode, classifyPrintFailure(), extractPlatformErrorCode(), printKOTDetailed(), printReceiptDetailed() (+1 more)

### Community 145 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 146 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 147 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }, run()

### Community 148 - "Test crash codice paese Windows"
Cohesion: 0.24
Nodes (9): assert(), assertEqual(), fs, { initDatabase, getDatabase, getCurrentSchemaVersion, MIGRATIONS, now }, main(), Module, os, path (+1 more)

### Community 149 - "Pipeline CI"
Cohesion: 0.25
Nodes (9): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+1 more)

### Community 150 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 151 - "Test integrità migrazioni"
Cohesion: 0.25
Nodes (8): fs, { initDatabase, getDatabase, closeDatabase, now }, insertOrderAndBill(), main(), Module, os, path, testDir

### Community 152 - "Test ID tavoli stringa"
Cohesion: 0.22
Nodes (8): fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedTable,
  seedCustomer,
  api, assert, assertEqual, assertIncludes,
  closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path, { tableRoutes }, testDir

### Community 153 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 154 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 155 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 156 - "Test schema WhatsApp"
Cohesion: 0.36
Nodes (7): ref_node_module, { buildIdealSchemaDb }, Database, getSetting(), main(), tableColumns(), tableIndexes()

### Community 158 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 159 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 160 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 161 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 162 - "Profili paese e valuta"
Cohesion: 0.57
Nodes (6): getCurrencyUnitAdapter(), captureEvidenceArtifacts(), generatePaymentModalHtml(), main(), runPaymentMathTests(), runUnitTests()

### Community 163 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 164 - "Script i18n:add"
Cohesion: 0.29
Nodes (6): fs, messagesDir, path, root, source, target

### Community 165 - "Test ricerca cliente per telefono"
Cohesion: 0.29
Nodes (5): { assertEqual, assert }, { buildIdealSchemaDb }, db, ins, Module

### Community 166 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 167 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (6): Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 168 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 169 - "Test preconti nel browser"
Cohesion: 0.40
Nodes (4): assert(), failures, run(), { webPrint, i18n, countries }

### Community 170 - "Test ripristino FK legacy"
Cohesion: 0.47
Nodes (5): journalPath(), Module, recoveryPath(), run(), testDir

### Community 171 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 172 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

### Community 173 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 174 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 175 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 176 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 178 - "Changelog 5.0: preconto e rimozioni"
Cohesion: 0.67
Nodes (4): Receipt-template plugin path removal (migration v82), Release 4.1.0 - taxation module removed, Taxation module removal (migration v81), Upstream country tax packs and manual tax builder

### Community 179 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 180 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 181 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

### Community 182 - "Login e blocco tentativi"
Cohesion: 0.67
Nodes (3): POST /api/auth/login (JWT), Login lockout (5 attempts, 15 minutes), Username-based login (migration v96)

### Community 183 - "Pannello ordine condiviso"
Cohesion: 0.67
Nodes (3): Ordina composes and sends, never takes payment, Pannello ordine condiviso (OrderPanel), useSendKot shared hook

## Ambiguous Edges - Review These
- `Release Notes from CHANGELOG.md` → `Branch Naming & Conventional Commits`  [AMBIGUOUS]
  .github/workflows/release.yml · relation: conceptually_related_to
- `End-to-End Playwright & Release Regression Job` → `Verification Matrix by Change Type`  [AMBIGUOUS]
  AGENTS.md · relation: references
- `Restaurant Workflow Feedback Template` → `One Order, One Bill Invariant`  [AMBIGUOUS]
  .github/ISSUE_TEMPLATE/workflow_feedback.yml · relation: conceptually_related_to
- `Business settings (timezone, currency, localeOptions)` → `Split check removed (migration v91)`  [AMBIGUOUS]
  docs/API.md · relation: conceptually_related_to
- `Country profiles (main/countries.ts, localeOptions)` → `Tax-pack Ed25519 signature verification (upstream)`  [AMBIGUOUS]
  docs/security-audit-2.7.0.md · relation: conceptually_related_to
- `connect()` → `KDS WebSocket /kds protocol`  [AMBIGUOUS]
  renderer/kds.html · relation: implements

## Knowledge Gaps
- **2138 isolated node(s):** `DayDetailModalProps`, `Props`, `StatusInfo`, `Props`, `PosKey` (+2133 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2446 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release Notes from CHANGELOG.md` and `Branch Naming & Conventional Commits`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `End-to-End Playwright & Release Regression Job` and `Verification Matrix by Change Type`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Restaurant Workflow Feedback Template` and `One Order, One Bill Invariant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Business settings (timezone, currency, localeOptions)` and `Split check removed (migration v91)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Country profiles (main/countries.ts, localeOptions)` and `Tax-pack Ed25519 signature verification (upstream)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `connect()` and `KDS WebSocket /kds protocol`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **Why does `getCountryByCode()` connect `Stampa web del preconto` to `Layout preconto e report giornata`, `Pagina prova stampa`, `Pagine Ordina, palmare e menu fisso`, `Encoder preconto frontend`, `Sala, Giornata e pannello ordine`, `Impostazioni e tipi di ordine`, `Spec Playwright e2e`, `Pagina WhatsApp e tabelle`, `Config Next e storico ordini`, `Profili stampante`, `Helper di test condivisi`, `Normalizzazione username`, `Primo avvio e paesi`, `Test ESC/POS`, `Servizio giornata e mappe salvate`, `Stampa termica ESC/POS`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._