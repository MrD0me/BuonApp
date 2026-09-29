# Graph Report - BuonApp  (2026-09-29)

## Corpus Check
- 40 files · ~818,088 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5149 nodes · 14195 edges · 176 communities (161 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 294 edges (avg confidence: 0.85)
- Token cost: 477,309 input · 0 output

## Community Hubs (Navigation)
- Script npm del backend
- Moduli e UI condivisa
- Componenti UI base
- Ordini, conti e importi
- Database, backup e ripristino
- Sala, Giornata e pannello ordine
- Test catalogo e spec Playwright
- Rotte auth, staff e test autorizzazioni
- Inizializzazione e riparazioni DB
- Pagina POS e store
- Server KDS e WebSocket
- Processo principale, sicurezza e CSP
- Config Next e storico ordini
- Test tavoli, prenotazioni, giornate
- Helper di test condivisi
- Geometria tavoli, login e username
- Ordina, sala e pannello ordine
- Servizio WhatsApp (Baileys)
- Test ciclo di vita ordine
- Spegnimento pulito
- Prodotti, immagini e controlli UI
- Pagina WhatsApp e tabelle
- Tavoli, prenotazioni e giornata
- Servizio Google Drive
- Test impostazioni, valuta e interruttori KDS
- Pagina impostazioni
- Pannello ordine e cassa POS
- Servizio menu fisso
- PIN master
- Idempotenza invio ordine
- Pagina ordini e righe ordine
- Changelog 4.x: sala e prenotazioni
- Rilevamento stampanti
- Test backup e ripristino
- Salute dello schema DB
- Test paginazione clienti
- Doc sala, tavoli ed endpoint
- Doc giri di comanda e palmare
- Registro lingue i18n
- Tipi WebUSB
- Impostazioni e tipi di ordine
- Changelog 6.0: menu fisso e coperto
- Test DB legacy e stampa scontrino
- Indice documentazione e contributi
- Test quantità addon
- Import/export menu CSV
- Dipendenze e engine backend
- Primo avvio e pagina staff
- KDS nella dashboard
- Normalizzazione username
- Test metodi di pagamento
- Disinstallatore Windows e CI
- Spec Playwright RTL
- Script kill-ports
- Test servizio e schema WhatsApp
- Runner test a shard
- Encoder preconto frontend
- Rotte ordini e clienti
- Server e2e e import da dist
- Server e2e di test
- Giri di comanda (KOT batch)
- Test traduzioni
- Invarianti del fork
- Allowlist URL e stampa
- Paesi, valuta e formati
- KDS standalone
- Test stampa conti
- Test errori localizzati
- Pacchetto frontend
- Test menu fisso e smistamento comande
- Layout app e lingua HTML
- Provider i18n e fuso SSR
- Test RTL delle schermate
- Figlio test avvio fallito
- Layout della comanda
- Test spegnimento e Google Drive
- DevDependencies backend
- API strumenti database
- Messaggio WhatsApp e test locale UI
- Rotte categorie
- Dipendenze frontend
- Layout preconto e report giornata
- Test integrità prezzi addon
- Config shadcn
- tsconfig frontend
- Test annulli con override
- Test sistema sconti
- Test varianti in cucina
- Test addon su righe ordine
- Profili stampante
- Architettura dei tre server e login
- Stampa web del preconto
- Test API stampanti
- Dipendenze runtime backend
- tsconfig backend
- Doc menu fisso e sconti
- Test impostazioni sconti
- Doc invarianti, preconto e menu a conteggio
- Ordini sospesi e service worker
- Tipi receipt-printer-encoder
- Rotte gruppi addon
- Test rate limit PIN manager
- Test autorizzazioni ordini
- Test backup su Windows
- README frontend: sala e cucina
- Manutenzione DB e server KDS
- DevDependencies frontend
- Servizio stampante frontend
- Sessione e API del palmare
- Test RTL di KDS, palmare e WhatsApp
- Test letture addon (KDS)
- Test fondamenta RTL
- tsconfig dei test
- Errori ed encoder ESC/POS
- Test larghezza carta
- Import CSV del menu
- Test primo avvio
- Test contratto KDS
- Finestra principale e zoom
- Test ruolo server del palmare
- Test preferenze locale
- Pannello preferenze locale
- Config electron-builder
- Build macOS
- Verifica runtime Electron
- Test integrità pagamenti
- Screenshot POS (FloCafe)
- Override frontend
- Manifest PWA
- Badge dietetici
- Build Snap
- Test recupero stato auth
- Test coperto
- Test rimedi audit i18n
- Cache di avvio
- Build Linux
- Test riconciliazione conti
- Social preview (FloCafe)
- KDS legacy renderer
- Build AppX
- Test finestra KDS
- Test chunk delle lingue
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- Tipi API Electron
- Voce desktop Linux
- Test ricerca per telefono
- Script frontend
- README frontend: cassa e ordini
- Selettore fuso orario
- Disinstallatore macOS
- Logo frontend
- Azioni menu protette da PIN
- Errori API frontend
- Invio stampe ed errori
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
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
3. `now()` - 139 edges
4. `cn()` - 137 edges
5. `assertEqual()` - 122 edges
6. `initTestDb()` - 122 edges
7. `getResults()` - 108 edges
8. `createApp()` - 107 edges
9. `react` - 107 edges
10. `assert()` - 103 edges

## Surprising Connections (you probably didn't know these)
- `Kitchen stations routing by category` --references--> `KotLabels`  [INFERRED]
  docs/printers.md → main/printers/thermal.ts
- `Default printer named in the ticket's language (Cucina)` --references--> `routeItemsToStations()`  [INFERRED]
  CHANGELOG.md → main/routes/printers.ts
- `Kitchen stations routing by category` --references--> `routeItemsToStations()`  [INFERRED]
  docs/printers.md → main/routes/printers.ts
- `BuonApp Does Not Talk to a Vendor` --semantically_similar_to--> `Offline-First Operation Invariant`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → AGENTS.md
- `UI Translations (en, it, es, pt-BR, fa with RTL)` --semantically_similar_to--> `UI language decoupled from tenant regional settings`  [INFERRED] [semantically similar]
  README.md → docs/i18n.md

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **One static export serves POS, KDS and Server App** — frontend_readme_static_export_in_electron, frontend_readme_buonapp_ui, frontend_readme_kitchen_display, frontend_readme_server_app [EXTRACTED 1.00]
- **POS Order Entry Flow** — docs_images_buonapp_pos_product_grid, docs_images_buonapp_pos_cart_panel, docs_images_buonapp_pos_order_type_selector, docs_images_buonapp_pos_printer_selector [INFERRED 0.85]
- **Table service flow: reservations, floor map, service days** — frontend_readme_reservations_page, frontend_readme_tables_page, frontend_readme_service_days_page, frontend_readme_joined_tables_and_layouts [INFERRED 0.85]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fork removals: taxation, split checks, joined tables, small tables, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off, changelog_joined_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid, booked tiles, legend row)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom, changelog_booked_tile_name_and_party, changelog_unseated_bookings_in_legend_row, changelog_service_map_fits_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, docs_i18n_decoupled_language_tenant, agents_one_order_one_bill, agents_no_joined_tables, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **Three Local LAN Servers (:3001, :3002, :3003)** — readme_express_api, readme_kds_server, readme_server_app_handheld, readme_mdns_buonapp_local, security_lan_only_ports [EXTRACTED 1.00]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Handheld Server App device boundary** — docs_palmare_server_app, docs_palmare_proxy, docs_api_server_app_allowlist, docs_table_management_device_boundary, docs_palmare_no_cash [INFERRED 0.95]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Booked tables legible on the till's 1024x768 map** — docs_table_management_till_screen_fit, docs_table_management_booked_tile_label, docs_table_management_unseated_chips, docs_table_management_service_fit_to_tables, docs_table_management_size_presets [EXTRACTED 1.00]

