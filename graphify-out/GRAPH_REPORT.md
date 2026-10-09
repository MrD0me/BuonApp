# Graph Report - BuonApp  (2026-10-09)

## Corpus Check
- 5 files · ~862,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5431 nodes · 14982 edges · 188 communities (174 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 565 edges (avg confidence: 0.86)
- Token cost: 201,189 input · 0 output

## Community Hubs (Navigation)
- Script npm del backend
- Componenti UI base
- Schermate del palmare e menu fisso
- Sala, Giornata e pannello ordine
- Pagina impostazioni
- Test autorizzazioni ordini
- Store e componenti della cassa
- Tavoli, prenotazioni e giornata
- Test riconciliazione conti
- Staff, clienti e impostazioni
- Helper di test condivisi
- Test tavoli, prenotazioni, giornate
- Server KDS e WebSocket
- Server, sicurezza e CSP
- Servizio WhatsApp (Baileys)
- Inizializzazione e riparazioni DB
- Config Next e storico ordini
- Spegnimento pulito
- Pagina WhatsApp e tabelle UI
- Database, backup e ripristino
- Pagina prova stampa e dati di test
- PIN master
- Normalizzazione username
- Coda d'invio del palmare
- Idempotenza invio ordine
- Backup, ripristino e import DB
- Impostazioni, ordini e sconti
- Servizio menu fisso
- Test impostazioni locali e coperto
- Test menu fisso, PIN e autorizzazioni
- Registro lingue i18n
- Rilevamento stampanti
- Script shard, metainfo e quarantena
- KDS nella dashboard
- Disinstallatore Windows e CI
- Tipi WebUSB
- Test catalogo e spec Playwright
- Changelog 6.x: sconti, coperto e prezzi
- Giri di comanda (KOT batch)
- Test backup e ripristino
- Test conti, sconti e fuso orario
- Test RTL delle schermate
- Changelog 4.x: sala e prenotazioni
- Doc sala, tavoli ed endpoint
- Test ciclo di vita ordine
- Dipendenze e engine backend
- Test metodi di pagamento e PIN manager
- Encoder preconto frontend
- Salute dello schema DB
- Doc menu a conteggio e righe compatte
- Sconti e incasso anticipato
- Paesi, valuta e formati
- Script kill-ports
- Doc comande, palmare e tre server
- Doc giornata, prenotazioni e invarianti
- Rotte delle impostazioni
- Server e2e e import da dist
- Server e2e di test
- Pagina di primo avvio
- Allowlist URL e stampa
- Test traduzioni
- Indice documentazione e contributi
- Spec Playwright RTL
- Rotte categorie
- Servizio Google Drive
- Test errori localizzati
- Layout della comanda
- Layout preconto e report giornata
- Bozza della comanda sul palmare
- KDS standalone
- Test backup su Windows
- Test clienti e autorizzazioni
- Test paginazione clienti
- Layout app e lingua HTML
- API strumenti database
- Test spegnimento e Google Drive
- Figlio test avvio fallito
- README e schermate di sala
- Palmare affidabile (6.6.0)
- Pacchetto frontend
- Rotte gruppi addon
- Test varianti in cucina
- DevDependencies backend
- Processo principale Electron
- Changelog: palmare e comande
- Dipendenze frontend
- Test DB legacy e stampa scontrino
- Import/export menu CSV
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Config shadcn
- tsconfig frontend
- Test addon su righe ordine
- Sessione e API del palmare
- Pagina prodotti
- Provider i18n e fuso SSR
- Profili stampante
- Frequenza e pulizia backup Drive
- Test quantità addon
- Rifiuti e ripetizioni ordini
- Dipendenze runtime backend
- Test interruttori KDS e comande
- tsconfig backend
- Stampa web del preconto
- Validazione e limiti gruppi addon
- Test impostazioni sconti
- Test API stampanti
- Invarianti del fork
- Doc autenticazione e ruoli
- Indietro nel palmare
- Finestra principale e zoom
- Ordini sospesi e service worker
- Tipi receipt-printer-encoder
- Test stampa conti
- Proxy del palmare e allowlist
- Servizio stampante frontend
- Messaggio WhatsApp e test locale UI
- Test finestra KDS
- Test revoca token
- Comande stampate a giri
- DevDependencies frontend
- README frontend: sala e cucina
- Prodotti, immagini e controlli UI
- Test letture addon (KDS)
- Test ripetizioni e guardia tavolo
- Test fondamenta RTL
- tsconfig dei test
- Test percorso di aggiornamento
- Doc lingue, paesi e niente tasse
- Errori e stampa termica
- Test larghezza carta
- Test bozza del palmare
- Test coda d'invio
- Verifica runtime Electron
- Pagina staff e nomi utente
- Config electron-builder
- Build macOS
- Test stampa scontrino
- Spec resilienza del palmare
- Override frontend
- Manifest PWA
- Badge dietetici
- Pannello preferenze locale
- Tipi d'ordine
- Build Snap
- Test recupero stato auth
- Test rimedi audit i18n
- Test crash codice paese Windows
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
- Test adattatore valuta
- Voce desktop Linux
- Script frontend
- Disinstallatore macOS
- Logo frontend
- Azioni menu protette da PIN
- Errori API frontend
- Stampa termica e invio
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Marchio BuonApp
- Connessioni stampanti
- Build Windows
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
- `SegmentedControl()` --implements--> `Order status tabs with counts (Tutti, Attivo, Non pagato, In sospeso)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/giornata.webp
- `SegmentedControl()` --implements--> `Room tabs with table counts (Sala 13, Terrazzino 4)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/sala.webp
- `Legacy send attempts adopted into the queue` --references--> `adoptLegacyAttempts()`  [INFERRED]
  docs/palmare.md → frontend/src/components/server-app/send-queue.ts
- `only_if_table_free on a ticket that opens a table` --references--> `CreateBody`  [INFERRED]
  CHANGELOG.md → frontend/src/components/server-app/send-queue.ts
- `MenuWindow` --conceptually_related_to--> `FixedMenuPicker window (counted menu)`  [INFERRED]
  frontend/src/components/server-app/OrdinaView.tsx → docs/coperto-e-menu-fisso.md

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, docs_i18n_decoupled_language_tenant, agents_one_order_one_bill, agents_no_joined_tables, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **Handheld screens as browser history entries (Sala, table, Ordina)** — docs_palmare_back_button, docs_palmare_sala_view, docs_palmare_table_screen, docs_palmare_ordina_view [EXTRACTED 1.00]
- **Three queue rules that stop a dish being sent twice** — docs_palmare_send_queue, docs_palmare_frozen_at_tap, docs_palmare_backend_decides_opener, docs_palmare_put_back_only_when_safe [EXTRACTED 1.00]
- **Reliable handheld (palmare-affidabile, 2026-10-08)** — docs_palmare_send_queue, docs_palmare_handheld_draft, docs_palmare_back_button, docs_palmare_connection_probe, docs_palmare_status_header, docs_palmare_phone_performance [EXTRACTED 1.00]
- **Booked tables legible on the till's 1024x768 map** — docs_table_management_till_screen_fit, docs_table_management_booked_tile_label, docs_table_management_unseated_chips, docs_table_management_service_fit_to_tables, docs_table_management_size_presets [EXTRACTED 1.00]
- **Retry-safe order writes for handhelds (idempotency key, table-free guard, refusal codes, per-account limits)** — docs_api_idempotency_key, docs_api_only_if_table_free, docs_api_order_refusal_codes, docs_api_order_rate_limits [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Order discount given as a new total** — docs_order_flow_and_navigation_discount_new_total, docs_order_flow_and_navigation_discount_methods, docs_order_flow_and_navigation_discount_carry_rule, main_services_discounts_discountfortargettotal, main_services_discounts_enableddiscountmethods, main_services_discounts_carryorderdiscount, frontend_src_components_orders_orderdiscountmodal_orderdiscountmodal [INFERRED 0.85]
- **Orange 'da inviare' marker for the same table on every screen** — readme_status_colours, docs_images_sala_floor_map_canvas, docs_images_giornata_order_rows, docs_images_tavolo_order_lines_by_run, docs_images_palmare_table_list [INFERRED 0.85]
- **SegmentedControl tabs with counts reused on till and handheld** — frontend_src_components_ui_segmented_control_segmentedcontrol, docs_images_sala_room_tabs, docs_images_giornata_status_filter_tabs, docs_images_palmare_menu_stepper_list [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Service run set at order entry, shown on the table card, printed as ticket sections** — docs_images_ordina_service_run_selector, docs_images_tavolo_order_lines_by_run, docs_images_comanda_service_run_sections, readme_kitchen_tickets_by_round [INFERRED 0.85]
- **6.5.1 discount window: new total, round figures, removal, per-method switches, carry rule** — changelog_new_total_discount, changelog_round_figure_proposals, changelog_remove_discount, changelog_discount_window, changelog_discount_methods_switches, changelog_order_discount_carry_rule [EXTRACTED 1.00]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fixed-menu window steadied on handheld and till** — changelog_fixed_menu_stable_rows, changelog_fixed_menu_portion_note_icon, frontend_src_components_pos_fixedmenupicker_fixedmenupicker, docs_palmare_shared_pos_modals [INFERRED 0.85]
- **Fork removals: taxation, split checks, joined tables, small tables, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off, changelog_joined_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Reliable handheld in 6.6.0 (send queue, draft, back history)** — changelog_offline_send_queue, changelog_handheld_draft, changelog_handheld_back_history, changelog_reaching_the_pc, changelog_single_pending_attempt_removed [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **Order API changes behind the send queue (per-account limits, refusal codes, replay first)** — changelog_per_account_rate_limit, changelog_order_api_refusal_codes, changelog_idempotency_replay_first, changelog_only_if_table_free, main_routes_orders [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid, booked tiles, legend row)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom, changelog_booked_tile_name_and_party, changelog_unseated_bookings_in_legend_row, changelog_service_map_fits_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Electron main process servers (:3001 API, :3002 KDS, :3003 Server App)** — readme_express_api, readme_kds_server, readme_server_app_handheld [EXTRACTED 1.00]
- **FixedMenuPicker counting window rules** — docs_coperto_e_menu_fisso_fixed_menu_picker, docs_coperto_e_menu_fisso_menu_count_field, docs_coperto_e_menu_fisso_stable_rows, docs_coperto_e_menu_fisso_portion_note [EXTRACTED 1.00]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **A shared note travels as a quantity: window tally, read-back fold, server choice** — changelog_fixed_menu_note_counts_portions, frontend_src_components_pos_fixedmenupicker_tally, frontend_src_lib_fixed_menu_tallyselection, main_services_fixed_menu_choiceportions [INFERRED 0.85]

## Communities (188 total, 14 thin omitted)

### Community 0 - "Script npm del backend"
Cohesion: 0.01
Nodes (161): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+153 more)

### Community 1 - "Componenti UI base"
Cohesion: 0.03
Nodes (103): Collapsed sidebar shows centred icons only, Sidebar with 48 px rows, collapse toggle in page header, ALL_NAV_ITEMS, AppSidebar(), NavItem, NavKey, StatusBar(), AddonModal() (+95 more)

### Community 2 - "Schermate del palmare e menu fisso"
Cohesion: 0.04
Nodes (118): Handheld Server App screenshot (Palmare), Menu with a stepper beside each dish, Floor as a list of table tiles, Bottom ticket bar (Comanda 4, 50,00 EUR), Status header and queue sheet (no banner), Props, OrderLines(), Props (+110 more)

### Community 3 - "Sala, Giornata e pannello ordine"
Cohesion: 0.03
Nodes (109): Touch UI primitives and status colour tokens, Sala view (table list per room, natural order, status band and pill), PageToolbar shared page header, Status colors in one place (status-styles.ts), UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Filters, FilterType, OrdersKey (+101 more)

### Community 4 - "Pagina impostazioni"
Cohesion: 0.03
Nodes (92): BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage(), DISCOUNT_METHOD_ROWS, formatBackupSize() (+84 more)

### Community 5 - "Test autorizzazioni ordini"
Cohesion: 0.02
Nodes (107): getJWTSecret(), bcryptjs, jsonwebtoken, bcrypt, buildApp(), express, { getJWTSecret }, { getUserAuthStatus, isTokenRevoked } (+99 more)

### Community 6 - "Store e componenti della cassa"
Cohesion: 0.06
Nodes (83): Settings page, Staff roles (Owner, Manager, Cashier, Server, Chef), Zustand global state, ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), AddonGroupsPage(), CustomersPage() (+75 more)

### Community 7 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.04
Nodes (87): Services/routes split with no import cycle, businessDateToday(), now(), createGridPlacer(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH, defaultTableSize(), isTableShape() (+79 more)

### Community 8 - "Test riconciliazione conti"
Cohesion: 0.03
Nodes (84): ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module, outDir (+76 more)

### Community 9 - "Staff, clienti e impostazioni"
Cohesion: 0.03
Nodes (72): DELETE /api/customers/:id hard erase, Customers endpoints (customers_disabled switch), createSchema(), getDatabase(), withTxn(), WHATSAPP_AVAILABLE, NormalizedPhoneResult, normalizeOptionalPhone() (+64 more)

### Community 10 - "Helper di test condivisi"
Cohesion: 0.12
Nodes (81): main(), main(), main(), api(), assert(), assertEqual(), assertIncludes(), createApp() (+73 more)

### Community 11 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (72): MIGRATIONS, orderRoutes, roomRoutes, serviceDayRoutes, tableRoutes, { billRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual,

  getResults, closeDatabase,

} (+64 more)

### Community 12 - "Server KDS e WebSocket"
Cohesion: 0.08
Nodes (71): attachEffectiveAddons(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive(), isKdsEnabled(), isKdsStationItemAllowed() (+63 more)

### Community 13 - "Server, sicurezza e CSP"
Cohesion: 0.06
Nodes (61): buildCspHeader(), getDbHealth(), isServerAppEnabled(), API_JSON_BODY_LIMIT, getKdsPort(), stopKdsServer(), resolveContainedPath(), asyncHandler() (+53 more)

### Community 14 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (67): libphonenumber-js, loadBaileys(), abortable(), abortableDelay(), advanceStatus(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers(), baileysLogger (+59 more)

### Community 15 - "Inizializzazione e riparazioni DB"
Cohesion: 0.04
Nodes (65): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), closeDatabase(), getCurrentSchemaVersion(), initDatabase(), repairSequences(), runStartupIntegrityCheck(), authRoutes (+57 more)

### Community 16 - "Config Next e storico ordini"
Cohesion: 0.04
Nodes (57): nextConfig, databaseRoutes, better-sqlite3, ref_node_fs, ref_node_http, ref_node_module, ref_node_os, ref_node_path (+49 more)

### Community 17 - "Spegnimento pulito"
Cohesion: 0.06
Nodes (58): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeServerResources(), closeWebSocketServer(), createExitCodeAwareShutdown(), createShutdownCoordinator() (+50 more)

### Community 18 - "Pagina WhatsApp e tabelle UI"
Cohesion: 0.04
Nodes (56): WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS, STATUS_STEPS (+48 more)

### Community 19 - "Database, backup e ripristino"
Cohesion: 0.05
Nodes (59): areCustomersEnabled(), clampFinancialYearStart(), createDatabaseShutdownError(), createDatabaseShutdownTimeoutError(), createMaintenanceAbortError(), createMaintenanceDrainTimeoutError(), DATABASE_MAINTENANCE_ROUTES, databaseIdleWaiters (+51 more)

### Community 20 - "Pagina prova stampa e dati di test"
Cohesion: 0.07
Nodes (52): OrderPanel split into header/lines/sheet/totals/action bar, generateKotHtml(), generateThermalReceiptHtml(), PaperWidth, PrintTestPage(), TestMode, formatElapsed(), CancelModal (+44 more)

### Community 21 - "PIN master"
Cohesion: 0.07
Nodes (55): getSchemaVersionFromBackup(), isManagedBackupFile(), ALLOWED_IPC_KEYS, handle(), isTrustedSender(), maskSetting(), registerIpcHandlers(), SENSITIVE_SETTING_KEYS (+47 more)

### Community 22 - "Normalizzazione username"
Cohesion: 0.06
Nodes (52): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+44 more)

### Community 23 - "Coda d'invio del palmare"
Cohesion: 0.08
Nodes (58): Ticket waits on the phone when the Wi-Fi drops (send queue), only_if_table_free on a ticket that opens a table, Reaching the PC on start-up instead of the sign-in form, Release 6.6.0 - reliable handheld: offline send queue, draft, back history, One unanswered send no longer blocks every send (single pending attempt replaced by the queue), 30-minute auto-send limit (Invia lo stesso), Dishes go back to the cart only when the PC surely lacks them, Queue retry policy by response class (+50 more)

### Community 24 - "Idempotenza invio ordine"
Cohesion: 0.09
Nodes (53): normalizeBarcode(), POSPage(), APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, AppendAttemptCompletion, AppendAttemptOptions, appendAttemptsMatch(), AppendAttemptStorage (+45 more)

### Community 25 - "Backup, ripristino e import DB"
Cohesion: 0.08
Nodes (55): appendJsonArray(), captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), createBackupUnlocked(), dataOnlyRestore(), deleteBackup() (+47 more)

