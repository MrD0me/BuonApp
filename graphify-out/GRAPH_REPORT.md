# Graph Report - BuonApp  (2026-10-20)

## Corpus Check
- 562 files · ~863,905 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5439 nodes · 15008 edges · 186 communities (173 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 581 edges (avg confidence: 0.86)
- Token cost: 99,086 input · 0 output

## Community Hubs (Navigation)
- PIN master, config Next e API database
- Script npm del backend
- Componenti UI base
- Schermate del palmare e menu fisso
- Sala, Giornata e pannello ordine
- Pagina impostazioni
- Test autorizzazioni ordini
- Server KDS e WebSocket
- Database, backup e ripristino
- Pagina Giornata e componenti UI
- Test riconciliazione conti
- Store e componenti della cassa
- Inizializzazione e riparazioni DB
- Spegnimento pulito
- Idempotenza invio ordine
- Test tavoli, prenotazioni, giornate
- Servizio WhatsApp (Baileys)
- Salute dello schema DB e IPC
- Helper di test condivisi
- Test auth clienti, conti e pagamenti
- Tavoli, prenotazioni e giornata
- Coda d'invio del palmare
- Impostazioni, ordini e sconti
- Staff, clienti e impostazioni
- Rilevamento stampanti
- Disinstallatore Windows e CI
- Servizio Google Drive
- Test KDS, comande e letture addon
- Changelog 4.x: sala e prenotazioni
- Geometria dei tavoli e della sala
- Spec Playwright RTL
- Paesi, valuta e formati
- Test ciclo di vita ordine
- Pagina di primo avvio
- Registro lingue i18n
- Test impostazioni locali e coperto
- Tipi WebUSB
- Test catalogo e spec Playwright
- Pagina prodotti
- Server, sicurezza e spegnimento
- Rotte delle impostazioni
- Test backup e ripristino
- Test RTL delle schermate
- KDS nella dashboard
- Normalizzazione username
- Doc menu a conteggio e righe compatte
- Rifacimento grafico, finestra e zoom
- Dipendenze e engine backend
- Telefoni e rotte clienti
- Test menu fisso, PIN e autorizzazioni
- Giri di comanda (KOT batch)
- Servizio menu fisso
- Server e2e e import da dist
- Server e2e di test
- Layout app e lingua HTML
- Sconti e incasso anticipato
- Encoder preconto frontend
- Allowlist URL e stampa
- Test traduzioni
- README e schermate di sala
- Indice documentazione e contributi
- Changelog: palmare e comande
- Doc giornata, prenotazioni e invarianti
- Layout preconto e report giornata
- Test errori localizzati
- Changelog 6.x: sconti, coperto e prezzi
- Auth e dati demo
- Test schema WhatsApp e spegnimento
- Pacchetto frontend
- Script kill-ports
- Processo principale Electron
- Bozza della comanda sul palmare
- KDS standalone
- Hook usePrinter e tipi stampa
- Test metodi di pagamento e PIN manager
- Test paginazione clienti
- Rifiuti e ripetizioni ordini
- Pagina prova stampa e dati di test
- Provider i18n e fuso SSR
- Rotte gruppi addon
- Figlio test avvio fallito
- Doc login, ruoli e server
- Doc sala, tavoli ed endpoint
- Rotte prodotti e immagini remote
- Profili stampante
- Test clienti e autorizzazioni
- DevDependencies backend
- Layout della comanda
- Rotte categorie
- Test coperto e pagamenti
- Test varianti in cucina
- Dipendenze frontend
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Limiti per account e clienti
- Config shadcn
- tsconfig frontend
- Test addon su righe ordine
- Sessione e API del palmare
- Test quantità addon
- Stampa web del preconto
- Test API stampanti
- Dipendenze runtime backend
- Test impostazioni sconti
- tsconfig backend
- Pannello preferenze locale
- Indietro nel palmare
- Ordini sospesi e service worker
- Tipi d'ordine e impostazioni
- Tipi receipt-printer-encoder
- Validazione e limiti gruppi addon
- Test stampa conti
- Invarianti del fork
- Comande stampate a giri
- Proxy del palmare e allowlist
- Messaggio WhatsApp e test locale UI
- Doc comande, palmare e tre server
- DevDependencies frontend
- README frontend: sala e cucina
- Script shard, metainfo e quarantena
- Test ripetizioni e guardia tavolo
- Test fondamenta RTL
- tsconfig dei test
- Servizio stampante frontend
- Import/export menu CSV
- Test primo avvio
- Test giri di servizio
- Test bozza del palmare
- Test coda d'invio
- Test larghezza carta
- Test stampa scontrino
- Script verifica runtime e quarantena
- Verifica runtime Electron
- Palmare affidabile (6.6.0)
- Test numerazione ordini e conti
- Config electron-builder
- Build macOS
- Test simbolo valuta in stampa
- Stampa di rete e taglio (6.6.2)
- Override frontend
- Manifest PWA
- Badge dietetici
- Build Snap
- Test recupero stato auth
- Test rimedi audit i18n
- Test crash codice paese Windows
- Changelog: menu fisso e palmare (6.6.x)
- Cache di avvio
- Build Linux
- Social preview (FloCafe)
- KDS legacy renderer
- Build AppX
- Test chunk delle lingue
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- README frontend: cassa e ordini
- Tipi API Electron
- Voce desktop Linux
- Script afterPack
- Test disinstallazione Windows
- Script frontend
- Disinstallatore macOS
- Test messaggi di login
- Logo frontend
- Errori API frontend
- Errori e stampa termica
- Stampa termica e invio
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Marchio BuonApp
- Build Windows
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
1. `getDatabase()` - 165 edges
2. `scripts` - 161 edges
3. `cn()` - 137 edges
4. `now()` - 135 edges
5. `assertEqual()` - 121 edges
6. `initTestDb()` - 121 edges
7. `react` - 113 edges
8. `getResults()` - 107 edges
9. `createApp()` - 106 edges
10. `assert()` - 103 edges

## Surprising Connections (you probably didn't know these)
- `Legacy send attempts adopted into the queue` --references--> `adoptLegacyAttempts()`  [INFERRED]
  docs/palmare.md → frontend/src/components/server-app/send-queue.ts
- `Dishes go back to the cart only when the PC surely lacks them` --references--> `canPutBack()`  [INFERRED]
  docs/palmare.md → frontend/src/components/server-app/send-queue.ts
- `SegmentedControl()` --implements--> `Order status tabs with counts (Tutti, Attivo, Non pagato, In sospeso)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/giornata.webp
- `SegmentedControl()` --implements--> `Room tabs with table counts (Sala 13, Terrazzino 4)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/sala.webp
- `Order Workflows (dine-in, takeaway, delivery)` --semantically_similar_to--> `Ordina composes and sends, never takes payment`  [INFERRED] [semantically similar]
  README.md → docs/order-flow-and-navigation.md

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, docs_i18n_decoupled_language_tenant, agents_one_order_one_bill, agents_no_joined_tables, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **FixedMenuPicker counting window rules** — docs_coperto_e_menu_fisso_fixed_menu_picker, docs_coperto_e_menu_fisso_menu_count_field, docs_coperto_e_menu_fisso_stable_rows, docs_coperto_e_menu_fisso_portion_note [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **Handheld screens as browser history entries (Sala, table, Ordina)** — docs_palmare_back_button, docs_palmare_sala_view, docs_palmare_table_screen, docs_palmare_ordina_view [EXTRACTED 1.00]
- **Three queue rules that stop a dish being sent twice** — docs_palmare_send_queue, docs_palmare_frozen_at_tap, docs_palmare_backend_decides_opener, docs_palmare_put_back_only_when_safe [EXTRACTED 1.00]
- **Reliable handheld (palmare-affidabile, 2026-10-08)** — docs_palmare_send_queue, docs_palmare_handheld_draft, docs_palmare_back_button, docs_palmare_connection_probe, docs_palmare_status_header, docs_palmare_phone_performance [EXTRACTED 1.00]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **Booked tables legible on the till's 1024x768 map** — docs_table_management_till_screen_fit, docs_table_management_booked_tile_label, docs_table_management_unseated_chips, docs_table_management_service_fit_to_tables, docs_table_management_size_presets [EXTRACTED 1.00]
- **Retry-safe order writes for handhelds (idempotency key, table-free guard, refusal codes, per-account limits)** — docs_api_idempotency_key, docs_api_only_if_table_free, docs_api_order_refusal_codes, docs_api_order_rate_limits [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Order discount given as a new total** — docs_order_flow_and_navigation_discount_new_total, docs_order_flow_and_navigation_discount_methods, docs_order_flow_and_navigation_discount_carry_rule, main_services_discounts_discountfortargettotal, main_services_discounts_enableddiscountmethods, main_services_discounts_carryorderdiscount, frontend_src_components_orders_orderdiscountmodal_orderdiscountmodal [INFERRED 0.85]
- **Orange 'da inviare' marker for the same table on every screen** — readme_status_colours, docs_images_sala_floor_map_canvas, docs_images_giornata_order_rows, docs_images_tavolo_order_lines_by_run, docs_images_palmare_table_list [INFERRED 0.85]
- **SegmentedControl tabs with counts reused on till and handheld** — frontend_src_components_ui_segmented_control_segmentedcontrol, docs_images_sala_room_tabs, docs_images_giornata_status_filter_tabs, docs_images_palmare_menu_stepper_list [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Service run set at order entry, shown on the table card, printed as ticket sections** — docs_images_ordina_service_run_selector, docs_images_tavolo_order_lines_by_run, docs_images_comanda_service_run_sections, readme_kitchen_tickets_by_round [INFERRED 0.85]
- **Electron main process servers (:3001 API, :3002 KDS, :3003 Server App)** — readme_express_api, readme_kds_server, readme_server_app_handheld [EXTRACTED 1.00]
- **6.5.1 discount window: new total, round figures, removal, per-method switches, carry rule** — changelog_new_total_discount, changelog_round_figure_proposals, changelog_remove_discount, changelog_discount_window, changelog_discount_methods_switches, changelog_order_discount_carry_rule [EXTRACTED 1.00]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fixed-menu window steadied on handheld and till** — changelog_fixed_menu_stable_rows, changelog_fixed_menu_portion_note_icon, frontend_src_components_pos_fixedmenupicker_fixedmenupicker, docs_palmare_shared_pos_modals [INFERRED 0.85]
- **Fork removals: taxation, split checks, joined tables, small tables, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off, changelog_joined_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Reliable handheld in 6.6.0 (send queue, draft, back history)** — changelog_offline_send_queue, changelog_handheld_draft, changelog_handheld_back_history, changelog_reaching_the_pc, changelog_single_pending_attempt_removed [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **A shared note travels as a quantity: window tally, read-back fold, server choice** — changelog_fixed_menu_note_counts_portions, frontend_src_components_pos_fixedmenupicker_tally, frontend_src_lib_fixed_menu_tallyselection, main_services_fixed_menu_choiceportions [INFERRED 0.85]
- **Order API changes behind the send queue (per-account limits, refusal codes, replay first)** — changelog_per_account_rate_limit, changelog_order_api_refusal_codes, changelog_idempotency_replay_first, changelog_only_if_table_free, main_routes_orders [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid, booked tiles, legend row)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom, changelog_booked_tile_name_and_party, changelog_unseated_bookings_in_legend_row, changelog_service_map_fits_tables, changelog_small_table_size_removal [INFERRED 0.85]

## Communities (186 total, 13 thin omitted)

### Community 0 - "PIN master, config Next e API database"
Cohesion: 0.02
Nodes (144): nextConfig, requireMasterPin(), authRoutes, databaseRoutes, databaseToolsRoutes, authorizeMasterPin(), checkMasterPinRateLimit(), getMasterPinFilePath() (+136 more)

### Community 1 - "Script npm del backend"
Cohesion: 0.01
Nodes (161): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+153 more)

### Community 2 - "Componenti UI base"
Cohesion: 0.03
Nodes (123): BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS, STATUS_STEPS, StatusStep, StatusStepper() (+115 more)

### Community 3 - "Schermate del palmare e menu fisso"
Cohesion: 0.04
Nodes (127): Note line counter (light red -, plate count, light green +) before the note, AttachToMenuModal and ServiceRunPicker, FixedMenuPicker window (counted menu), Note-line counter (one note for several equal portions), Per-portion note icon in the dish row, Nothing moves under the finger (fixed-width dish row controls), Bottom ticket bar (Comanda 4, 50,00 EUR), Products without options go straight to the ticket (lib/product-options.ts) (+119 more)

### Community 4 - "Sala, Giornata e pannello ordine"
Cohesion: 0.04
Nodes (93): Handheld Server App screenshot (Palmare), Menu with a stepper beside each dish, Floor as a list of table tiles, Sala view (table list per room, natural order, status band and pill), Filters, FilterType, OrdersKey, tabLabelKey (+85 more)

### Community 5 - "Pagina impostazioni"
Cohesion: 0.05
Nodes (72): BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage(), DISCOUNT_METHOD_ROWS, formatBackupSize() (+64 more)

### Community 6 - "Test autorizzazioni ordini"
Cohesion: 0.02
Nodes (99): getJWTSecret(), bcryptjs, jsonwebtoken, bcrypt, buildApp(), express, { getJWTSecret }, { getUserAuthStatus, isTokenRevoked } (+91 more)

### Community 7 - "Server KDS e WebSocket"
Cohesion: 0.06
Nodes (92): buildCspHeader(), attachEffectiveAddons(), databaseMaintenanceMiddleware(), getDbHealth(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments() (+84 more)

### Community 8 - "Database, backup e ripristino"
Cohesion: 0.04
Nodes (97): appendJsonArray(), captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), clampFinancialYearStart(), createBackupUnlocked(), createDatabaseShutdownError() (+89 more)

### Community 9 - "Pagina Giornata e componenti UI"
Cohesion: 0.05
Nodes (74): OrderPanel split into header/lines/sheet/totals/action bar, DayDetailModal(), DayDetailModalProps, ServiceDaysPage(), Ltr(), LtrProps, LineActionSheet(), OrderActionBar() (+66 more)

### Community 10 - "Test riconciliazione conti"
Cohesion: 0.03
Nodes (79): main_routes_menu_csv_menucsvroutes, ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module (+71 more)

### Community 11 - "Store e componenti della cassa"
Cohesion: 0.05
Nodes (60): Staff roles (Owner, Manager, Cashier, Server, Chef), WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), CustomersPage(), WhatsAppConsole() (+52 more)

### Community 12 - "Inizializzazione e riparazioni DB"
Cohesion: 0.04
Nodes (77): autoRepairPaymentDetails(), captureUserSecurityState(), closeDatabase(), createBackup(), getDbPath(), initDatabase(), mergeUserSecurityState(), repairSequences() (+69 more)

### Community 13 - "Spegnimento pulito"
Cohesion: 0.05
Nodes (71): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeServerResources(), closeWebSocketServer(), createExitCodeAwareShutdown(), createShutdownCoordinator() (+63 more)

### Community 14 - "Idempotenza invio ordine"
Cohesion: 0.06
Nodes (69): normalizeBarcode(), POSPage(), PrinterStatus(), PosKey, Props, statusStyles, TablePickerModal(), useBarcodeScanner() (+61 more)

### Community 15 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (72): MIGRATIONS, orderRoutes, roomRoutes, serviceDayRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
} (+64 more)

### Community 16 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (71): libphonenumber-js, loadBaileys(), getDatabase(), getSettingValue(), abortable(), abortableDelay(), addToBlocklist(), advanceStatus() (+63 more)

### Community 17 - "Salute dello schema DB e IPC"
Cohesion: 0.05
Nodes (58): buildIdealSchemaDb(), getCurrentSchemaVersion(), getSchemaVersionFromBackup(), isManagedBackupFile(), runMigrations(), ALLOWED_IPC_KEYS, handle(), isTrustedSender() (+50 more)

### Community 18 - "Helper di test condivisi"
Cohesion: 0.15
Nodes (72): main(), main(), main(), api(), assert(), assertEqual(), assertIncludes(), createApp() (+64 more)

### Community 19 - "Test auth clienti, conti e pagamenti"
Cohesion: 0.04
Nodes (58): bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken(), Module (+50 more)

### Community 20 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.07
Nodes (53): autoRepairDefaultPrinter(), businessDateToday(), now(), upsertSetting(), readInput(), reservationRoutes, router, router (+45 more)

### Community 21 - "Coda d'invio del palmare"
Cohesion: 0.09
Nodes (55): Ticket waits on the phone when the Wi-Fi drops (send queue), only_if_table_free on a ticket that opens a table, One unanswered send no longer blocks every send (single pending attempt replaced by the queue), 30-minute auto-send limit (Invia lo stesso), Queue retry policy by response class, QueueSheet(), adoptLegacyAttempts(), AppendBody (+47 more)

### Community 22 - "Impostazioni, ordini e sconti"
Cohesion: 0.06
Nodes (42): parseRowJson(), utcDayBounds(), utcTodayDate(), verifyPin(), withTxn(), computeCoverCharge(), COVER_CHARGE_SETTING_KEY, orderCharges() (+34 more)

### Community 23 - "Staff, clienti e impostazioni"
Cohesion: 0.06
Nodes (35): docs/API.md staff routes corrected, upsertSettings(), asyncHandler(), requireRole(), fixedMenuRoutes, router, inlineCustomerLookupRateLimit, inlineOrderWriteRateLimit (+27 more)

### Community 24 - "Rilevamento stampanti"
Cohesion: 0.07
Nodes (51): annotateProfile(), billRowIdentity(), BRIDGE_CHIP_VENDORS, compactBillRows(), compactKotItems(), CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP (+43 more)

### Community 25 - "Disinstallatore Windows e CI"
Cohesion: 0.08
Nodes (47): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+39 more)

### Community 26 - "Servizio Google Drive"
Cohesion: 0.10
Nodes (23): BackupFrequency, cancelDriveOperation(), computeFilesToDelete(), createDriveShutdownError(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials(), getTokenFilePath() (+15 more)

### Community 27 - "Test KDS, comande e letture addon"
Cohesion: 0.05
Nodes (44): kdsRoutes, orderItemRoutes, getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes } (+36 more)

### Community 28 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.09
Nodes (45): Booked table tile writes booking name and party/seats (5/6) at every size, Change table / Take off this table on a booked table's card, Back to the floor from the booking sheet, Bill of a cancelled order is owed by nobody, Clean shutdown and single-instance lock handling, New order starts from the table's covers, Customer book switch customers_enabled (migration v79), Dashboard removal (+37 more)

### Community 29 - "Geometria dei tavoli e della sala"
Cohesion: 0.09
Nodes (33): Services/routes split with no import cycle, DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, defaultTableSize(), isTableShape(), ROOM_MARGIN, TABLE_GAP, TABLE_SHAPES (+25 more)

### Community 30 - "Spec Playwright RTL"
Cohesion: 0.06
Nodes (11): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), managerToken, post(), run (+3 more)