## Communities (176 total, 15 thin omitted)

### Community 0 - "Script npm del backend"
Cohesion: 0.01
Nodes (158): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+150 more)

### Community 1 - "Moduli e UI condivisa"
Cohesion: 0.04
Nodes (101): Staff roles (Owner, Manager, Cashier, Server, Chef), WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey (+93 more)

### Community 2 - "Componenti UI base"
Cohesion: 0.03
Nodes (88): Collapsed sidebar shows centred icons only, PageToolbar shared page header, Sidebar with 48 px rows, collapse toggle in page header, Props, ALL_NAV_ITEMS, AppSidebar(), NavItem, NavKey (+80 more)

### Community 3 - "Ordini, conti e importi"
Cohesion: 0.04
Nodes (82): getSettingValue(), insertOrderItemAddons(), isKotPrintingEnabled(), isServerAppEnabled(), upsertSettings(), utcDayBounds(), utcTodayDate(), verifyPin() (+74 more)

### Community 4 - "Database, backup e ripristino"
Cohesion: 0.04
Nodes (100): businessDateToday(), captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserSecurityState(), captureUserStationSecurityState(), clampFinancialYearStart(), createBackup() (+92 more)

### Community 5 - "Sala, Giornata e pannello ordine"
Cohesion: 0.04
Nodes (92): PostpaidAttempt, BookingRowProps, EditBookingModalProps, CancelModal, Props, Props, Props, Props (+84 more)