### Community 26 - "Impostazioni, ordini e sconti"
Cohesion: 0.06
Nodes (44): insertOrderItemAddons(), parseRowJson(), utcDayBounds(), utcTodayDate(), verifyPin(), computeCoverCharge(), COVER_CHARGE_SETTING_KEY, orderCharges() (+36 more)

### Community 27 - "Servizio menu fisso"
Cohesion: 0.06
Nodes (43): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+35 more)

### Community 28 - "Test impostazioni locali e coperto"
Cohesion: 0.04
Nodes (51): settingsRoutes, { billRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual,

  getResults, closeDatabase, now,

}, Module, { orderRoutes }, os, path (+43 more)

### Community 29 - "Test menu fisso, PIN e autorizzazioni"
Cohesion: 0.05
Nodes (46): registerRoutes(), { billRoutes }, { fixedMenuRoutes }, { formatKOT, formatReceipt, escPosToText }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedServerUser, seedCategory, seedProduct,

  api, assert, assertEqual,

  getResults, closeDatabase, now,

}, main(), Module (+38 more)

### Community 30 - "Registro lingue i18n"
Cohesion: 0.11
Nodes (37): ServerStandalonePage(), getDefaultTimeZone(), I18nProvider(), resolveInitialLanguage(), getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey (+29 more)