### Community 31 - "Paesi, valuta e formati"
Cohesion: 0.11
Nodes (33): OrderHistoryGrid(), formatAmount(), build(), cachedNumberFormat(), calendarOption(), COUNTRIES_BY_CODE, currencyNumberFormat(), CurrencyUnitAdapter (+25 more)

### Community 32 - "Test ciclo di vita ordine"
Cohesion: 0.06
Nodes (39): ref_worker_threads, bcrypt, fs, http, { initDatabase, getDatabase, closeDatabase, now }, jwt, IMPORTANT: Each test file must mock Electron BEFORE importing this helper., resetCounters() (+31 more)

### Community 33 - "Pagina di primo avvio"
Cohesion: 0.08
Nodes (33): SELECTABLE_LANGUAGES, SERVICE_MODEL_KEYS, SERVICE_MODELS, ServiceModel, SETUP_PROFILE_KEYS, SETUP_PROFILES, SetupKey, SetupPage() (+25 more)

### Community 34 - "Registro lingue i18n"
Cohesion: 0.11
Nodes (32): ServerStandalonePage(), getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS, OrdersKey (+24 more)

### Community 35 - "Test impostazioni locali e coperto"
Cohesion: 0.05
Nodes (37): settingsRoutes, assert, {
  createApp,
  startServer,
  seedOwnerUser,
  api,
  initTestDb,
  getDatabase,
  closeDatabase,
}, fs, Module, os, path, { settingsRoutes } (+29 more)