### Community 6 - "Test catalogo e spec Playwright"
Cohesion: 0.03
Nodes (86): addonGroupRoutes, categoryRoutes, productRoutes, ref_fs, ref_module, ref_os, ref_path, capVersion (+78 more)

### Community 7 - "Rotte auth, staff e test autorizzazioni"
Cohesion: 0.03
Nodes (92): getJWTSecret(), staffRoutes, jsonwebtoken, bcrypt, buildApp(), express, { getJWTSecret }, { getUserAuthStatus, isTokenRevoked } (+84 more)

### Community 8 - "Inizializzazione e riparazioni DB"
Cohesion: 0.04
Nodes (77): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), buildIdealSchemaDb(), getCurrentSchemaVersion(), getDatabase(), initDatabase(), repairSequences(), runMigrations() (+69 more)

### Community 9 - "Pagina POS e store"
Cohesion: 0.05
Nodes (69): Settings page, Zustand global state, OrdersPage(), normalizeBarcode(), POSPage(), PrepaidAttempt, generateKotHtml(), PaperWidth (+61 more)

### Community 10 - "Server KDS e WebSocket"
Cohesion: 0.08
Nodes (73): buildCspHeader(), attachEffectiveAddons(), getDbHealth(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive() (+65 more)

### Community 11 - "Processo principale, sicurezza e CSP"
Cohesion: 0.04
Nodes (69): areCustomersEnabled(), beginDatabaseShutdown(), WHATSAPP_AVAILABLE, API_JSON_BODY_LIMIT, checkForUpdates(), cleanupCoordinator, createMenu(), createTray() (+61 more)

### Community 12 - "Config Next e storico ordini"
Cohesion: 0.03
Nodes (60): nextConfig, HistoryOrderCard(), formatCurrency(), better-sqlite3, ref_node_assert, ref_node_fs, ref_node_http, ref_node_os (+52 more)

### Community 13 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (71): MIGRATIONS, orderRoutes, roomRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
}, Module (+63 more)

### Community 14 - "Helper di test condivisi"
Cohesion: 0.15
Nodes (74): main(), main(), main(), main(), api(), assert(), assertEqual(), assertIncludes() (+66 more)

### Community 15 - "Geometria tavoli, login e username"
Cohesion: 0.05
Nodes (59): Services/routes split with no import cycle, createGridPlacer(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, defaultTableSize(), isTableShape(), ROOM_MARGIN, TABLE_GAP (+51 more)

### Community 16 - "Ordina, sala e pannello ordine"
Cohesion: 0.08
Nodes (66): isOrderPaid(), OrderPanel(), FixedMenuPicker(), nextTallyKey(), Props, Tally, TableCheckoutModal(), HandheldCart() (+58 more)

### Community 17 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (66): loadBaileys(), abortable(), abortableDelay(), advanceStatus(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers(), baileysLogger, BlocklistRow (+58 more)

### Community 18 - "Test ciclo di vita ordine"
Cohesion: 0.04
Nodes (63): ref_worker_threads, fs, { heldOrderRoutes }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedTable,
  api, assert, assertEqual,
  closeDatabase, getDatabase, now,
}, Module, os, path, testDir (+55 more)

### Community 19 - "Spegnimento pulito"
Cohesion: 0.06
Nodes (55): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeServerResources(), closeWebSocketServer(), createExitCodeAwareShutdown(), createTimeoutError() (+47 more)

### Community 20 - "Prodotti, immagini e controlli UI"
Cohesion: 0.06
Nodes (46): UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, TablesPage(), ElapsedTime() (+38 more)

### Community 21 - "Pagina WhatsApp e tabelle"
Cohesion: 0.05
Nodes (56): BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS, STATUS_STEPS, StatusStep, StatusStepper() (+48 more)

### Community 22 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.06
Nodes (56): now(), upsertSetting(), upsertSettings(), syncCustomerTagCounts(), readInput(), reservationRoutes, router, router (+48 more)