### Community 31 - "Rilevamento stampanti"
Cohesion: 0.09
Nodes (44): annotateProfile(), BRIDGE_CHIP_VENDORS, CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP, DAY_REPORT_LABELS, DayReportLabels, describeCupsQueueProblem() (+36 more)

### Community 32 - "Script shard, metainfo e quarantena"
Cohesion: 0.05
Nodes (37): ref_node_child_process, fs, index, mine, packageJsonPath, path, pkg, { spawnSync } (+29 more)

### Community 33 - "KDS nella dashboard"
Cohesion: 0.10
Nodes (35): ElapsedTime(), KdsColumn(), KdsColumnProps, KdsItemModal(), KdsItemModalProps, BoardStatus, DragData, DropData (+27 more)

### Community 34 - "Disinstallatore Windows e CI"
Cohesion: 0.11
Nodes (38): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+30 more)

### Community 35 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 36 - "Test catalogo e spec Playwright"
Cohesion: 0.05
Nodes (36): addonGroupRoutes, categoryRoutes, productRoutes, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual, getResults, closeDatabase,

}, Module, os, path (+28 more)

### Community 37 - "Changelog 6.x: sconti, coperto e prezzi"
Cohesion: 0.09
Nodes (38): Any waiter can work any open order, Three bill print roads (thermal, browser ESC/POS, HTML), Clean shutdown and single-instance lock handling, Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), Per-method discount switches, discount_methods (migration v99), Discount window opens on the first method switched on, no Cancel button, Database export named buonapp-export-<date>.json (+30 more)