### Community 36 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 37 - "Test catalogo e spec Playwright"
Cohesion: 0.05
Nodes (36): addonGroupRoutes, categoryRoutes, productRoutes, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path (+28 more)

### Community 38 - "Pagina prodotti"
Cohesion: 0.07
Nodes (28): AddonGroupsPage(), CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, ElapsedTime(), formatElapsed() (+20 more)

### Community 39 - "Server, sicurezza e spegnimento"
Cohesion: 0.08
Nodes (34): getKdsPort(), stopKdsServer(), clearRevokedTokens(), invalidateUserAuthCache(), isAllowedPrivateIp(), stopServerApp(), stopServer(), createShutdownCancellationError() (+26 more)

### Community 40 - "Rotte delle impostazioni"
Cohesion: 0.07
Nodes (30): DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType, serializeOrderTypes() (+22 more)

### Community 41 - "Test backup e ripristino"
Cohesion: 0.06
Nodes (29): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+21 more)

### Community 42 - "Test RTL delle schermate"
Cohesion: 0.07
Nodes (31): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_getlanguagelocale, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), frontendRequire, loadComponents() (+23 more)

### Community 43 - "KDS nella dashboard"
Cohesion: 0.11
Nodes (30): KdsColumn(), KdsColumnProps, KdsItemModal(), KdsItemModalProps, DragData, DropData, KdsKanbanBoardProps, KdsTabsView() (+22 more)