### Community 23 - "Servizio Google Drive"
Cohesion: 0.07
Nodes (35): { contextBridge, ipcRenderer }, BackupFrequency, cancelDriveOperation(), computeFilesToDelete(), createDriveShutdownError(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials() (+27 more)

### Community 24 - "Test impostazioni, valuta e interruttori KDS"
Cohesion: 0.04
Nodes (57): COUNTRIES, settingsRoutes, tests_helpers_test_setup_closedatabase, bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,
}, jwt (+49 more)

### Community 25 - "Pagina impostazioni"
Cohesion: 0.07
Nodes (43): formatBackupSize(), invoicePreviewSegment(), InvoiceResetPeriod, KdsDefaultViewCard(), ORDER_TYPE_SETTING_LABELS, SELECTABLE_LANGUAGES, SettingsKey, SettingsPage() (+35 more)

### Community 26 - "Pannello ordine e cassa POS"
Cohesion: 0.08
Nodes (46): OrderPanel split into header/lines/sheet/totals/action bar, AddonGroupsPage(), LineActionSheet(), DiscountModal, OrderPanelProps, OrdersKey, orderStatusBadge, paymentStatusBadge (+38 more)

### Community 27 - "Servizio menu fisso"
Cohesion: 0.06
Nodes (43): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+35 more)

### Community 28 - "PIN master"
Cohesion: 0.07
Nodes (49): authRoutes, authorizeMasterPin(), checkMasterPinRateLimit(), getMasterPinFilePath(), isMasterPinAvailable(), isMasterPinRateLimited(), isMasterPinSet(), MasterPinAuthResult (+41 more)

### Community 29 - "Idempotenza invio ordine"
Cohesion: 0.09
Nodes (47): APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, AppendAttemptCompletion, AppendAttemptOptions, appendAttemptsMatch(), AppendAttemptStorage, assertVerifiedCompletionReads(), buildAppendItemsFingerprint() (+39 more)

### Community 30 - "Pagina ordini e righe ordine"
Cohesion: 0.07
Nodes (40): Filters, FilterType, OrdersKey, tabLabelKey, Props, OrderHeader(), Props, Props (+32 more)

### Community 31 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.08
Nodes (49): Booked table tile writes booking name and party/seats (5/6) at every size, Change table / Take off this table on a booked table's card, Back to the floor from the booking sheet, Bill of a cancelled order is owed by nobody, Clean shutdown and single-instance lock handling, Customer book switch customers_enabled (migration v79), Dashboard removal, Service day close (+41 more)

### Community 32 - "Rilevamento stampanti"
Cohesion: 0.08
Nodes (49): annotateProfile(), billRowIdentity(), BRIDGE_CHIP_VENDORS, compactBillRows(), compactKotItems(), CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP (+41 more)

### Community 33 - "Test backup e ripristino"
Cohesion: 0.05
Nodes (33): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+25 more)

### Community 34 - "Salute dello schema DB"
Cohesion: 0.08
Nodes (41): appendJsonArray(), deleteBackup(), getSchemaVersionFromBackup(), isManagedBackupFile(), isSafeIdentifier(), ALLOWED_IPC_KEYS, handle(), isTrustedSender() (+33 more)

### Community 35 - "Test paginazione clienti"
Cohesion: 0.05
Nodes (41): customerRoutes, ref_events, { customerRoutes }, fs, { initTestDb, closeDatabase, seedOwnerUser, api, assertEqual, assert, getResults, createApp, startServer }, Module, os, path (+33 more)

### Community 36 - "Doc sala, tavoli ed endpoint"
Cohesion: 0.08
Nodes (41): Business Timestamps Invariant, Services/Routes Boundary for Fork Domains, Reports summary and sales (UTC dates), Reservations endpoints, Rooms endpoints (/api/rooms), Service Days endpoints, Floor plan endpoints (/api/table-layouts), Tables endpoints (/api/tables) (+33 more)

### Community 37 - "Doc giri di comanda e palmare"
Cohesion: 0.08
Nodes (41): Backend Authority Invariant, No Joined Tables (removed in migration v97), Printed Output Languages (RECEIPT_LABELS, en/it only), Idempotency-Key retry-safe append, Order item cancel / void (void_adjustment), order_items.kot_batch round ledger, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, POST /api/orders (guest_count, service_run, menu_selection) (+33 more)

### Community 38 - "Registro lingue i18n"
Cohesion: 0.12
Nodes (31): ServerStandalonePage(), getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS, OrdersKey (+23 more)

### Community 39 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 40 - "Impostazioni e tipi di ordine"
Cohesion: 0.07
Nodes (32): DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType, serializeOrderTypes() (+24 more)