### Community 38 - "Giri di comanda (KOT batch)"
Cohesion: 0.09
Nodes (36): claimKotBatch(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), Db, defaultServiceRunForProduct() (+28 more)

### Community 39 - "Test backup e ripristino"
Cohesion: 0.06
Nodes (29): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+21 more)

### Community 40 - "Test conti, sconti e fuso orario"
Cohesion: 0.05
Nodes (35): tests_helpers_test_setup_getdatabase, { billRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual,

  getResults, closeDatabase, getDatabase, now,

}, Module, { orderRoutes }, os, path (+27 more)

### Community 41 - "Test RTL delle schermate"
Cohesion: 0.07
Nodes (31): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_getlanguagelocale, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), frontendRequire, loadComponents() (+23 more)

### Community 42 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.11
Nodes (37): Booked table tile writes booking name and party/seats (5/6) at every size, Change table / Take off this table on a booked table's card, Back to the floor from the booking sheet, Bill of a cancelled order is owed by nobody, New order starts from the table's covers, Customer book switch customers_enabled (migration v79), Dashboard removal, Service day close (+29 more)

### Community 43 - "Doc sala, tavoli ed endpoint"
Cohesion: 0.10
Nodes (36): Held orders (/api/held-orders), Reports summary and sales (UTC dates), Rooms endpoints (/api/rooms), Service Days endpoints, Tables endpoints (/api/tables), Archivio (past service days, expandable orders), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio), Giornata screen (current service day, not calendar day) (+28 more)

### Community 44 - "Test ciclo di vita ordine"
Cohesion: 0.07
Nodes (33): ref_worker_threads, resetCounters(), seedManagerUser(), seedTable(), { billRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedManagerUser, seedCategory, seedProduct, seedTable,

  api, assert, assertEqual, assertIncludes,

  getResults, closeDatabase, getDatabase, now,

}, Module (+25 more)

### Community 45 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (33): allowScripts, author, email, name, description, engines, node, homepage (+25 more)

### Community 46 - "Test metodi di pagamento e PIN manager"
Cohesion: 0.06
Nodes (31): billRoutes, { billRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual, assertIncludes,

  getResults, closeDatabase, getDatabase, now,

}, Module, { orderRoutes }, os, path (+23 more)

### Community 47 - "Encoder preconto frontend"
Cohesion: 0.14
Nodes (31): menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes, capitalize(), CHARS (+23 more)

### Community 48 - "Salute dello schema DB"
Cohesion: 0.08
Nodes (31): buildIdealSchemaDb(), runMigrations(), ApplySafeFixesResult, ColumnDef, DbSchemaSnapshot, diffSchemas(), FindingKind, fkSignature() (+23 more)

### Community 49 - "Doc menu a conteggio e righe compatte"
Cohesion: 0.09
Nodes (33): One note counts several portions in the fixed-menu window, Note line counter (light red -, plate count, light green +) before the note, Release 6.6.1 - one note counts several portions in the fixed-menu window, Order item cancel / void (void_adjustment), cancelTargetIds split cancel (package vs dish), compactKotItems / compactBillRows / compactOrderRows, fixed_menu_course_products per-dish exceptions (v93), Line discount follows the menu count (+25 more)

### Community 50 - "Sconti e incasso anticipato"
Cohesion: 0.10
Nodes (29): PrepaidAttempt, TablesPage(), OrderDiscountModal(), Props, round2(), OrderPanelProps, BUILT_IN_PAYMENT_KEYS, LoyaltySettings (+21 more)