### Community 44 - "Normalizzazione username"
Cohesion: 0.10
Nodes (31): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+23 more)

### Community 45 - "Doc menu a conteggio e righe compatte"
Cohesion: 0.08
Nodes (33): Restaurant Workflow Feedback Template, No Joined Tables (removed in migration v97), One Order, One Bill Invariant, Order item cancel / void (void_adjustment), cancelTargetIds split cancel (package vs dish), compactKotItems / compactBillRows / compactOrderRows, fixed_menu_course_products per-dish exceptions (v93), Coperto (cover charge, migrations v88-v90) (+25 more)

### Community 46 - "Rifacimento grafico, finestra e zoom"
Cohesion: 0.11
Nodes (32): Ordering product grid columns from its own container, Window zoom lowered on small screens (90% on till, min 75%), Touch UI primitives and status colour tokens, Window sized to display work area (1024x768 till), Archivio (past service days, expandable orders), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio), Giornata screen (current service day, not calendar day), Rifacimento grafico (+24 more)

### Community 47 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (31): allowScripts, author, email, name, description, engines, node, homepage (+23 more)

### Community 48 - "Telefoni e rotte clienti"
Cohesion: 0.08
Nodes (28): createSchema(), NormalizedPhoneResult, normalizeOptionalPhone(), parsePhoneE164(), stripPhoneDigits(), customerReadRateLimit, customerWriteRateLimit, findCustomerByCanonicalOrLegacyPhone() (+20 more)