### Community 41 - "Changelog 6.0: menu fisso e coperto"
Cohesion: 0.09
Nodes (39): Any waiter can work any open order, auto_print_kot setting removed, Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), New order starts from the table's covers, Fixed menu (migration v92), Handheld Ordering screen as a list (+31 more)

### Community 42 - "Test DB legacy e stampa scontrino"
Cohesion: 0.08
Nodes (34): closeDatabase(), isNativeAbiMismatch(), assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt } (+26 more)

### Community 43 - "Indice documentazione e contributi"
Cohesion: 0.09
Nodes (33): Bug Report Issue Template, Issue Template Config (contact links), Restaurant Workflow Feedback Template, AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Source of Truth Hierarchy (CURRENT / ACTIVE DESIGN / HISTORICAL), docs/API.md staff routes corrected, Code of Conduct (+25 more)

### Community 44 - "Test quantità addon"
Cohesion: 0.07
Nodes (25): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), { addonGroupRoutes } (+17 more)

### Community 45 - "Import/export menu CSV"
Cohesion: 0.06
Nodes (32): main_routes_menu_csv_menucsvroutes, { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, { menuCsvRoutes }, { MIGRATIONS }, Module (+24 more)

### Community 46 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (32): allowScripts, author, email, name, description, engines, node, homepage (+24 more)

### Community 47 - "Primo avvio e pagina staff"
Cohesion: 0.08
Nodes (27): SELECTABLE_LANGUAGES, SERVICE_MODEL_KEYS, SERVICE_MODELS, ServiceModel, SETUP_PROFILE_KEYS, SETUP_PROFILES, SetupKey, SetupPage() (+19 more)

### Community 48 - "KDS nella dashboard"
Cohesion: 0.11
Nodes (30): KdsColumn(), KdsColumnProps, KdsItemModal(), KdsItemModalProps, DragData, DropData, KdsKanbanBoardProps, KdsTabsView() (+22 more)

### Community 49 - "Normalizzazione username"
Cohesion: 0.10
Nodes (31): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+23 more)

### Community 50 - "Test metodi di pagamento"
Cohesion: 0.06
Nodes (31): billRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+23 more)

### Community 51 - "Disinstallatore Windows e CI"
Cohesion: 0.15
Nodes (32): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+24 more)

### Community 52 - "Spec Playwright RTL"
Cohesion: 0.09
Nodes (6): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), @playwright/test

### Community 53 - "Script kill-ports"
Cohesion: 0.10
Nodes (28): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+20 more)

### Community 54 - "Test servizio e schema WhatsApp"
Cohesion: 0.08
Nodes (30): createShutdownCoordinator(), createShutdownEntrypoints(), ref_node_module, {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs (+22 more)

### Community 55 - "Runner test a shard"
Cohesion: 0.06
Nodes (28): ref_node_child_process, fs, index, mine, packageJsonPath, path, pkg, { spawnSync } (+20 more)

### Community 56 - "Encoder preconto frontend"
Cohesion: 0.16
Nodes (29): menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes, capitalize(), CHARS (+21 more)

### Community 57 - "Rotte ordini e clienti"
Cohesion: 0.08
Nodes (27): createSchema(), NormalizedPhoneResult, normalizeOptionalPhone(), parsePhoneE164(), stripPhoneDigits(), customerReadRateLimit, customerWriteRateLimit, findCustomerByCanonicalOrLegacyPhone() (+19 more)

### Community 58 - "Server e2e e import da dist"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 59 - "Server e2e di test"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 60 - "Giri di comanda (KOT batch)"
Cohesion: 0.09
Nodes (29): claimKotBatch(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), seedServerUser(), addItem() (+21 more)

### Community 61 - "Test traduzioni"
Cohesion: 0.14
Nodes (30): @formatjs/icu-messageformat-parser, assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES (+22 more)

### Community 62 - "Invarianti del fork"
Cohesion: 0.07
Nodes (28): Feature Request Issue Template, Pull Request Template, Full Cross-Platform Matrix Workflow, Release Workflow, Release Notes from CHANGELOG.md, Unsigned Windows NSIS Installer, Release Tag Validation (strict X.Y.Z = package.json), Windows Auto-Update Assets (latest.yml + .exe.blockmap) (+20 more)

### Community 63 - "Allowlist URL e stampa"
Cohesion: 0.11
Nodes (26): dispatchPrint(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus(), getPrintLanguage(), prepareReceipt(), printKOT(), printReceipt() (+18 more)

### Community 64 - "Paesi, valuta e formati"
Cohesion: 0.17
Nodes (23): generateThermalReceiptHtml(), localizedDisplayNamesCache, formatAmount(), calendarOption(), CurrencyUnitAdapter, DEFAULT_COUNTRY_PROFILE, dn, formatCurrencyForTenant() (+15 more)

### Community 65 - "KDS standalone"
Cohesion: 0.14
Nodes (20): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps (+12 more)

### Community 66 - "Test stampa conti"
Cohesion: 0.09
Nodes (25): stopKdsServer(), stopServer(), supertest, app, assert(), { billRoutes }, db, express (+17 more)

### Community 67 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 68 - "Pacchetto frontend"
Cohesion: 0.08
Nodes (25): eslintConfig, eslint, libphonenumber-js, @types/node, typescript, name, private, version (+17 more)

### Community 69 - "Test menu fisso e smistamento comande"
Cohesion: 0.08
Nodes (24): cookableItems(), routeItemsToStations(), { billRoutes }, { fixedMenuRoutes }, { formatKOT, formatReceipt, escPosToText }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedServerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module (+16 more)

### Community 70 - "Layout app e lingua HTML"
Cohesion: 0.14
Nodes (16): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+8 more)

### Community 71 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (20): getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getCachedMessages(), assert(), buildHtmlDocument(), frontendRequire (+12 more)

### Community 72 - "Test RTL delle schermate"
Cohesion: 0.11
Nodes (18): frontend_src_lib_i18n_getlanguagelocale, ALLOWLIST, assert(), frontendRequire, loadComponents(), Module, ROOT, run() (+10 more)

### Community 73 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 74 - "Layout della comanda"
Cohesion: 0.19
Nodes (23): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+15 more)