### Community 51 - "Paesi, valuta e formati"
Cohesion: 0.13
Nodes (26): HistoryOrderCard(), formatAmount(), formatReceiptDate(), build(), cachedNumberFormat(), calendarOption(), COUNTRIES_BY_CODE, currencyNumberFormat() (+18 more)

### Community 52 - "Script kill-ports"
Cohesion: 0.10
Nodes (28): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+20 more)

### Community 53 - "Doc comande, palmare e tre server"
Cohesion: 0.10
Nodes (32): Plates sharing a note read back as one line (from the check or the reloaded draft), mDNS advertisement buonapp.local, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, POST /api/printers/print-kot, Server App for handhelds (:3003), Server App narrow forwarding allowlist, PATCH /orders/:id/items/:itemId/service-run, Standalone KDS server (:3002) (+24 more)

### Community 54 - "Doc giornata, prenotazioni e invarianti"
Cohesion: 0.11
Nodes (32): Discount after the check changes (percentage recomputed, euros kept), New-total order discount (discount_type total, target_total), Discount settings (/api/settings/discount, discount_methods), Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix, Coperto (cover charge, migrations v88-v90), coversForNewOrder (covers start from table) (+24 more)

### Community 55 - "Rotte delle impostazioni"
Cohesion: 0.08
Nodes (24): ALLOWED_WILDCARD_KEYS, businessShape(), discountSettingsBody(), INVOICE_RESET_PERIODS, isLocalePreferenceSupported(), LOCALE_OPTION_FIELDS, LocalePreferenceKey, maskSetting() (+16 more)

### Community 56 - "Server e2e e import da dist"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 57 - "Server e2e di test"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 58 - "Pagina di primo avvio"
Cohesion: 0.11
Nodes (25): SELECTABLE_LANGUAGES, SERVICE_MODEL_KEYS, SERVICE_MODELS, ServiceModel, SETUP_PROFILE_KEYS, SETUP_PROFILES, SetupKey, SetupPage() (+17 more)

### Community 59 - "Allowlist URL e stampa"
Cohesion: 0.11
Nodes (26): dispatchPrint(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus(), getPrintLanguage(), prepareReceipt(), printKOT(), printReceipt() (+18 more)

### Community 60 - "Test traduzioni"
Cohesion: 0.15
Nodes (29): assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES, findDuplicateKeys() (+21 more)

### Community 61 - "Indice documentazione e contributi"
Cohesion: 0.12
Nodes (25): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Source of Truth Hierarchy (CURRENT / ACTIVE DESIGN / HISTORICAL), Code of Conduct, Contributor Covenant 2.1, AI-Assisted Contributions Policy (+17 more)

### Community 62 - "Spec Playwright RTL"
Cohesion: 0.11
Nodes (6): base64Url(), E2E_JWT_SECRET, E2E_PASSWORD, getE2eToken(), setLanguage(), @playwright/test

### Community 63 - "Rotte categorie"
Cohesion: 0.11
Nodes (21): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+13 more)

### Community 64 - "Servizio Google Drive"
Cohesion: 0.21
Nodes (6): createDriveShutdownError(), getTokenFilePath(), GoogleDriveService, isSecureStorageAvailable(), requestSignal(), waitForDriveOperation()

### Community 65 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 66 - "Layout della comanda"
Cohesion: 0.16
Nodes (26): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+18 more)

### Community 67 - "Layout preconto e report giornata"
Cohesion: 0.18
Nodes (26): addonRows(), billRowIdentity(), capitalize(), compactBillRows(), compactKotItems(), coverChargeLabel(), financialRows(), formatClassicReceipt() (+18 more)

### Community 68 - "Bozza della comanda sul palmare"
Cohesion: 0.20
Nodes (23): Ticket being written kept on the phone (draft), Ticket saved on the phone (handheld draft), clearDraft(), DRAFT_MAX_AGE_MS, DRAFT_REOPEN_MS, draftKey(), DraftMenuWindow, draftOutcome() (+15 more)

### Community 69 - "KDS standalone"
Cohesion: 0.16
Nodes (18): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps (+10 more)

### Community 70 - "Test backup su Windows"
Cohesion: 0.11
Nodes (23): createBackup(), assertNoRestoreAttachment(), clearLinkedData(), copyAndStamp(), Module, run(), seedLinkedData(), testDir (+15 more)

### Community 71 - "Test clienti e autorizzazioni"
Cohesion: 0.09
Nodes (23): customerRoutes, { customerRoutes }, { getJWTSecret }, {

  initTestDb,

  createApp,

  assertEqual,

  getResults,

  closeDatabase,

  now,

}, jwt, main(), makeToken(), Module (+15 more)

### Community 72 - "Test paginazione clienti"
Cohesion: 0.08
Nodes (23): ref_events, assertGreaterThan(), { billRoutes }, { customerRoutes }, fs, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct, seedCustomer, seedWalletCredit,

  api, assert, assertEqual, assertGreaterThan,

  getResults, closeDatabase, getDatabase, now,

}, Module, { orderRoutes } (+15 more)

### Community 73 - "Layout app e lingua HTML"
Cohesion: 0.14
Nodes (15): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+7 more)

### Community 74 - "API strumenti database"
Cohesion: 0.09
Nodes (22): databaseToolsRoutes, { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes } (+14 more)

### Community 75 - "Test spegnimento e Google Drive"
Cohesion: 0.09
Nodes (22): runShutdownSteps(), { initDatabase, closeDatabase }, main(), mockApp, mockSafeStorage, mockShell, Module, openedUrls (+14 more)

### Community 76 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 77 - "README e schermate di sala"
Cohesion: 0.14
Nodes (23): Business Timestamps Invariant, Services/Routes Boundary for Fork Domains, Reservations endpoints, Floor plan endpoints (/api/table-layouts), Service day screenshot (Giornata), Service day header (Ordini, Coperti, Incasso; Giornata in corso; Chiudi giornata), Order status tabs with counts (Tutti, Attivo, Non pagato, In sospeso), Bookings sheet screenshot (Prenotazioni) (+15 more)