### Community 49 - "Test menu fisso, PIN e autorizzazioni"
Cohesion: 0.07
Nodes (31): registerRoutes(), { billRoutes }, { fixedMenuRoutes }, { formatKOT, formatReceipt, escPosToText }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedServerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, main(), Module (+23 more)

### Community 50 - "Giri di comanda (KOT batch)"
Cohesion: 0.10
Nodes (27): isKotPrintingEnabled(), claimKotBatch(), CONNECTION_TYPES, cookableItems(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), isValidPort() (+19 more)

### Community 51 - "Servizio menu fisso"
Cohesion: 0.14
Nodes (31): attachFixedMenuCourses(), buildMenuRows(), cancelTargetIds(), choiceNote(), choicePortions(), courseAllowsDish(), courseLimit(), courseLimitMessage() (+23 more)

### Community 52 - "Server e2e e import da dist"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 53 - "Server e2e di test"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 54 - "Layout app e lingua HTML"
Cohesion: 0.11
Nodes (22): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+14 more)

### Community 55 - "Sconti e incasso anticipato"
Cohesion: 0.10
Nodes (28): OrdersPage(), PrepaidAttempt, TablesPage(), OrderDiscountModal(), Props, round2(), OrderPanelProps, BUILT_IN_PAYMENT_KEYS (+20 more)

### Community 56 - "Encoder preconto frontend"
Cohesion: 0.16
Nodes (28): menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes, capitalize(), CHARS (+20 more)

### Community 57 - "Allowlist URL e stampa"
Cohesion: 0.11
Nodes (27): buildTestPage(), columnsForPaperWidth(), dispatchPrint(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus(), getPrintLanguage(), prepareReceipt() (+19 more)

### Community 58 - "Test traduzioni"
Cohesion: 0.14
Nodes (30): @formatjs/icu-messageformat-parser, assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES (+22 more)

### Community 59 - "README e schermate di sala"
Cohesion: 0.11
Nodes (30): Business Timestamps Invariant, Services/Routes Boundary for Fork Domains, Reservations endpoints, Floor plan endpoints (/api/table-layouts), Service day screenshot (Giornata), Service day header (Ordini, Coperti, Incasso; Giornata in corso; Chiudi giornata), Till sidebar (Sala, Ordina, Giornata, Menu, Archivio; Palmari, Impostazioni, user, Esci), Order status tabs with counts (Tutti, Attivo, Non pagato, In sospeso) (+22 more)

### Community 60 - "Indice documentazione e contributi"
Cohesion: 0.13
Nodes (25): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Source of Truth Hierarchy (CURRENT / ACTIVE DESIGN / HISTORICAL), Code of Conduct, Contributor Covenant 2.1, AI-Assisted Contributions Policy (+17 more)

### Community 61 - "Changelog: palmare e comande"
Cohesion: 0.10
Nodes (28): Any waiter can work any open order, auto_print_kot setting removed, Dish list no longer jumps to the top (only the category strip scrolls), Cloud bridge and telemetry removal (migration v80), Collapsed sidebar shows centred icons only, Handheld catalogue/settings refresh on tick and visibility, Handheld Ordering screen as a list, Handheld / Server App (:3003) (+20 more)

### Community 62 - "Doc giornata, prenotazioni e invarianti"
Cohesion: 0.12
Nodes (27): Discount after the check changes (percentage recomputed, euros kept), New-total order discount (discount_type total, target_total), Discount settings (/api/settings/discount, discount_methods), Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix, Una regola sola per lo sconto dopo un cambio del conto, discount_methods: ogni metodo di sconto acceso da solo (migrazione v99) (+19 more)

### Community 63 - "Layout preconto e report giornata"
Cohesion: 0.16
Nodes (28): addonRows(), buildEscPos(), capitalize(), coverChargeLabel(), encodeCodePageLine(), financialRows(), formatClassicReceipt(), formatCompactReceipt() (+20 more)

### Community 64 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 65 - "Changelog 6.x: sconti, coperto e prezzi"
Cohesion: 0.13
Nodes (27): Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), Per-method discount switches, discount_methods (migration v99), Discount window opens on the first method switched on, no Cancel button, Folding identical dishes (ticket, table, bill), Line discount follows menu count; cash discount capped, Discount given as the new total (discount_type total, target_total) (+19 more)

### Community 66 - "Auth e dati demo"
Cohesion: 0.10
Nodes (21): DEMO_MENUS, DEMO_TABLE_SEATS, DemoLang, demoLanguage(), DemoMenu, dialCodeFor(), insertCategory(), insertCustomer() (+13 more)

### Community 67 - "Test schema WhatsApp e spegnimento"
Cohesion: 0.08
Nodes (24): ref_node_module, { buildIdealSchemaDb }, Database, getSetting(), main(), tableColumns(), tableIndexes(), { createShutdownEntrypoints } (+16 more)

### Community 68 - "Pacchetto frontend"
Cohesion: 0.08
Nodes (24): eslintConfig, eslint, @types/node, typescript, name, private, version, clsx (+16 more)

### Community 69 - "Script kill-ports"
Cohesion: 0.14
Nodes (23): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+15 more)

### Community 70 - "Processo principale Electron"
Cohesion: 0.11
Nodes (21): beginDatabaseShutdown(), SchemaVersionMismatchError, WHATSAPP_AVAILABLE, checkForUpdates(), cleanupCoordinator, createMenu(), createTray(), initialize() (+13 more)

### Community 71 - "Bozza della comanda sul palmare"
Cohesion: 0.20
Nodes (23): Ticket being written kept on the phone (draft), Ticket saved on the phone (handheld draft), clearDraft(), DRAFT_MAX_AGE_MS, DRAFT_REOPEN_MS, draftKey(), DraftMenuWindow, draftOutcome() (+15 more)

### Community 72 - "KDS standalone"
Cohesion: 0.16
Nodes (18): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps (+10 more)

### Community 73 - "Hook usePrinter e tipi stampa"
Cohesion: 0.12
Nodes (21): HistoryOrder, Props, HardwarePrinter, KotOptions, KotSendResponse, KotSendResult, PaperWidth, PrinterState (+13 more)