### Community 75 - "Test spegnimento e Google Drive"
Cohesion: 0.09
Nodes (21): runShutdownSteps(), { initDatabase, closeDatabase }, main(), mockApp, mockSafeStorage, mockShell, Module, openedUrls (+13 more)

### Community 76 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 77 - "API strumenti database"
Cohesion: 0.10
Nodes (21): { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes }, downloadServer (+13 more)

### Community 78 - "Messaggio WhatsApp e test locale UI"
Cohesion: 0.13
Nodes (21): formatDate(), formatAmount(), formatItemsList(), getWhatsAppMessage(), getWhatsAppShareUrl(), captureScreenshot(), { formatDateForTenant, getCountryByCode }, frontendRequire (+13 more)

### Community 79 - "Rotte categorie"
Cohesion: 0.18
Nodes (20): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+12 more)

### Community 80 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 81 - "Layout preconto e report giornata"
Cohesion: 0.24
Nodes (21): addonRows(), capitalize(), coverChargeLabel(), financialRows(), formatClassicReceipt(), formatCompactReceipt(), formatCurrency(), formatReceipt() (+13 more)

### Community 82 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 83 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 84 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 85 - "Test annulli con override"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 86 - "Test sistema sconti"
Cohesion: 0.14
Nodes (18): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+10 more)

### Community 87 - "Test varianti in cucina"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 88 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 89 - "Profili stampante"
Cohesion: 0.12
Nodes (12): getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile, failures (+4 more)

### Community 90 - "Architettura dei tre server e login"
Cohesion: 0.15
Nodes (18): POST /api/auth/login (JWT), KDS and Server App login routes (role-gated), Login lockout (5 attempts, 15 minutes), mDNS advertisement buonapp.local, Role-based access (owner, manager, cashier, server, chef), Staff accounts deactivated, never deleted, Standalone KDS server (:3002), Staff user management (/api/users, /api/staff) (+10 more)

### Community 91 - "Stampa web del preconto"
Cohesion: 0.21
Nodes (17): ensureReceiptMessagesLoaded(), escapeHtml(), formatReceiptDate(), generateBillHtml(), getPaperStyles(), getReceiptTranslator(), ltrSpan(), PaperSize (+9 more)

### Community 92 - "Test API stampanti"
Cohesion: 0.14
Nodes (16): printerRoutes, app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now } (+8 more)

### Community 93 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 94 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 95 - "Doc menu fisso e sconti"
Cohesion: 0.12
Nodes (17): Order, item and bill discounts with limits, Held orders (/api/held-orders), Manager/owner PIN override, Order status transition matrix, fixed_menu_course_products per-dish exceptions (v93), Coperto (cover charge, migrations v88-v90), Menu fisso (fixed menu as a product), insertOrderItemRows() unified row writer (+9 more)