### Community 78 - "Palmare affidabile (6.6.0)"
Cohesion: 0.13
Nodes (21): Single-portion note as an icon in the dish's row of the fixed-menu window, Fixed-menu window rows no longer move under the finger, Handheld no longer slows down during a long ticket, AttachToMenuModal and ServiceRunPicker, Products without options go straight to the ticket (lib/product-options.ts), useHandheldData polling (catalogue, settings, rooms, open orders), OrdinaView product list (photo, pencil, stepper) and full-screen ticket, Keeping the phone responsive during long tickets (+13 more)

### Community 79 - "Pacchetto frontend"
Cohesion: 0.09
Nodes (21): eslintConfig, eslint, @types/node, typescript, name, private, version, clsx (+13 more)

### Community 80 - "Rotte gruppi addon"
Cohesion: 0.14
Nodes (17): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+9 more)

### Community 81 - "Test varianti in cucina"
Cohesion: 0.11
Nodes (22): kitchenRoutes, ref_http, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret } (+14 more)

### Community 82 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 83 - "Processo principale Electron"
Cohesion: 0.13
Nodes (18): beginDatabaseShutdown(), SchemaVersionMismatchError, checkForUpdates(), cleanupCoordinator, createMenu(), createTray(), initialize(), logPath (+10 more)

### Community 84 - "Changelog: palmare e comande"
Cohesion: 0.13
Nodes (21): docs/API.md staff routes corrected, auto_print_kot setting removed, Dish list no longer jumps to the top (only the category strip scrolls), Cloud bridge and telemetry removal (migration v80), Handheld catalogue/settings refresh on tick and visibility, Handheld Ordering screen as a list, Handheld / Server App (:3003), Handhelds sidebar entry with join QR (+13 more)

### Community 85 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 86 - "Test DB legacy e stampa scontrino"
Cohesion: 0.17
Nodes (20): captureUserSecurityState(), isNativeAbiMismatch(), {

  assert,

  assertEqual,

  getResults,

  createApp,

  seedOwnerUser,

  isNativeAbiMismatch,

}, backend, checkMigration(), checkRestoreMerge(), checkRule(), checkStaffApi() (+12 more)

### Community 87 - "Import/export menu CSV"
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

### Community 88 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 89 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 90 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 91 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 92 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 93 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 94 - "Sessione e API del palmare"
Cohesion: 0.22
Nodes (14): Connection detection and /api/health probe (connection.ts), isReachable(), listeners, reportReachability(), subscribe(), useConnection(), clearServerToken(), createServerApi() (+6 more)

### Community 95 - "Pagina prodotti"
Cohesion: 0.13
Nodes (16): CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, KanbanOrderCard(), LineActionSheet(), frontend_src_lib_countries_getcountrybycode (+8 more)

### Community 96 - "Provider i18n e fuso SSR"
Cohesion: 0.13
Nodes (16): handleI18nError(), assert(), buildHtmlDocument(), frontendRequire, { I18nProvider, handleI18nError, getDefaultTimeZone }, { IntlProvider, useFormatter, useTranslations }, { LANGUAGES }, { loadLocaleMessages, getCachedMessages } (+8 more)

### Community 97 - "Profili stampante"
Cohesion: 0.12
Nodes (12): getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile, failures (+4 more)

### Community 98 - "Frequenza e pulizia backup Drive"
Cohesion: 0.12
Nodes (16): BackupFrequency, cancelDriveOperation(), computeFilesToDelete(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials(), googleDrive, GoogleDriveStatus (+8 more)

### Community 99 - "Test quantità addon"
Cohesion: 0.13
Nodes (18): { addonGroupRoutes }, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+10 more)

### Community 100 - "Rifiuti e ripetizioni ordini"
Cohesion: 0.19
Nodes (18): Repeated POST /api/orders answered from the stored Idempotency-Key reply before checks, Order API refusals carry a code (invalid_item, order_closed, insufficient_stock, table_has_open_order, table_not_found, idempotency_conflict), Idempotency-Key retry-safe create and append, only_if_table_free guard (open the table only if still free), POST /api/orders/:id/items (append to an open order), POST /api/orders (guest_count, service_run, menu_selection), Order route refusal codes (invalid_item, insufficient_stock, order_closed, table_has_open_order, table_not_found, idempotency_conflict), insertOrderItemRows() unified row writer (+10 more)

### Community 101 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 102 - "Test interruttori KDS e comande"
Cohesion: 0.12
Nodes (17): bcrypt, fs, { getJWTSecret }, {

  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,

}, jwt, { kdsInfoRoutes }, { kdsRoutes }, { kitchenRoutes } (+9 more)

### Community 103 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 104 - "Stampa web del preconto"
Cohesion: 0.22
Nodes (16): ensureReceiptMessagesLoaded(), escapeHtml(), generateBillHtml(), getPaperStyles(), getReceiptTranslator(), ltrSpan(), PaperSize, PAYMENT_METHOD_KEYS (+8 more)

### Community 105 - "Validazione e limiti gruppi addon"
Cohesion: 0.14
Nodes (8): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), express-rate-limit

### Community 106 - "Test impostazioni sconti"
Cohesion: 0.16
Nodes (15): assert(), assertEqual(), assertIncludes(), fs, http, main(), mockApp, mockIpcMain (+7 more)

### Community 107 - "Test API stampanti"
Cohesion: 0.15
Nodes (15): app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now }, { kitchenStationRoutes } (+7 more)

### Community 108 - "Invarianti del fork"
Cohesion: 0.13
Nodes (16): Feature Request Issue Template, Pull Request Template, Full Cross-Platform Matrix Workflow, Unsigned Windows NSIS Installer, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work (+8 more)

### Community 109 - "Doc autenticazione e ruoli"
Cohesion: 0.17
Nodes (16): Backend Authority Invariant, Order limits counted per account (60 writes / 120 reads a minute), POST /api/auth/login (JWT, rememberMe), Authentication rate limit (10 requests / 15 min per address), KDS and Server App login routes (role-gated), Login lockout (5 attempts, 15 minutes), Per-account order route rate limits (60 writes, 120 reads a minute), Role-based access (owner, manager, cashier, server, chef) (+8 more)