### Community 74 - "Test metodi di pagamento e PIN manager"
Cohesion: 0.08
Nodes (23): reportRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  seedCustomer, seedWalletCredit, api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+15 more)

### Community 75 - "Test paginazione clienti"
Cohesion: 0.08
Nodes (23): ref_events, assertGreaterThan(), { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer, seedWalletCredit,
  api, assert, assertEqual, assertGreaterThan,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes } (+15 more)

### Community 76 - "Rifiuti e ripetizioni ordini"
Cohesion: 0.14
Nodes (24): Repeated POST /api/orders answered from the stored Idempotency-Key reply before checks, Order API refusals carry a code (invalid_item, order_closed, insufficient_stock, table_has_open_order, table_not_found, idempotency_conflict), Idempotency-Key retry-safe create and append, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, only_if_table_free guard (open the table only if still free), POST /api/orders/:id/items (append to an open order), POST /api/orders (guest_count, service_run, menu_selection), Order route refusal codes (invalid_item, insufficient_stock, order_closed, table_has_open_order, table_not_found, idempotency_conflict) (+16 more)

### Community 77 - "Pagina prova stampa e dati di test"
Cohesion: 0.20
Nodes (20): generateKotHtml(), generateThermalReceiptHtml(), PaperWidth, PrintTestPage(), TestMode, formatDate(), formatTime(), createTestBill() (+12 more)

### Community 78 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (20): getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getCachedMessages(), assert(), buildHtmlDocument(), frontendRequire (+12 more)

### Community 79 - "Rotte gruppi addon"
Cohesion: 0.13
Nodes (18): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+10 more)

### Community 80 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 81 - "Doc login, ruoli e server"
Cohesion: 0.13
Nodes (23): Backend Authority Invariant, POST /api/auth/login (JWT, rememberMe), Authentication rate limit (10 requests / 15 min per address), KDS and Server App login routes (role-gated), Login lockout (5 attempts, 15 minutes), mDNS advertisement buonapp.local, Role-based access (owner, manager, cashier, server, chef), Server App for handhelds (:3003) (+15 more)

### Community 82 - "Doc sala, tavoli ed endpoint"
Cohesion: 0.13
Nodes (22): Held orders (/api/held-orders), Reports summary and sales (UTC dates), Rooms endpoints (/api/rooms), Service Days endpoints, Tables endpoints (/api/tables), Map MIN_SCALE 0.7 with overflow scroll, BuonApp GitHub social preview card, Booked tile: booking name and party/seats on two lines (+14 more)

### Community 83 - "Rotte prodotti e immagini remote"
Cohesion: 0.12
Nodes (11): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+3 more)

### Community 84 - "Profili stampante"
Cohesion: 0.10
Nodes (17): getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile, printViaNetwork() (+9 more)

### Community 85 - "Test clienti e autorizzazioni"
Cohesion: 0.09
Nodes (21): customerRoutes, { customerRoutes }, fs, { initTestDb, closeDatabase, seedOwnerUser, api, assertEqual, assert, getResults, createApp, startServer }, Module, os, path, testDir (+13 more)

### Community 86 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 87 - "Layout della comanda"
Cohesion: 0.21
Nodes (22): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+14 more)

### Community 88 - "Rotte categorie"
Cohesion: 0.18
Nodes (20): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+12 more)

### Community 89 - "Test coperto e pagamenti"
Cohesion: 0.10
Nodes (20): billRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os, path (+12 more)

### Community 90 - "Test varianti in cucina"
Cohesion: 0.12
Nodes (21): kitchenRoutes, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+13 more)

### Community 91 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 92 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 93 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 94 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 95 - "Limiti per account e clienti"
Cohesion: 0.12
Nodes (19): Order limits counted per account (60 writes / 120 reads a minute), DELETE /api/customers/:id hard erase, Customers endpoints (customers_disabled switch), Per-account order route rate limits (60 writes, 120 reads a minute), areCustomersEnabled(), parseDbTimestamp(), accountRouteRateLimit(), normalizeIpForRateLimit() (+11 more)

### Community 96 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 97 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 98 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 99 - "Sessione e API del palmare"
Cohesion: 0.22
Nodes (14): Connection detection and /api/health probe (connection.ts), isReachable(), listeners, reportReachability(), subscribe(), useConnection(), clearServerToken(), createServerApi() (+6 more)

### Community 100 - "Test quantità addon"
Cohesion: 0.13
Nodes (18): { addonGroupRoutes }, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+10 more)

### Community 101 - "Stampa web del preconto"
Cohesion: 0.21
Nodes (17): ensureReceiptMessagesLoaded(), escapeHtml(), formatReceiptDate(), generateBillHtml(), getPaperStyles(), getReceiptTranslator(), ltrSpan(), PaperSize (+9 more)

### Community 102 - "Test API stampanti"
Cohesion: 0.14
Nodes (16): printerRoutes, app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now } (+8 more)

### Community 103 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 104 - "Test impostazioni sconti"
Cohesion: 0.15
Nodes (16): ref_http, assert(), assertEqual(), assertIncludes(), fs, http, main(), mockApp (+8 more)

### Community 105 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 106 - "Pannello preferenze locale"
Cohesion: 0.16
Nodes (16): No Taxation Engine (Architecture Boundary), Business settings (timezone, currency, localeOptions), Country profiles (main/countries.ts, localeOptions), UI language decoupled from tenant regional settings, Receipt language (English/Italian), Tax-pack Ed25519 signature verification (upstream), CALENDAR_LABELS, CURRENCY_DISPLAY_LABELS (+8 more)

### Community 107 - "Indietro nel palmare"
Cohesion: 0.26
Nodes (15): Back stays inside the app (screens as browser history steps), Back button through browser history (handheld-history.ts), addressFor(), currentDepth(), enterScreen(), entryOf(), HandheldEntry, HandheldPlace (+7 more)