### Community 96 - "Test impostazioni sconti"
Cohesion: 0.15
Nodes (14): assertEqual(), assertIncludes(), fs, http, main(), mockApp, mockIpcMain, Module (+6 more)

### Community 97 - "Doc invarianti, preconto e menu a conteggio"
Cohesion: 0.14
Nodes (16): No Taxation Engine (Architecture Boundary), One Order, One Bill Invariant, Business settings (timezone, currency, localeOptions), compactKotItems / compactBillRows / compactOrderRows, Menu a conteggio (counted fixed menu), planCourseFill matching, printableBillRows (cancelled rows excluded from preconto), Country profiles (main/countries.ts, localeOptions) (+8 more)

### Community 98 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 99 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 100 - "Rotte gruppi addon"
Cohesion: 0.23
Nodes (14): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+6 more)

### Community 101 - "Test rate limit PIN manager"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 102 - "Test autorizzazioni ordini"
Cohesion: 0.15
Nodes (15): bcrypt, express, fs, { getJWTSecret }, {
  initTestDb, startServer, api, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, main(), Module (+7 more)

### Community 103 - "Test backup su Windows"
Cohesion: 0.16
Nodes (15): { authRoutes, getJWTSecret }, check(), Database, { databaseRoutes }, express, fs, {
  initDatabase,
  getDatabase,
  closeDatabase,
  createBackup,
  getCurrentSchemaVersion,
}, jwt (+7 more)

### Community 104 - "README frontend: sala e cucina"
Cohesion: 0.13
Nodes (15): BuonApp UI (frontend README), BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Joined tables and saved floor plans, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page (+7 more)

### Community 105 - "Manutenzione DB e server KDS"
Cohesion: 0.15
Nodes (14): bcrypt, Database, fs, { getJWTSecret, authRoutes }, { initDatabase, getDbPath }, {
  initTestDb, createApp, assertEqual, getResults, getDatabase, closeDatabase, now,
}, { isTokenRevoked, revokeToken }, jwt (+6 more)

### Community 106 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 108 - "Sessione e API del palmare"
Cohesion: 0.26
Nodes (11): apiErrorCode(), clearServerToken(), createServerApi(), newIdempotencyKey(), readServerToken(), SERVER_APP_TOKEN_KEY, storeServerToken(), ServerSession (+3 more)

### Community 109 - "Test RTL di KDS, palmare e WhatsApp"
Cohesion: 0.19
Nodes (13): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), dummyStorage, frontendRequire, loadComponents() (+5 more)

### Community 110 - "Test letture addon (KDS)"
Cohesion: 0.14
Nodes (13): getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes }, { kitchenRoutes }, Module (+5 more)

### Community 111 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 112 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 113 - "Errori ed encoder ESC/POS"
Cohesion: 0.18
Nodes (12): correlatedError, correlationId(), errorDetails(), FloErrorCode, buildEscPos(), buildTestPage(), columnsForPaperWidth(), encodeCodePageLine() (+4 more)

### Community 114 - "Test larghezza carta"
Cohesion: 0.19
Nodes (12): escPosToText(), initPrinter(), warmUpPrintHelper(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main() (+4 more)

### Community 115 - "Import CSV del menu"
Cohesion: 0.18
Nodes (7): AddonGroupImportPlan, CsvImportError, NumericParseResult, parseCSV(), router, TEMPLATES, toObjects()

### Community 116 - "Test primo avvio"
Cohesion: 0.23
Nodes (12): { authRoutes }, count(), express, { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS }, isNativeAbiMismatch(), listen(), main(), mockApp (+4 more)

### Community 117 - "Test contratto KDS"
Cohesion: 0.15
Nodes (12): bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, seedOwnerUser, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsRoutes }, Module, { orderItemRoutes } (+4 more)

### Community 118 - "Finestra principale e zoom"
Cohesion: 0.30
Nodes (12): Handheld catalogue/settings refresh on tick and visibility, Ordering product grid columns from its own container, Release 6.0.1 - real-service corrections, Window zoom lowered on small screens (90% on till, min 75%), Cached C# DLL for USB raw ESC/POS printing on Windows, Window sized to display work area (1024x768 till), Ordina: table heads the ticket, compact tiles counted on grid width, Page zoom on small screens (webPreferences.zoomFactor) (+4 more)