### Community 110 - "Indietro nel palmare"
Cohesion: 0.26
Nodes (15): Back stays inside the app (screens as browser history steps), Back button through browser history (handheld-history.ts), addressFor(), currentDepth(), enterScreen(), entryOf(), HandheldEntry, HandheldPlace (+7 more)

### Community 111 - "Finestra principale e zoom"
Cohesion: 0.23
Nodes (16): Kitchen ticket has one road (backend only), Ordering product grid columns from its own container, Release 6.0.1 - real-service corrections, Window zoom lowered on small screens (90% on till, min 75%), Cached C# DLL for USB raw ESC/POS printing on Windows, Window sized to display work area (1024x768 till), Rifacimento grafico, Ordina: table heads the ticket, compact tiles counted on grid width (+8 more)

### Community 112 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 113 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 114 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 115 - "Proxy del palmare e allowlist"
Cohesion: 0.20
Nodes (14): GET /api/products/:id/image (tokenless dish photo), Unauthenticated product image passthrough with ETag, Server App proxy allowlist (main/server-app.ts), ref_node_net, DISH_PHOTO, getFreeTcpPort(), getJson(), main() (+6 more)

### Community 116 - "Servizio stampante frontend"
Cohesion: 0.18
Nodes (3): PrinterStatus(), usePrinterStatusSync(), printerService

### Community 117 - "Messaggio WhatsApp e test locale UI"
Cohesion: 0.14
Nodes (14): captureScreenshot(), { formatDateForTenant, getCountryByCode }, frontendRequire, { generateBillHtml }, { getWhatsAppMessage, getWhatsAppShareUrl, sendBillViaFlo }, { IntlProvider, useLocale }, { LANGUAGES }, Module (+6 more)

### Community 118 - "Test finestra KDS"
Cohesion: 0.14
Nodes (6): FakeBrowserWindow, FakeWebContents, Module, registered, run(), windows

### Community 119 - "Test revoca token"
Cohesion: 0.15
Nodes (14): bcrypt, Database, fs, { getJWTSecret, authRoutes }, { initDatabase, getDbPath }, {

  initTestDb, createApp, assertEqual, getResults, getDatabase, closeDatabase, now,

}, { isTokenRevoked, revokeToken }, jwt (+6 more)