### Community 108 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 109 - "Tipi d'ordine e impostazioni"
Cohesion: 0.16
Nodes (14): Settings page, isSelectable(), ORDER_TYPES_SETTING_KEY, OrdersKey, OrderType, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType (+6 more)

### Community 110 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 111 - "Validazione e limiti gruppi addon"
Cohesion: 0.15
Nodes (7): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean()

### Community 112 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 113 - "Invarianti del fork"
Cohesion: 0.14
Nodes (15): Feature Request Issue Template, Pull Request Template, Full Cross-Platform Matrix Workflow, Unsigned Windows NSIS Installer, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work (+7 more)

### Community 114 - "Comande stampate a giri"
Cohesion: 0.19
Nodes (15): Printed Output Languages (RECEIPT_LABELS, en/it only), order_items.kot_batch round ledger, POST /api/printers/print-kot, isPendingKot (lib/kot.ts), Kitchen tickets screenshot (Comanda), Numbered kitchen-ticket rounds (Comanda n. 1, n. 2), Ticket sectioned by service run (## 1a USCITA / ## 2a USCITA), Ticket header and footer (table, covers, time, round, station; lines, pieces, order number) (+7 more)

### Community 115 - "Proxy del palmare e allowlist"
Cohesion: 0.20
Nodes (14): GET /api/products/:id/image (tokenless dish photo), Unauthenticated product image passthrough with ETag, Server App proxy allowlist (main/server-app.ts), ref_node_net, DISH_PHOTO, getFreeTcpPort(), getJson(), main() (+6 more)

### Community 116 - "Messaggio WhatsApp e test locale UI"
Cohesion: 0.14
Nodes (14): captureScreenshot(), { formatDateForTenant, getCountryByCode }, frontendRequire, { generateBillHtml }, { getWhatsAppMessage, getWhatsAppShareUrl, sendBillViaFlo }, { IntlProvider, useLocale }, { LANGUAGES }, Module (+6 more)

### Community 117 - "Doc comande, palmare e tre server"
Cohesion: 0.18
Nodes (14): Palmari sidebar item (QR modal), Backend decides who opens the table (only_if_table_free, 409 table_has_open_order), Handheld web manifest and safe-area layout, Known limits of the handheld (Cosa resta fuori), Kitchen ticket per order at end of queue round (45 s timeout), Legacy send attempts adopted into the queue, Handheld has no cash, table writes, customers or takeaway, Handheld never imports @/lib/api (+6 more)

### Community 118 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 119 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Saved floor plans and strip of reservations still to place, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 120 - "Script shard, metainfo e quarantena"
Cohesion: 0.14
Nodes (13): date, escapedVersion, { execFileSync }, META_FILE, notes, NOTES_HELPER, path, pkg (+5 more)

### Community 121 - "Test ripetizioni e guardia tavolo"
Cohesion: 0.16
Nodes (13): bcrypt, count(), fs, { getJWTSecret }, {
  initTestDb,
  createApp,
  startServer,
  seedOwnerUser,
  seedCategory,
  seedProduct,
  seedTable,
  api,
  assert,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), Module (+5 more)

### Community 122 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 123 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 125 - "Import/export menu CSV"
Cohesion: 0.18
Nodes (7): AddonGroupImportPlan, CsvImportError, NumericParseResult, parseCSV(), router, TEMPLATES, toObjects()

### Community 126 - "Test primo avvio"
Cohesion: 0.23
Nodes (12): { authRoutes }, count(), express, { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS }, isNativeAbiMismatch(), listen(), main(), mockApp (+4 more)

### Community 127 - "Test giri di servizio"
Cohesion: 0.15
Nodes (12): seedServerUser(), { categoryRoutes }, { fixedMenuRoutes }, fs, { getPendingKotItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedServerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
}, Module, {
  normalizeServiceRun, defaultServiceRunForProduct, resolveServiceRun, groupItemsByServiceRun,
  MAX_SERVICE_RUNS,
} (+4 more)

### Community 128 - "Test bozza del palmare"
Cohesion: 0.21
Nodes (8): assert, draft(), draftModule, line(), MemoryStorage, Module, path, product()

### Community 129 - "Test coda d'invio"
Cohesion: 0.19
Nodes (8): assert, line(), MemoryStorage, Module, path, product(), queue, ticket()

### Community 130 - "Test larghezza carta"
Cohesion: 0.21
Nodes (11): escPosToText(), initPrinter(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main(), Module (+3 more)

### Community 131 - "Test stampa scontrino"
Cohesion: 0.20
Nodes (10): printReceipt(), assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt }, runTests() (+2 more)

### Community 132 - "Script verifica runtime e quarantena"
Cohesion: 0.24
Nodes (10): ref_node_child_process, fail(), classifyQuarantine(), { execFileSync }, fs, main(), path, readQuarantine() (+2 more)

### Community 133 - "Verifica runtime Electron"
Cohesion: 0.18
Nodes (10): args, electronPath, path, rebuildCli, result, runElectronNode(), { spawnSync }, sqliteCheck (+2 more)

### Community 134 - "Palmare affidabile (6.6.0)"
Cohesion: 0.27
Nodes (10): Handheld no longer slows down during a long ticket, useHandheldData polling (catalogue, settings, rooms, open orders), Keeping the phone responsive during long tickets, DishRow, seedTenantFormat(), DEFAULT_SETTINGS, HandheldData, HandheldSettings (+2 more)

### Community 135 - "Test numerazione ordini e conti"
Cohesion: 0.24
Nodes (10): dateStampInTimezone(), generateOrderNumber(), fs, { generateOrderNumber, generateBillNumber, dateStampInTimezone }, {
  initTestDb, getResults, closeDatabase,
  assert, assertEqual,
}, main(), Module, os (+2 more)

### Community 136 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 137 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 138 - "Test simbolo valuta in stampa"
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

### Community 139 - "Stampa di rete e taglio (6.6.2)"
Cohesion: 0.24
Nodes (10): Cut feeds to the printer's own blade (GS V 65, GS V 66 partial) instead of five blank lines, One ticket at a time per network printer (next connects only after the previous connection closes), Release 6.6.2 - end of a long ticket no longer printed on the next one, Kitchen stations routing (1.9.7), CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Ticket tail on the next sheet: Test Print check, feed-to-blade cut (GS V 65/66) points at cutter settings, Network printer takes one ticket at a time (tickets fired together cannot interleave) (+2 more)

### Community 140 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 141 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 142 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 143 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 144 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 145 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }, run()

### Community 146 - "Test crash codice paese Windows"
Cohesion: 0.24
Nodes (9): assert(), assertEqual(), fs, { initDatabase, getDatabase, getCurrentSchemaVersion, MIGRATIONS, now }, main(), Module, os, path (+1 more)

### Community 147 - "Changelog: menu fisso e palmare (6.6.x)"
Cohesion: 0.33
Nodes (9): Fixed menu (migration v92), One note counts several portions in the fixed-menu window, Single-portion note as an icon in the dish's row of the fixed-menu window, Fixed-menu window rows no longer move under the finger, Reaching the PC on start-up instead of the sign-in form, Release 6.6.0 - reliable handheld: offline send queue, draft, back history, Release 6.6.1 - one note counts several portions in the fixed-menu window, Plates sharing a note read back as one line (from the check or the reloaded draft) (+1 more)

### Community 148 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 149 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 150 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 151 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 152 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 153 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 154 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 155 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 156 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (7): Per-item and per-order discounts, new total included, Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 157 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 158 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 159 - "Script afterPack"
Cohesion: 0.29
Nodes (5): ref_child_process, fs, NATIVE_BINARY_NAMES, path, { spawnSync }

### Community 160 - "Test disinstallazione Windows"
Cohesion: 0.29
Nodes (5): path, result, runtime, { spawnSync }, testPath

### Community 161 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 162 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 163 - "Test messaggi di login"
Cohesion: 0.33
Nodes (5): assert, frontendRequire, Module, { parseLoginFailure }, path

### Community 164 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 165 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

### Community 166 - "Errori e stampa termica"
Cohesion: 0.60
Nodes (4): correlatedError, correlationId(), errorDetails(), FloErrorCode

### Community 167 - "Stampa termica e invio"
Cohesion: 0.70
Nodes (5): classifyPrintFailure(), extractPlatformErrorCode(), printKOTDetailed(), printReceiptDetailed(), reportPrintFailure()

### Community 168 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 169 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 170 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 171 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 172 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 173 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

## Ambiguous Edges - Review These
- `Release Notes from CHANGELOG.md` → `Branch Naming & Conventional Commits`  [AMBIGUOUS]
  .github/workflows/release.yml · relation: conceptually_related_to
- `Country profiles (main/countries.ts, localeOptions)` → `Tax-pack Ed25519 signature verification (upstream)`  [AMBIGUOUS]
  docs/security-audit-2.7.0.md · relation: conceptually_related_to
- `Restaurant Workflow Feedback Template` → `One Order, One Bill Invariant`  [AMBIGUOUS]
  .github/ISSUE_TEMPLATE/workflow_feedback.yml · relation: conceptually_related_to
- `connect()` → `KDS WebSocket /kds protocol`  [AMBIGUOUS]
  renderer/kds.html · relation: implements

## Knowledge Gaps
- **2161 isolated node(s):** `NavItem`, `NavKey`, `Props`, `ServerAppInfo`, `Status` (+2156 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2472 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release Notes from CHANGELOG.md` and `Branch Naming & Conventional Commits`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Country profiles (main/countries.ts, localeOptions)` and `Tax-pack Ed25519 signature verification (upstream)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Restaurant Workflow Feedback Template` and `One Order, One Bill Invariant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `connect()` and `KDS WebSocket /kds protocol`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `getCountryByCode()` connect `Paesi, valuta e formati` to `Pagina di primo avvio`, `Componenti UI base`, `Auth e dati demo`, `Stampa web del preconto`, `Rotte delle impostazioni`, `Test riconciliazione conti`, `Pagina prova stampa e dati di test`, `Idempotenza invio ordine`, `Giri di comanda (KOT batch)`, `Helper di test condivisi`, `Tavoli, prenotazioni e giornata`, `Messaggio WhatsApp e test locale UI`, `Profili stampante`, `Encoder preconto frontend`, `Rilevamento stampanti`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `Servizio WhatsApp (Baileys)` to `PIN master, config Next e API database`, `Test larghezza carta`, `Test stampa scontrino`, `Test autorizzazioni ordini`, `Server KDS e WebSocket`, `Database, backup e ripristino`, `Inizializzazione e riparazioni DB`, `Spegnimento pulito`, `Salute dello schema DB e IPC`, `Helper di test condivisi`, `Test crash codice paese Windows`, `Tavoli, prenotazioni e giornata`, `Impostazioni, ordini e sconti`, `Staff, clienti e impostazioni`, `Rilevamento stampanti`, `Servizio Google Drive`, `Geometria dei tavoli e della sala`, `Test ciclo di vita ordine`, `Server, sicurezza e spegnimento`, `Rotte delle impostazioni`, `Telefoni e rotte clienti`, `Test menu fisso, PIN e autorizzazioni`, `Giri di comanda (KOT batch)`, `Servizio menu fisso`, `Allowlist URL e stampa`, `Auth e dati demo`, `Test schema WhatsApp e spegnimento`, `Processo principale Electron`, `Rotte gruppi addon`, `Rotte prodotti e immagini remote`, `Rotte categorie`, `Test varianti in cucina`, `Test integrità prezzi addon`, `Test annulli con override`, `Test sistema sconti`, `Limiti per account e clienti`, `Test addon su righe ordine`, `Test quantità addon`, `Test API stampanti`, `Test impostazioni sconti`, `Validazione e limiti gruppi addon`, `Test stampa conti`, `Import/export menu CSV`, `Test primo avvio`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._