### Community 119 - "Test ruolo server del palmare"
Cohesion: 0.26
Nodes (11): ref_node_net, DISH_PHOTO, getFreeTcpPort(), getJson(), main(), Module, postJson(), rawGetStatus() (+3 more)

### Community 120 - "Test preferenze locale"
Cohesion: 0.20
Nodes (11): assert, {
  createApp,
  startServer,
  seedOwnerUser,
  api,
  initTestDb,
  getDatabase,
  closeDatabase,
  now,
}, fs, main(), Module, os, path, setSetting() (+3 more)

### Community 121 - "Pannello preferenze locale"
Cohesion: 0.25
Nodes (10): CALENDAR_LABELS, CURRENCY_DISPLAY_LABELS, DIGIT_LABELS, LocalePreferencesPanel(), Props, SettingsKey, CalendarMode, CountryLocaleOptions (+2 more)

### Community 122 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 123 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 124 - "Verifica runtime Electron"
Cohesion: 0.27
Nodes (9): fail(), classifyQuarantine(), { execFileSync }, fs, main(), path, readQuarantine(), { classifyQuarantine } (+1 more)

### Community 125 - "Test integrità pagamenti"
Cohesion: 0.18
Nodes (10): { billRoutes }, fs, {
  initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  seedCustomer, seedWalletCredit, api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path, { reportRoutes } (+2 more)

### Community 126 - "Screenshot POS (FloCafe)"
Cohesion: 0.22
Nodes (10): Cart Panel, Customer Phone Lookup with Name Auto-fill, FloCafe Upstream Branding, Order Type Selector (Dine in / Takeaway / Delivery), POS Order Entry Screen, Printer Selector, Product Grid with Category Filters, BuonApp POS Screenshot (+2 more)

### Community 127 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 128 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 129 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 130 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 131 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 132 - "Test coperto"
Cohesion: 0.20
Nodes (9): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os, path, { settingsRoutes } (+1 more)

### Community 133 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }, run()

### Community 134 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 135 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 136 - "Test riconciliazione conti"
Cohesion: 0.22
Nodes (8): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path, testDir

### Community 137 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 138 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 139 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 141 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 142 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 143 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 144 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 145 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 146 - "Test ricerca per telefono"
Cohesion: 0.29
Nodes (5): { assertEqual, assert }, { buildIdealSchemaDb }, db, ins, Module

### Community 147 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 148 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (6): Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 149 - "Selettore fuso orario"
Cohesion: 0.47
Nodes (5): TimeZoneSelect(), TimeZoneSelectProps, isValidTimeZone(), listTimeZones(), validBusinessLocation()

### Community 150 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 151 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 152 - "Azioni menu protette da PIN"
Cohesion: 0.80
Nodes (5): MenuActionHandler(), beginPinGatedAction(), handlePinSubmit(), runBackup(), runRestore()

### Community 153 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

### Community 154 - "Invio stampe ed errori"
Cohesion: 0.70
Nodes (5): classifyPrintFailure(), extractPlatformErrorCode(), printKOTDetailed(), printReceiptDetailed(), reportPrintFailure()

### Community 155 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 156 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 157 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 158 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 159 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 160 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 161 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

### Community 162 - "Rubrica clienti opzionale"
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
- `No Joined Tables (removed in migration v97)` → `Handheld has no cash, table writes, customers or takeaway`  [AMBIGUOUS]
  docs/palmare.md · relation: conceptually_related_to

## Knowledge Gaps
- **2115 isolated node(s):** `BusinessTypeKey`, `StaffRoleKey`, `InvoiceResetPeriod`, `SettingsKey`, `TemplateCard` (+2110 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2418 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **What is the exact relationship between `No Joined Tables (removed in migration v97)` and `Handheld has no cash, table writes, customers or takeaway`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `getCountryByCode()` connect `Paesi, valuta e formati` to `Moduli e UI condivisa`, `Ordini, conti e importi`, `Pagina POS e store`, `Config Next e storico ordini`, `Helper di test condivisi`, `Geometria tavoli, login e username`, `Ordina, sala e pannello ordine`, `Pagina WhatsApp e tabelle`, `Tavoli, prenotazioni e giornata`, `Test impostazioni, valuta e interruttori KDS`, `Pannello ordine e cassa POS`, `Rilevamento stampanti`, `Demo storico ordini`, `Impostazioni e tipi di ordine`, `Primo avvio e pagina staff`, `Encoder preconto frontend`, `Messaggio WhatsApp e test locale UI`, `Profili stampante`, `Stampa web del preconto`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._