### Community 120 - "Comande stampate a giri"
Cohesion: 0.20
Nodes (14): Printed Output Languages (RECEIPT_LABELS, en/it only), order_items.kot_batch round ledger, isPendingKot (lib/kot.ts), Kitchen tickets screenshot (Comanda), Numbered kitchen-ticket rounds (Comanda n. 1, n. 2), Ticket sectioned by service run (## 1a USCITA / ## 2a USCITA), Ticket header and footer (table, covers, time, round, station; lines, pieces, order number), Order rows (table, time, Al Tavolo, In sospeso, da inviare, Non pagato, total) (+6 more)

### Community 121 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 122 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Saved floor plans and strip of reservations still to place, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 123 - "Prodotti, immagini e controlli UI"
Cohesion: 0.18
Nodes (10): ImageUploader(), ImageUploaderProps, Mode, compressCroppedImage(), CROP_ENCODING_ATTEMPTS, CropArea, MAX_IMAGE_LENGTH, MAX_RAW_FILE_SIZE (+2 more)

### Community 124 - "Test letture addon (KDS)"
Cohesion: 0.14
Nodes (13): getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {

  initTestDb, createApp, startServer,

  seedOwnerUser, seedCategory, seedProduct,

  api, assert, assertEqual, getResults, closeDatabase,

}, { kdsRoutes }, { kitchenRoutes }, Module (+5 more)

### Community 125 - "Test ripetizioni e guardia tavolo"
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

### Community 126 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): ALLOWLIST, assert(), frontendRequire, GLOBALS_CSS, LAYOUT_DIR, loadLtrComponent(), Module, ROOT (+5 more)

### Community 127 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 128 - "Test percorso di aggiornamento"
Cohesion: 0.15
Nodes (13): FIXTURE, FixtureDatabase, fixtureDb, isNativeAbiMismatch(), isoOrder, legacyBill, legacyOrder, legacyTaxBreakdown (+5 more)

### Community 129 - "Doc lingue, paesi e niente tasse"
Cohesion: 0.21
Nodes (13): Restaurant Workflow Feedback Template, No Joined Tables (removed in migration v97), No Taxation Engine (Architecture Boundary), One Order, One Bill Invariant, Business settings (timezone, currency, localeOptions), Country profiles (main/countries.ts, localeOptions), UI language decoupled from tenant regional settings, Split check removed (migration v91) (+5 more)

### Community 130 - "Errori e stampa termica"
Cohesion: 0.18
Nodes (12): correlatedError, correlationId(), errorDetails(), FloErrorCode, buildEscPos(), buildTestPage(), columnsForPaperWidth(), encodeCodePageLine() (+4 more)

### Community 131 - "Test larghezza carta"
Cohesion: 0.19
Nodes (12): escPosToText(), initPrinter(), warmUpPrintHelper(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main() (+4 more)

### Community 132 - "Test bozza del palmare"
Cohesion: 0.21
Nodes (8): assert, draft(), draftModule, line(), MemoryStorage, Module, path, product()

### Community 133 - "Test coda d'invio"
Cohesion: 0.19
Nodes (8): assert, line(), MemoryStorage, Module, path, product(), queue, ticket()

### Community 134 - "Verifica runtime Electron"
Cohesion: 0.18
Nodes (10): args, electronPath, path, rebuildCli, result, runElectronNode(), { spawnSync }, sqliteCheck (+2 more)

### Community 135 - "Pagina staff e nomi utente"
Cohesion: 0.22
Nodes (8): roleLabel(), StaffSettings(), COMBINING_MARKS, isUsernameShape(), isValidUsername(), normalizeUsername(), USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH

### Community 136 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 137 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 138 - "Test stampa scontrino"
Cohesion: 0.20
Nodes (9): assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt }, runTests(), testBillId (+1 more)

### Community 139 - "Spec resilienza del palmare"
Cohesion: 0.20
Nodes (5): managerToken, post(), run, tables, waiterToken

### Community 140 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 141 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 142 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 143 - "Pannello preferenze locale"
Cohesion: 0.29
Nodes (9): CALENDAR_LABELS, CURRENCY_DISPLAY_LABELS, DIGIT_LABELS, Props, SettingsKey, CalendarMode, CountryLocaleOptions, CurrencyDisplay (+1 more)

### Community 144 - "Tipi d'ordine"
Cohesion: 0.29
Nodes (9): DEFAULT_ORDER_TYPES, isOrderTypeAllowed(), isSelectable(), ORDER_TYPES_SETTING_KEY, parseOrderTypes(), SELECTABLE_ORDER_TYPES, SelectableOrderType, serializeOrderTypes() (+1 more)

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

### Community 149 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 150 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 151 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Local-first / Local data stays yours, No subscriptions, Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), GitHub Social Preview Card (FloCafe branding)

### Community 152 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): KDS category filtering for chefs, KDS WebSocket /kds protocol, Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus()

### Community 153 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 154 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), MESSAGES_DIR, OUT, run(), walkFiles()

### Community 155 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), drive.file scope only, OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted

### Community 156 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): Canonical en.json and strict 100% key parity, npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime

### Community 157 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (7): Per-item and per-order discounts, new total included, Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, One bill per order, multiple payment methods, Orders page, POS page

### Community 158 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 159 - "Test adattatore valuta"
Cohesion: 0.57
Nodes (6): getCurrencyUnitAdapter(), captureEvidenceArtifacts(), generatePaymentModalHtml(), main(), runPaymentMathTests(), runUnitTests()

### Community 160 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 161 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 162 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 164 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Logo (logo.png), BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted)

### Community 165 - "Azioni menu protette da PIN"
Cohesion: 0.80
Nodes (5): MenuActionHandler(), beginPinGatedAction(), handlePinSubmit(), runBackup(), runRestore()

### Community 166 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, apiErrorText(), toastApiError(), Translate

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

### Community 173 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 174 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

## Ambiguous Edges - Review These
- `Release Notes from CHANGELOG.md` → `Branch Naming & Conventional Commits`  [AMBIGUOUS]
  .github/workflows/release.yml · relation: conceptually_related_to
- `Restaurant Workflow Feedback Template` → `One Order, One Bill Invariant`  [AMBIGUOUS]
  .github/ISSUE_TEMPLATE/workflow_feedback.yml · relation: conceptually_related_to
- `connect()` → `KDS WebSocket /kds protocol`  [AMBIGUOUS]
  renderer/kds.html · relation: implements
- `Country profiles (main/countries.ts, localeOptions)` → `Tax-pack Ed25519 signature verification (upstream)`  [AMBIGUOUS]
  docs/security-audit-2.7.0.md · relation: conceptually_related_to

## Knowledge Gaps
- **2160 isolated node(s):** `BlocklistRow`, `InboxMessage`, `SentMessage`, `StatusStep`, `WhatsAppApiErrorKey` (+2155 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2472 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release Notes from CHANGELOG.md` and `Branch Naming & Conventional Commits`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Restaurant Workflow Feedback Template` and `One Order, One Bill Invariant`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `connect()` and `KDS WebSocket /kds protocol`?**
  _Edge tagged AMBIGUOUS (relation: implements) - confidence is low._
- **What is the exact relationship between `Country profiles (main/countries.ts, localeOptions)` and `Tax-pack Ed25519 signature verification (upstream)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `getCountryByCode()` connect `Paesi, valuta e formati` to `Profili stampante`, `Store e componenti della cassa`, `Tavoli, prenotazioni e giornata`, `Stampa web del preconto`, `Staff, clienti e impostazioni`, `Helper di test condivisi`, `Demo storico ordini`, `Encoder preconto frontend`, `Pagina WhatsApp e tabelle UI`, `Pagina prova stampa e dati di test`, `Messaggio WhatsApp e test locale UI`, `Normalizzazione username`, `Rotte delle impostazioni`, `Idempotenza invio ordine`, `Pagina di primo avvio`, `Test impostazioni locali e coperto`, `Rilevamento stampanti`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `Staff, clienti e impostazioni` to `Test percorso di aggiornamento`, `Test larghezza carta`, `Test autorizzazioni ordini`, `Tavoli, prenotazioni e giornata`, `Helper di test condivisi`, `Test stampa scontrino`, `Server KDS e WebSocket`, `Server, sicurezza e CSP`, `Servizio WhatsApp (Baileys)`, `Inizializzazione e riparazioni DB`, `Config Next e storico ordini`, `Database, backup e ripristino`, `Test crash codice paese Windows`, `PIN master`, `Normalizzazione username`, `Backup, ripristino e import DB`, `Impostazioni, ordini e sconti`, `Servizio menu fisso`, `Test menu fisso, PIN e autorizzazioni`, `Rilevamento stampanti`, `Giri di comanda (KOT batch)`, `Salute dello schema DB`, `Rotte delle impostazioni`, `Allowlist URL e stampa`, `Rotte categorie`, `Servizio Google Drive`, `Test backup su Windows`, `API strumenti database`, `Test spegnimento e Google Drive`, `Rotte gruppi addon`, `Test varianti in cucina`, `Processo principale Electron`, `Test DB legacy e stampa scontrino`, `Test integrità prezzi addon`, `Test annulli con override`, `Test sistema sconti`, `Test addon su righe ordine`, `Frequenza e pulizia backup Drive`, `Test quantità addon`, `Validazione e limiti gruppi addon`, `Test impostazioni sconti`, `Test API stampanti`, `Test stampa conti`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._