# Graph Report - BuonApp  (2026-10-09)

## Corpus Check
- 52 files · ~861,782 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 5426 nodes · 14963 edges · 189 communities (176 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 551 edges (avg confidence: 0.86)
- Token cost: 687,386 input · 0 output

## Community Hubs (Navigation)
- Script npm del backend
- Componenti UI base
- Sala, Giornata e pannello ordine
- Tavoli, prenotazioni e giornata
- Pagina impostazioni
- Test riconciliazione conti
- Test autorizzazioni ordini
- Impostazioni, ordini e sconti
- Staff, clienti e impostazioni
- Moduli e UI condivisa
- Schermate del palmare
- Test tavoli, prenotazioni, giornate
- Server KDS e WebSocket
- Selettore fuso orario
- Database, backup e ripristino
- Helper di test condivisi
- Config Next e storico ordini
- Spegnimento pulito
- Servizio WhatsApp (Baileys)
- PIN master
- Coda d'invio del palmare
- Idempotenza invio ordine
- Menu fisso: conteggio ed editor
- Servizio menu fisso
- Disinstallatore Windows e CI
- Pagina prova stampa e dati di test
- Test ciclo di vita ordine
- Barra di stato e stampante
- Servizio Google Drive
- Test backup e ripristino
- Giri di comanda (KOT batch)
- Salute dello schema DB
- Rilevamento stampanti
- Doc giornata, prenotazioni e invarianti
- Changelog 4.x: sala e prenotazioni
- KDS nella dashboard
- Inizializzazione e riparazioni DB
- Registro lingue i18n
- Test interruttori KDS e comande
- Test conti, sconti e fuso orario
- Tipi WebUSB
- Test catalogo e spec Playwright
- Backup, ripristino e import DB
- Test RTL delle schermate
- Test spegnimento e Google Drive
- Rifiuti e ripetizioni ordini
- Processo principale Electron
- Spec Playwright RTL
- Test quantità addon
- Import/export menu CSV
- Dipendenze e engine backend
- Normalizzazione username
- Test import DB durante lo spegnimento
- Doc sala, tavoli ed endpoint
- Encoder preconto frontend
- Indice documentazione e contributi
- Sconti e incasso anticipato
- Server, sicurezza e CSP
- Test integrità pagamenti
- Server e2e e import da dist
- Server e2e di test
- Changelog: palmare e comande
- Test traduzioni
- Revoca token e sicurezza
- Rotte auth e menu demo
- Test letture addon (KDS)
- Paesi, valuta e formati
- Test errori localizzati
- Changelog 6.x: sconti, coperto e prezzi
- Doc menu a conteggio e righe compatte
- Layout della comanda
- Pacchetto frontend
- Script kill-ports
- Bozza della comanda sul palmare
- KDS standalone
- Provider i18n e fuso SSR
- Test backup su Windows
- Test paginazione clienti
- Layout app e lingua HTML
- Figlio test avvio fallito
- Prodotti, immagini e controlli UI
- Pannello preferenze locale
- DevDependencies backend
- API strumenti database
- Rotte categorie
- Allowlist URL e stampa
- Test clienti e autorizzazioni
- Schermata Giornata e chiusura
- Dipendenze frontend
- Test DB legacy e stampa scontrino
- Layout preconto e report giornata
- Test varianti in cucina
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Config shadcn
- Stampa web del preconto
- tsconfig frontend
- Test addon su righe ordine
- Doc comande, palmare e tre server
- Sessione e API del palmare
- Profili stampante
- Dipendenze runtime backend
- tsconfig backend
- Invarianti del fork
- Proxy del palmare e allowlist
- Messaggio WhatsApp e test locale UI
- Test impostazioni sconti
- Test API stampanti
- Indietro nel palmare
- Ordini sospesi e service worker
- Tipi receipt-printer-encoder
- Test stampa conti
- Stampa termica e invio
- Rotte gruppi addon
- Test finestra KDS
- Test sicurezza rinforzata
- Test revoca token
- DevDependencies frontend
- README frontend: sala e cucina
- Script metainfo AppStream
- Test ripetizioni e guardia tavolo
- Test fondamenta RTL
- tsconfig dei test
- Tre server sulla LAN
- Test paesi e localizzazione
- Servizio stampante frontend
- Test larghezza carta
- Import CSV del menu
- Test metodi di pagamento
- Test bozza del palmare
- Test coda d'invio
- Finestra principale e zoom
- Verifica quarantena runtime
- Verifica runtime Electron
- Config electron-builder
- Build macOS
- Test stampa scontrino
- Un ordine, un conto
- Doc autenticazione e ruoli
- Override frontend
- Manifest PWA
- Badge dietetici
- Errori e codici di correlazione
- Build Snap
- Test recupero stato auth
- Test coperto
- Test rimedi audit i18n
- Cache di avvio
- Build Linux
- Test tavoli con id testuali
- Social preview (FloCafe)
- KDS legacy renderer
- Build AppX
- Test chunk delle lingue
- Doc lingue, paesi e niente tasse
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- README frontend: cassa e ordini
- Tipi API Electron
- Test adattatore valuta
- Voce desktop Linux
- Hook afterPack
- Runner test disinstallatore
- Script frontend
- Codifica code page ESC/POS
- Disinstallatore macOS
- Logo frontend
- Azioni menu protette da PIN
- Errori API frontend
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- Marchio BuonApp
- Connessioni stampanti
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
- `Order Workflows (dine-in, takeaway, delivery)` --semantically_similar_to--> `Ordina composes and sends, never takes payment`  [INFERRED] [semantically similar]
  README.md → docs/order-flow-and-navigation.md
- `Legacy send attempts adopted into the queue` --references--> `adoptLegacyAttempts()`  [INFERRED]
  docs/palmare.md → frontend/src/components/server-app/send-queue.ts
- `SegmentedControl()` --implements--> `Order status tabs with counts (Tutti, Attivo, Non pagato, In sospeso)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/giornata.webp
- `SegmentedControl()` --implements--> `Room tabs with table counts (Sala 13, Terrazzino 4)`  [INFERRED]
  frontend/src/components/ui/segmented-control.tsx → docs/images/sala.webp
- `Kitchen stations routing by category` --references--> `KotLabels`  [INFERRED]
  docs/printers.md → main/printers/thermal.ts

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, docs_i18n_decoupled_language_tenant, agents_one_order_one_bill, agents_no_joined_tables, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **6.5.1 discount window: new total, round figures, removal, per-method switches, carry rule** — changelog_new_total_discount, changelog_round_figure_proposals, changelog_remove_discount, changelog_discount_window, changelog_discount_methods_switches, changelog_order_discount_carry_rule [EXTRACTED 1.00]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **Booked tables legible on the till's 1024x768 map** — docs_table_management_till_screen_fit, docs_table_management_booked_tile_label, docs_table_management_unseated_chips, docs_table_management_service_fit_to_tables, docs_table_management_size_presets [EXTRACTED 1.00]
- **Fork removals: taxation, split checks, joined tables, small tables, cloud/telemetry, dashboard, template plugins, WhatsApp off** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal, changelog_whatsapp_switched_off, changelog_joined_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **Fitting the interface to the 1024x768 till (window, zoom, map scale, tiles, grid, booked tiles, legend row)** — changelog_window_fits_work_area, changelog_small_screen_zoom, changelog_floor_map_fit_to_screen, changelog_floor_map_edit_mode_size, changelog_table_tile_seats_names, changelog_ordering_grid_container_columns, docs_rifacimento_grafica_window_work_area, docs_rifacimento_grafica_small_screen_zoom, changelog_booked_tile_name_and_party, changelog_unseated_bookings_in_legend_row, changelog_service_map_fits_tables, changelog_small_table_size_removal [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Order discount given as a new total** — docs_order_flow_and_navigation_discount_new_total, docs_order_flow_and_navigation_discount_methods, docs_order_flow_and_navigation_discount_carry_rule, main_services_discounts_discountfortargettotal, main_services_discounts_enableddiscountmethods, main_services_discounts_carryorderdiscount, frontend_src_components_orders_orderdiscountmodal_orderdiscountmodal [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Reliable handheld in 6.6.0 (send queue, draft, back history)** — changelog_offline_send_queue, changelog_handheld_draft, changelog_handheld_back_history, changelog_reaching_the_pc, changelog_single_pending_attempt_removed [INFERRED 0.85]
- **Order API changes behind the send queue (per-account limits, refusal codes, replay first)** — changelog_per_account_rate_limit, changelog_order_api_refusal_codes, changelog_idempotency_replay_first, changelog_only_if_table_free, main_routes_orders [INFERRED 0.85]
- **Fixed-menu window steadied on handheld and till** — changelog_fixed_menu_stable_rows, changelog_fixed_menu_portion_note_icon, frontend_src_components_pos_fixedmenupicker_fixedmenupicker, docs_palmare_shared_pos_modals [INFERRED 0.85]
- **Three queue rules that stop a dish being sent twice** — docs_palmare_send_queue, docs_palmare_frozen_at_tap, docs_palmare_backend_decides_opener, docs_palmare_put_back_only_when_safe [EXTRACTED 1.00]
- **Handheld screens as browser history entries (Sala, table, Ordina)** — docs_palmare_back_button, docs_palmare_sala_view, docs_palmare_table_screen, docs_palmare_ordina_view [EXTRACTED 1.00]
- **Reliable handheld (palmare-affidabile, 2026-10-08)** — docs_palmare_send_queue, docs_palmare_handheld_draft, docs_palmare_back_button, docs_palmare_connection_probe, docs_palmare_status_header, docs_palmare_phone_performance [EXTRACTED 1.00]
- **Electron main process servers (:3001 API, :3002 KDS, :3003 Server App)** — readme_express_api, readme_kds_server, readme_server_app_handheld [EXTRACTED 1.00]
- **Retry-safe order writes for handhelds (idempotency key, table-free guard, refusal codes, per-account limits)** — docs_api_idempotency_key, docs_api_only_if_table_free, docs_api_order_refusal_codes, docs_api_order_rate_limits [INFERRED 0.85]
- **FixedMenuPicker counting window rules** — docs_coperto_e_menu_fisso_fixed_menu_picker, docs_coperto_e_menu_fisso_menu_count_field, docs_coperto_e_menu_fisso_stable_rows, docs_coperto_e_menu_fisso_portion_note [EXTRACTED 1.00]
- **Orange 'da inviare' marker for the same table on every screen** — readme_status_colours, docs_images_sala_floor_map_canvas, docs_images_giornata_order_rows, docs_images_tavolo_order_lines_by_run, docs_images_palmare_table_list [INFERRED 0.85]
- **Service run set at order entry, shown on the table card, printed as ticket sections** — docs_images_ordina_service_run_selector, docs_images_tavolo_order_lines_by_run, docs_images_comanda_service_run_sections, readme_kitchen_tickets_by_round [INFERRED 0.85]
- **SegmentedControl tabs with counts reused on till and handheld** — frontend_src_components_ui_segmented_control_segmentedcontrol, docs_images_sala_room_tabs, docs_images_giornata_status_filter_tabs, docs_images_palmare_menu_stepper_list [INFERRED 0.85]

## Communities (189 total, 13 thin omitted)

### Community 0 - "Script npm del backend"
Cohesion: 0.01
Nodes (161): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+153 more)

### Community 1 - "Componenti UI base"
Cohesion: 0.02
Nodes (128): Collapsed sidebar shows centred icons only, PageToolbar shared page header, Sidebar with 48 px rows, collapse toggle in page header, BlocklistRow, InboxMessage, isWhatsAppApiErrorKey(), SentMessage, STATE_KEYS (+120 more)

### Community 2 - "Sala, Giornata e pannello ordine"
Cohesion: 0.03
Nodes (111): Touch UI primitives and status colour tokens, Status colors in one place (status-styles.ts), UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Filters, FilterType, OrdersKey, tabLabelKey, PostpaidAttempt (+103 more)

### Community 3 - "Tavoli, prenotazioni e giornata"
Cohesion: 0.04
Nodes (105): Services/routes split with no import cycle, autoRepairDefaultPrinter(), getDatabase(), now(), upsertSetting(), withTxn(), DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_WIDTH (+97 more)

### Community 4 - "Pagina impostazioni"
Cohesion: 0.04
Nodes (81): Settings page, BUSINESS_TYPE_LEAF_KEYS, BusinessTypeKey, LoginContent(), ROLE_LEAF_KEYS, StaffRoleKey, RecoverAccessPage(), DISCOUNT_METHOD_ROWS (+73 more)

### Community 5 - "Test riconciliazione conti"
Cohesion: 0.03
Nodes (91): E2E_PASSWORD, ref_fs, ref_module, ref_os, ref_path, capVersion, mockApp, Module (+83 more)

### Community 6 - "Test autorizzazioni ordini"
Cohesion: 0.03
Nodes (95): getJWTSecret(), bcryptjs, jsonwebtoken, bcrypt, buildApp(), express, { getJWTSecret }, { getUserAuthStatus, isTokenRevoked } (+87 more)

### Community 7 - "Impostazioni, ordini e sconti"
Cohesion: 0.03
Nodes (85): Order limits counted per account (60 writes / 120 reads a minute), Per-account order route rate limits (60 writes, 120 reads a minute), areCustomersEnabled(), insertOrderItemAddons(), parseRowJson(), verifyPin(), DEFAULT_ORDER_TYPES, isOrderTypeAllowed() (+77 more)

### Community 8 - "Staff, clienti e impostazioni"
Cohesion: 0.03
Nodes (75): docs/API.md staff routes corrected, createSchema(), getSettingValue(), isKotPrintingEnabled(), upsertSettings(), utcDayBounds(), utcTodayDate(), NormalizedPhoneResult (+67 more)

### Community 9 - "Moduli e UI condivisa"
Cohesion: 0.07
Nodes (64): POS windows mounted unchanged (AddonModal, FixedMenuPicker, AttachToMenuModal, ServiceRunPicker), OrderPanel split into header/lines/sheet/totals/action bar, DayDetailModalProps, KanbanOrderCard(), Ltr(), LtrProps, LineActionSheet(), OrderHeader() (+56 more)

### Community 10 - "Schermate del palmare"
Cohesion: 0.05
Nodes (70): Handheld Server App screenshot (Palmare), Menu with a stepper beside each dish, Floor as a list of table tiles, Bottom ticket bar (Comanda 4, 50,00 EUR), Keeping the phone responsive during long tickets, Status header and queue sheet (no banner), Zustand global state, Props (+62 more)

### Community 11 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (71): MIGRATIONS, orderRoutes, roomRoutes, tableRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase,
}, Module (+63 more)

### Community 12 - "Server KDS e WebSocket"
Cohesion: 0.08
Nodes (69): buildCspHeader(), attachEffectiveAddons(), getDbHealth(), getKdsStationCategoryIds(), getKdsStationRoutingScope(), getUserKdsStationIds(), hasUserKdsStationAssignments(), isDatabaseMaintenanceActive() (+61 more)

### Community 13 - "Selettore fuso orario"
Cohesion: 0.07
Nodes (51): Staff roles (Owner, Manager, Cashier, Server, Chef), ACTIVE_STATUSES, CustomerDisplayPage(), getCustomerOrderNumber(), AddonGroupsPage(), CustomersPage(), WhatsAppConsole(), AuthGuard() (+43 more)

### Community 14 - "Database, backup e ripristino"
Cohesion: 0.04
Nodes (68): businessDateToday(), captureKdsEnabledSetting(), captureKitchenStationSecurityState(), captureRestoreProtectedSettings(), captureUserStationSecurityState(), clampFinancialYearStart(), createDatabaseShutdownError(), createDatabaseShutdownTimeoutError() (+60 more)

### Community 15 - "Helper di test condivisi"
Cohesion: 0.14
Nodes (74): main(), main(), main(), api(), assert(), assertEqual(), assertIncludes(), createApp() (+66 more)

### Community 16 - "Config Next e storico ordini"
Cohesion: 0.04
Nodes (55): nextConfig, better-sqlite3, ref_node_assert, ref_node_fs, ref_node_http, ref_node_os, ref_node_path, fs (+47 more)

### Community 17 - "Spegnimento pulito"
Cohesion: 0.06
Nodes (55): abortHttpRequests(), cancelHttpShutdownWork(), ClosableHttpServer, closeHttpServer(), closeServerResources(), closeWebSocketServer(), createExitCodeAwareShutdown(), createTimeoutError() (+47 more)

### Community 18 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (62): loadBaileys(), abortable(), abortableDelay(), ALLOWED_TIMESTAMP_FIELDS, attachSocketHandlers(), baileysLogger, BlocklistRow, cancelInFlightWhatsAppWork() (+54 more)

### Community 19 - "PIN master"
Cohesion: 0.07
Nodes (52): getSchemaVersionFromBackup(), isManagedBackupFile(), ALLOWED_IPC_KEYS, handle(), isTrustedSender(), maskSetting(), registerIpcHandlers(), SENSITIVE_SETTING_KEYS (+44 more)

### Community 20 - "Coda d'invio del palmare"
Cohesion: 0.08
Nodes (56): Ticket waits on the phone when the Wi-Fi drops (send queue), only_if_table_free on a ticket that opens a table, One unanswered send no longer blocks every send (single pending attempt replaced by the queue), 30-minute auto-send limit (Invia lo stesso), Dishes go back to the cart only when the PC surely lacks them, Queue retry policy by response class, QueueSheet(), adoptLegacyAttempts() (+48 more)

### Community 21 - "Idempotenza invio ordine"
Cohesion: 0.09
Nodes (51): APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, AppendAttemptCompletion, AppendAttemptOptions, appendAttemptsMatch(), AppendAttemptStorage, assertVerifiedCompletionReads(), buildAppendItemsFingerprint() (+43 more)

### Community 22 - "Menu fisso: conteggio ed editor"
Cohesion: 0.08
Nodes (52): normalizeBarcode(), POSPage(), Props, Props, DraftCourse, FixedMenuEditor(), toDraft(), awaitingPrice() (+44 more)

### Community 23 - "Servizio menu fisso"
Cohesion: 0.06
Nodes (42): isBlockedSsrfTarget(), PRODUCT_NUMERIC_FIELDS, resolvePublicHostname(), router, serializeAddon(), serializeAddonGroup(), serializeCategory(), serializeProduct() (+34 more)

### Community 24 - "Disinstallatore Windows e CI"
Cohesion: 0.08
Nodes (47): Dependabot Configuration, CI Workflow, Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job (+39 more)

### Community 25 - "Pagina prova stampa e dati di test"
Cohesion: 0.09
Nodes (38): WHATSAPP_AVAILABLE feature flag, WhatsApp page (switched off), generateKotHtml(), generateThermalReceiptHtml(), PaperWidth, PrintTestPage(), TestMode, HistoryOrder (+30 more)

### Community 26 - "Test ciclo di vita ordine"
Cohesion: 0.05
Nodes (44): ref_worker_threads, { assertEqual, assert }, { buildIdealSchemaDb }, db, ins, Module, bcrypt, fs (+36 more)

### Community 27 - "Barra di stato e stampante"
Cohesion: 0.07
Nodes (36): StatusBar(), StatusInfo, UpdateBadge(), OrderActionBar(), Props, PosKey, PrinterStatus(), STATUS_CONFIG (+28 more)

### Community 28 - "Servizio Google Drive"
Cohesion: 0.10
Nodes (23): BackupFrequency, cancelDriveOperation(), computeFilesToDelete(), createDriveShutdownError(), DRIVE_BACKUP_FOLDER_NAME, DRIVE_FILE_SCOPE, getClientCredentials(), getTokenFilePath() (+15 more)

### Community 29 - "Test backup e ripristino"
Cohesion: 0.05
Nodes (33): ref_node_sqlite, backupPath, currentDb, Database, dataOnlyRestore(), extractedVersion, getColumns(), getTables() (+25 more)

### Community 30 - "Giri di comanda (KOT batch)"
Cohesion: 0.05
Nodes (43): claimKotBatch(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems(), releaseKotBatch(), releaseKotItems(), { billRoutes }, { fixedMenuRoutes } (+35 more)

### Community 31 - "Salute dello schema DB"
Cohesion: 0.07
Nodes (42): appendJsonArray(), buildIdealSchemaDb(), getCurrentSchemaVersion(), isSafeIdentifier(), runMigrations(), applySafeFixes(), ApplySafeFixesResult, ColumnDef (+34 more)

### Community 32 - "Rilevamento stampanti"
Cohesion: 0.09
Nodes (44): annotateProfile(), BRIDGE_CHIP_VENDORS, CP1252_HIGH_RANGE, CP1252_HIGH_RANGE_REVERSE, CURRENCY_ASCII_MAP, DAY_REPORT_LABELS, DayReportLabels, describeCupsQueueProblem() (+36 more)

### Community 33 - "Doc giornata, prenotazioni e invarianti"
Cohesion: 0.08
Nodes (44): Business Timestamps Invariant, Services/Routes Boundary for Fork Domains, Discount after the check changes (percentage recomputed, euros kept), New-total order discount (discount_type total, target_total), Discount settings (/api/settings/discount, discount_methods), Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix (+36 more)

### Community 34 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.09
Nodes (43): Booked table tile writes booking name and party/seats (5/6) at every size, Change table / Take off this table on a booked table's card, Back to the floor from the booking sheet, Bill of a cancelled order is owed by nobody, Clean shutdown and single-instance lock handling, New order starts from the table's covers, Customer book switch customers_enabled (migration v79), Dashboard removal (+35 more)

### Community 35 - "KDS nella dashboard"
Cohesion: 0.10
Nodes (36): ElapsedTime(), formatElapsed(), KdsColumn(), KdsColumnProps, KdsItemModal(), KdsItemModalProps, BoardStatus, DragData (+28 more)

### Community 36 - "Inizializzazione e riparazioni DB"
Cohesion: 0.06
Nodes (39): closeDatabase(), authRoutes, { authRoutes }, count(), express, { initDatabase, getDatabase, closeDatabase, getCurrentSchemaVersion, MIGRATIONS }, isNativeAbiMismatch(), listen() (+31 more)

### Community 37 - "Registro lingue i18n"
Cohesion: 0.11
Nodes (32): ServerStandalonePage(), getBrowserLanguage(), BUSINESS_TYPE_LABEL_KEYS, BusinessTypeKey, CommonKey, ITEM_STATUS_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS, OrdersKey (+24 more)

### Community 38 - "Test interruttori KDS e comande"
Cohesion: 0.05
Nodes (38): settingsRoutes, supertest, bcrypt, fs, { getJWTSecret }, {
  initTestDb, createApp, assert, assertEqual, getResults, closeDatabase, now,
}, jwt, { kdsInfoRoutes } (+30 more)

### Community 39 - "Test conti, sconti e fuso orario"
Cohesion: 0.05
Nodes (36): tests_helpers_test_setup_getdatabase, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+28 more)

### Community 40 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 41 - "Test catalogo e spec Playwright"
Cohesion: 0.05
Nodes (36): addonGroupRoutes, categoryRoutes, productRoutes, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, Module, os, path (+28 more)

### Community 42 - "Backup, ripristino e import DB"
Cohesion: 0.12
Nodes (38): createBackupUnlocked(), createMaintenanceAbortError(), createMaintenanceDrainTimeoutError(), dataOnlyRestore(), getBackupDir(), getColumns(), getDbPath(), getForeignKeyViolationKeys() (+30 more)

### Community 43 - "Test RTL delle schermate"
Cohesion: 0.07
Nodes (31): frontend_src_lib_i18n_fetchserverinfo, frontend_src_lib_i18n_getcachedmessages, frontend_src_lib_i18n_getlanguagelocale, frontend_src_lib_i18n_loadlocalemessages, ALLOWLIST, assert(), frontendRequire, loadComponents() (+23 more)

### Community 44 - "Test spegnimento e Google Drive"
Cohesion: 0.06
Nodes (35): autoRepairPaymentDetails(), initDatabase(), repairSequences(), runStartupIntegrityCheck(), runShutdownSteps(), { initDatabase, closeDatabase }, main(), mockApp (+27 more)

### Community 45 - "Rifiuti e ripetizioni ordini"
Cohesion: 0.09
Nodes (37): Backend Authority Invariant, Repeated POST /api/orders answered from the stored Idempotency-Key reply before checks, Order API refusals carry a code (invalid_item, order_closed, insufficient_stock, table_has_open_order, table_not_found, idempotency_conflict), Printed Output Languages (RECEIPT_LABELS, en/it only), Idempotency-Key retry-safe create and append, order_items.kot_batch round ledger, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, only_if_table_free guard (open the table only if still free) (+29 more)

### Community 46 - "Processo principale Electron"
Cohesion: 0.09
Nodes (31): beginDatabaseShutdown(), SchemaVersionMismatchError, WHATSAPP_AVAILABLE, checkForUpdates(), cleanupCoordinator, createMenu(), createTray(), initialize() (+23 more)

### Community 47 - "Spec Playwright RTL"
Cohesion: 0.07
Nodes (10): base64Url(), E2E_JWT_SECRET, getE2eToken(), setLanguage(), managerToken, post(), run, tables (+2 more)

### Community 48 - "Test quantità addon"
Cohesion: 0.07
Nodes (25): addonGroupReadRateLimit, addonGroupWriteRateLimit, FieldErrors, router, serializeAddon(), serializeAddonGroup(), toBoolean(), { addonGroupRoutes } (+17 more)

### Community 49 - "Import/export menu CSV"
Cohesion: 0.06
Nodes (32): main_routes_menu_csv_menucsvroutes, { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, { menuCsvRoutes }, { MIGRATIONS }, Module (+24 more)

### Community 50 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (32): allowScripts, author, email, name, description, engines, node, homepage (+24 more)

### Community 51 - "Normalizzazione username"
Cohesion: 0.10
Nodes (31): assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), LegacyLoginRow, normalizeUsername(), pickUniqueUsername(), SEPARATORS (+23 more)

### Community 52 - "Test import DB durante lo spegnimento"
Cohesion: 0.08
Nodes (31): createShutdownCoordinator(), createShutdownEntrypoints(), ref_node_module, {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs (+23 more)

### Community 53 - "Doc sala, tavoli ed endpoint"
Cohesion: 0.09
Nodes (32): Held orders (/api/held-orders), Reports summary and sales (UTC dates), Rooms endpoints (/api/rooms), Service Days endpoints, Tables endpoints (/api/tables), Archivio (past service days, expandable orders), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio), Ordina composes and sends, never takes payment (+24 more)

### Community 54 - "Encoder preconto frontend"
Cohesion: 0.15
Nodes (29): billRowIdentity(), menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes(), buildReceiptBytes, capitalize() (+21 more)

### Community 55 - "Indice documentazione e contributi"
Cohesion: 0.12
Nodes (29): Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Progressive Disclosure Workflow, Source of Truth Hierarchy (CURRENT / ACTIVE DESIGN / HISTORICAL), Code of Conduct, Contributor Covenant 2.1, AI-Assisted Contributions Policy (+21 more)

### Community 56 - "Sconti e incasso anticipato"
Cohesion: 0.10
Nodes (29): OrdersPage(), PrepaidAttempt, TablesPage(), OrderDiscountModal(), Props, round2(), OrderPanelProps, BUILT_IN_PAYMENT_KEYS (+21 more)

### Community 57 - "Server, sicurezza e CSP"
Cohesion: 0.13
Nodes (27): isServerAppEnabled(), API_JSON_BODY_LIMIT, authRateLimit(), isAllowedPrivateIp(), rateLimit(), staticRouteRateLimit(), router, serverAppInfoRoutes (+19 more)

### Community 58 - "Test integrità pagamenti"
Cohesion: 0.07
Nodes (29): billRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+21 more)

### Community 59 - "Server e2e e import da dist"
Cohesion: 0.07
Nodes (28): c_users_dome_documents_github_buonapp_dist_db_begindatabaseshutdown, c_users_dome_documents_github_buonapp_dist_db_getdatabase, c_users_dome_documents_github_buonapp_dist_db_now, c_users_dome_documents_github_buonapp_dist_server_app_startserverapp, c_users_dome_documents_github_buonapp_dist_server_app_stopserverapp, c_users_dome_documents_github_buonapp_dist_server_startserver, c_users_dome_documents_github_buonapp_dist_server_stopserver, c_users_dome_documents_github_buonapp_dist_services_whatsapp_shutdown (+20 more)

### Community 60 - "Server e2e di test"
Cohesion: 0.07
Nodes (30): c_users_dome_documents_github_buonapp_dist_db_closedatabase, c_users_dome_documents_github_buonapp_dist_db_initdatabase, c_users_dome_documents_github_buonapp_dist_db_waitfordatabaserequests, c_users_dome_documents_github_buonapp_dist_kds_server_getkdsport, c_users_dome_documents_github_buonapp_dist_kds_server_startkdsserver, c_users_dome_documents_github_buonapp_dist_kds_server_stopkdsserver, c_users_dome_documents_github_buonapp_dist_server_app_getserverappport, c_users_dome_documents_github_buonapp_dist_server_getserverport (+22 more)

### Community 61 - "Changelog: palmare e comande"
Cohesion: 0.11
Nodes (31): Any waiter can work any open order, auto_print_kot setting removed, Dish list no longer jumps to the top (only the category strip scrolls), Cloud bridge and telemetry removal (migration v80), Fixed menu (migration v92), Single-portion note as an icon in the dish's row of the fixed-menu window, Fixed-menu window rows no longer move under the finger, Handheld catalogue/settings refresh on tick and visibility (+23 more)

### Community 62 - "Test traduzioni"
Cohesion: 0.14
Nodes (30): @formatjs/icu-messageformat-parser, assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), FA_INTENTIONAL_IDENTICAL, faFallbackErrors(), FILES (+22 more)

### Community 63 - "Revoca token e sicurezza"
Cohesion: 0.10
Nodes (27): DELETE /api/customers/:id hard erase, Customers endpoints (customers_disabled switch), deleteBackup(), cleanupExpiredRevocations(), clearInMemoryRevokedTokens(), clearRevokedTokens(), clearUserAuthCache(), hashRevokedToken() (+19 more)

### Community 64 - "Rotte auth e menu demo"
Cohesion: 0.09
Nodes (23): libphonenumber-js, DEMO_MENUS, DEMO_TABLE_SEATS, DemoLang, demoLanguage(), DemoMenu, dialCodeFor(), insertCategory() (+15 more)

### Community 65 - "Test letture addon (KDS)"
Cohesion: 0.07
Nodes (27): kdsRoutes, orderItemRoutes, getEffectiveOrderItems(), { attachEffectiveAddons }, fs, { getEffectiveOrderItems }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, { kdsRoutes } (+19 more)

### Community 66 - "Paesi, valuta e formati"
Cohesion: 0.16
Nodes (21): OrderHistoryGrid(), formatAmount(), build(), cachedNumberFormat(), COUNTRIES_BY_CODE, currencyNumberFormat(), dn, formatCurrency() (+13 more)

### Community 67 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): ref_components, ref_hooks, ref_lib, ref_store, assert(), buildHtmlDocument(), BUILT_CSS, { createTranslator } (+18 more)

### Community 68 - "Changelog 6.x: sconti, coperto e prezzi"
Cohesion: 0.13
Nodes (27): Three bill print roads (thermal, browser ESC/POS, HTML), Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), Per-method discount switches, discount_methods (migration v99), Discount window opens on the first method switched on, no Cancel button, Folding identical dishes (ticket, table, bill), Line discount follows menu count; cash discount capped, Discount given as the new total (discount_type total, target_total) (+19 more)

### Community 69 - "Doc menu a conteggio e righe compatte"
Cohesion: 0.10
Nodes (27): Order item cancel / void (void_adjustment), AttachToMenuModal and ServiceRunPicker, cancelTargetIds split cancel (package vs dish), compactKotItems / compactBillRows / compactOrderRows, fixed_menu_course_products per-dish exceptions (v93), coversForNewOrder (covers start from table), Menu fisso (fixed menu as a product), FixedMenuPicker window (counted menu) (+19 more)

### Community 70 - "Layout della comanda"
Cohesion: 0.16
Nodes (26): Default printer named in the ticket's language (Cucina), Kitchen ticket redesign, Covers printed under the table, ticket number on the condensed line, Ticket footer in the singular (1 riga - 1 pezzo), Table's note printed before the dishes, One quantity-column width per kitchen ticket, Nothing drawn between dishes inside a service run, Release 6.4.0 - kitchen ticket without lines inside a run (+18 more)

### Community 71 - "Pacchetto frontend"
Cohesion: 0.08
Nodes (24): eslintConfig, eslint, @types/node, typescript, name, private, version, clsx (+16 more)

### Community 72 - "Script kill-ports"
Cohesion: 0.14
Nodes (23): BUONAPP_PATTERNS, { execSync, exec }, getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance() (+15 more)

### Community 73 - "Bozza della comanda sul palmare"
Cohesion: 0.20
Nodes (23): Ticket being written kept on the phone (draft), Ticket saved on the phone (handheld draft), clearDraft(), DRAFT_MAX_AGE_MS, DRAFT_REOPEN_MS, draftKey(), DraftMenuWindow, draftOutcome() (+15 more)

### Community 74 - "KDS standalone"
Cohesion: 0.16
Nodes (18): KdsPage(), useDashboardKdsDefault(), useKdsEnabledCheck(), createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), KdsHeader(), KdsHeaderProps (+10 more)

### Community 75 - "Provider i18n e fuso SSR"
Cohesion: 0.14
Nodes (21): getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getCachedMessages(), loadLocaleMessages(), assert(), buildHtmlDocument() (+13 more)

### Community 76 - "Test backup su Windows"
Cohesion: 0.11
Nodes (23): createBackup(), assertNoRestoreAttachment(), clearLinkedData(), copyAndStamp(), Module, run(), seedLinkedData(), testDir (+15 more)

### Community 77 - "Test paginazione clienti"
Cohesion: 0.08
Nodes (23): ref_events, assertGreaterThan(), { billRoutes }, { customerRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedCustomer, seedWalletCredit,
  api, assert, assertEqual, assertGreaterThan,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes } (+15 more)

### Community 78 - "Layout app e lingua HTML"
Cohesion: 0.14
Nodes (15): Dark theme tokens unused, frontend_src_app_globals, metadata, geistMono, geistSans, metadata, viewport, metadata (+7 more)

### Community 79 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): app, appListeners, events, exitCodes, fs, log, Module, os (+4 more)

### Community 80 - "Prodotti, immagini e controlli UI"
Cohesion: 0.10
Nodes (17): CATEGORY_COLORS, PosKey, PRESET_TAGS, ProductsKey, TabType, ImageUploader(), ImageUploaderProps, Mode (+9 more)

### Community 81 - "Pannello preferenze locale"
Cohesion: 0.13
Nodes (20): CALENDAR_LABELS, CURRENCY_DISPLAY_LABELS, DIGIT_LABELS, LocalePreferencesPanel(), Props, SettingsKey, TimeZoneSelect(), TimeZoneSelectProps (+12 more)

### Community 82 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 83 - "API strumenti database"
Cohesion: 0.10
Nodes (21): { API_JSON_BODY_LIMIT }, app, assert(), { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking }, { databaseRoutes }, { databaseToolsRoutes }, downloadServer (+13 more)

### Community 84 - "Rotte categorie"
Cohesion: 0.18
Nodes (20): generateShortId(), categoryWriteRateLimit, createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+12 more)

### Community 85 - "Allowlist URL e stampa"
Cohesion: 0.15
Nodes (18): prepareReceipt(), printReceipt(), isAllowedLocalWindowUrl(), isSafeExternalUrl(), originFor(), assert(), express, failures (+10 more)

### Community 86 - "Test clienti e autorizzazioni"
Cohesion: 0.11
Nodes (20): customerRoutes, bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, main(), makeToken() (+12 more)

### Community 87 - "Schermata Giornata e chiusura"
Cohesion: 0.18
Nodes (17): Giornata screen (current service day, not calendar day), Giornata orders as a list opening the shared order panel, ServiceDayChip in page header, DayDetailModal(), ServiceDaysPage(), CloseDayModal(), CloseDayModalProps, useDateTimeFormatters() (+9 more)

### Community 88 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 89 - "Test DB legacy e stampa scontrino"
Cohesion: 0.17
Nodes (20): captureUserSecurityState(), isNativeAbiMismatch(), {
  assert,
  assertEqual,
  getResults,
  createApp,
  seedOwnerUser,
  isNativeAbiMismatch,
}, backend, checkMigration(), checkRestoreMerge(), checkRule(), checkStaffApi() (+12 more)

### Community 90 - "Layout preconto e report giornata"
Cohesion: 0.24
Nodes (21): addonRows(), capitalize(), coverChargeLabel(), financialRows(), formatClassicReceipt(), formatCompactReceipt(), formatCurrency(), formatReceipt() (+13 more)

### Community 91 - "Test varianti in cucina"
Cohesion: 0.12
Nodes (20): kitchenRoutes, assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http (+12 more)

### Community 92 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now }, isNativeAbiMismatch() (+10 more)

### Community 93 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now } (+12 more)

### Community 94 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), EXPECTED_DISCOUNT_SETTINGS, express, fs, http, { initDatabase, getDatabase, closeDatabase, now } (+11 more)

### Community 95 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 96 - "Stampa web del preconto"
Cohesion: 0.18
Nodes (19): ensureReceiptMessagesLoaded(), escapeHtml(), formatReceiptDate(), generateBillHtml(), getPaperStyles(), getReceiptTranslator(), ltrSpan(), PaperSize (+11 more)

### Community 97 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 98 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), bcrypt, express, fs, { getJWTSecret }, http, { initDatabase, getDatabase, closeDatabase, now, MIGRATIONS } (+11 more)

### Community 99 - "Doc comande, palmare e tre server"
Cohesion: 0.15
Nodes (19): Palmari sidebar item (QR modal), Backend decides who opens the table (only_if_table_free, 409 table_has_open_order), Products without options go straight to the ticket (lib/product-options.ts), Queue entry frozen at the tap (idempotency key, address, body), useHandheldData polling (catalogue, settings, rooms, open orders), Handheld web manifest and safe-area layout, Interrupted send replay through the send queue, Known limits of the handheld (Cosa resta fuori) (+11 more)

### Community 100 - "Sessione e API del palmare"
Cohesion: 0.22
Nodes (14): Connection detection and /api/health probe (connection.ts), isReachable(), listeners, reportReachability(), subscribe(), useConnection(), clearServerToken(), createServerApi() (+6 more)

### Community 101 - "Profili stampante"
Cohesion: 0.12
Nodes (12): getSupportedPrinterProfiles(), matchSupportedPrinterProfile(), PrinterCommandSet, PrinterCutMode, resolvePrinterProfile(), SUPPORTED_PRINTER_PROFILES, SupportedPrinterProfile, failures (+4 more)

### Community 102 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 103 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 104 - "Invarianti del fork"
Cohesion: 0.12
Nodes (17): Feature Request Issue Template, Pull Request Template, Full Cross-Platform Matrix Workflow, Unsigned Windows NSIS Installer, Data Safety Invariant, Offline-First Operation Invariant, Scope Discipline, Maintainer Approval Before Architectural Work (+9 more)

### Community 105 - "Proxy del palmare e allowlist"
Cohesion: 0.17
Nodes (16): GET /api/products/:id/image (tokenless dish photo), Handheld has no cash, table writes, customers or takeaway, Unauthenticated product image passthrough with ETag, Server App proxy allowlist (main/server-app.ts), Device boundary: table writes only from central PC, ref_node_net, DISH_PHOTO, getFreeTcpPort() (+8 more)

### Community 106 - "Messaggio WhatsApp e test locale UI"
Cohesion: 0.13
Nodes (16): captureScreenshot(), { formatDateForTenant, getCountryByCode }, frontendRequire, { generateBillHtml }, { getWhatsAppMessage, getWhatsAppShareUrl, sendBillViaFlo }, { IntlProvider, useLocale }, { LANGUAGES }, Module (+8 more)

### Community 107 - "Test impostazioni sconti"
Cohesion: 0.16
Nodes (15): assert(), assertEqual(), assertIncludes(), fs, http, main(), mockApp, mockIpcMain (+7 more)

### Community 108 - "Test API stampanti"
Cohesion: 0.15
Nodes (15): app, assert(), db, defaultCount(), defaultId(), express, { initDatabase, getDatabase, closeDatabase, now }, { kitchenStationRoutes } (+7 more)

### Community 109 - "Indietro nel palmare"
Cohesion: 0.26
Nodes (15): Back stays inside the app (screens as browser history steps), Back button through browser history (handheld-history.ts), addressFor(), currentDepth(), enterScreen(), entryOf(), HandheldEntry, HandheldPlace (+7 more)

### Community 110 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): PRECACHE_URLS, createHeldOrdersStore(), assert, clone(), { createHeldOrdersStore }, deferredGets, frontendRequire, HeldOrder (+6 more)

### Community 111 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): @point-of-sale/receipt-printer-encoder, ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions

### Community 112 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): app, assert(), { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase }, jwt (+7 more)

### Community 113 - "Stampa termica e invio"
Cohesion: 0.19
Nodes (15): buildTestPage(), classifyPrintFailure(), columnsForPaperWidth(), dispatchPrint(), extractPlatformErrorCode(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus() (+7 more)

### Community 114 - "Rotte gruppi addon"
Cohesion: 0.25
Nodes (13): heldOrderReadRateLimit, heldOrderRoutes, HeldOrderRow, heldOrderWriteRateLimit, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), router (+5 more)

### Community 115 - "Test finestra KDS"
Cohesion: 0.14
Nodes (6): FakeBrowserWindow, FakeWebContents, Module, registered, run(), windows

### Community 116 - "Test sicurezza rinforzata"
Cohesion: 0.15
Nodes (14): { authRoutes, getJWTSecret }, bcrypt, { databaseRoutes }, {
  initTestDb,
  createApp,
  assertEqual,
  assert,
  getResults,
  closeDatabase,
  now,
}, jwt, { kdsRoutes }, { kitchenRoutes }, main() (+6 more)

### Community 117 - "Test revoca token"
Cohesion: 0.15
Nodes (14): bcrypt, Database, fs, { getJWTSecret, authRoutes }, { initDatabase, getDbPath }, {
  initTestDb, createApp, assertEqual, getResults, getDatabase, closeDatabase, now,
}, { isTokenRevoked, revokeToken }, jwt (+6 more)

### Community 118 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 119 - "README frontend: sala e cucina"
Cohesion: 0.14
Nodes (14): BuonApp UI (Next.js 16 static export), Customer display (guest-facing second screen), Local Express backend (:3001), Saved floor plans and strip of reservations still to place, Kitchen Display (KDS, :3002), Reservation assignment swaps held table, Reservations page, Send to kitchen (only never-sent rows) (+6 more)

### Community 120 - "Script metainfo AppStream"
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

### Community 124 - "Tre server sulla LAN"
Cohesion: 0.21
Nodes (13): mDNS advertisement buonapp.local, Standalone KDS server (:3002), useSyncServerLanguage for standalone surfaces, SEC-01 LAN traffic not encrypted, Express API and WebSocket Server (:3001), Half-written handheld ticket survives a reload, Handheld keeps the ticket when the Wi-Fi drops, Standalone Kitchen Display Server (:3002) (+5 more)

### Community 125 - "Test paesi e localizzazione"
Cohesion: 0.21
Nodes (10): SetupPage(), frontend_src_lib_countries_countries, countryMatchesQuery(), displayNamesForLocale(), getLocalizedCountryName(), sortCountriesByLocalizedName(), assert, {
  COUNTRIES,
  countryMatchesQuery,
  getCountryByCode,
  getLocalizedCountryName,
  sortCountriesByLocalizedName,
} (+2 more)

### Community 127 - "Test larghezza carta"
Cohesion: 0.19
Nodes (12): escPosToText(), initPrinter(), warmUpPrintHelper(), assert(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, main() (+4 more)

### Community 128 - "Import CSV del menu"
Cohesion: 0.18
Nodes (7): AddonGroupImportPlan, CsvImportError, NumericParseResult, parseCSV(), router, TEMPLATES, toObjects()

### Community 129 - "Test metodi di pagamento"
Cohesion: 0.15
Nodes (12): { billRoutes }, fs, { initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct, api, assert, assertEqual, getResults, closeDatabase, now }, { MIGRATIONS }, Module, { orderRoutes }, os, path (+4 more)

### Community 130 - "Test bozza del palmare"
Cohesion: 0.21
Nodes (8): assert, draft(), draftModule, line(), MemoryStorage, Module, path, product()

### Community 131 - "Test coda d'invio"
Cohesion: 0.19
Nodes (8): assert, line(), MemoryStorage, Module, path, product(), queue, ticket()

### Community 132 - "Finestra principale e zoom"
Cohesion: 0.30
Nodes (12): Kitchen ticket has one road (backend only), Ordering product grid columns from its own container, Release 6.0.1 - real-service corrections, Window zoom lowered on small screens (90% on till, min 75%), Cached C# DLL for USB raw ESC/POS printing on Windows, Window sized to display work area (1024x768 till), Ordina: table heads the ticket, compact tiles counted on grid width, Page zoom on small screens (webPreferences.zoomFactor) (+4 more)

### Community 133 - "Verifica quarantena runtime"
Cohesion: 0.24
Nodes (10): ref_node_child_process, fail(), classifyQuarantine(), { execFileSync }, fs, main(), path, readQuarantine() (+2 more)

### Community 134 - "Verifica runtime Electron"
Cohesion: 0.18
Nodes (10): args, electronPath, path, rebuildCli, result, runElectronNode(), { spawnSync }, sqliteCheck (+2 more)

### Community 135 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 136 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 137 - "Test stampa scontrino"
Cohesion: 0.20
Nodes (9): assert(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module, { printReceipt }, runTests(), testBillId (+1 more)

### Community 138 - "Un ordine, un conto"
Cohesion: 0.24
Nodes (10): Restaurant Workflow Feedback Template, No Joined Tables (removed in migration v97), One Order, One Bill Invariant, Card actions (Aggiungi Articolo, Invia in cucina (12), Stampa preconto, Incassa), Split check removed (migration v91), Joined tables (tables.merged_into, v77) - removed in v97, Map service and edit-layout modes, Service view cropped to the tables' bounding box (+2 more)

### Community 139 - "Doc autenticazione e ruoli"
Cohesion: 0.29
Nodes (10): POST /api/auth/login (JWT, rememberMe), Authentication rate limit (10 requests / 15 min per address), KDS and Server App login routes (role-gated), Login lockout (5 attempts, 15 minutes), Role-based access (owner, manager, cashier, server, chef), Staff accounts deactivated, never deleted, Staff user management (/api/users, /api/staff), Username-based login (migration v96) (+2 more)

### Community 140 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 141 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 142 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): DIETARY_TAG_KEYS, firstTagBg(), formatTagName(), KnownDietaryTag, normalizeTag(), PosKey, TAG_CONFIG, TagBadge() (+1 more)

### Community 143 - "Errori e codici di correlazione"
Cohesion: 0.22
Nodes (9): correlatedError, correlationId(), errorDetails(), FloErrorCode, billRowIdentity(), compactBillRows(), compactKotItems(), kotItemIdentity() (+1 more)

### Community 144 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 145 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): { assertEqual, assert }, MockLocalStorage, parseStoredTenant(), run(), storage

### Community 146 - "Test coperto"
Cohesion: 0.20
Nodes (9): { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, now,
}, Module, { orderRoutes }, os, path, { settingsRoutes } (+1 more)

### Community 147 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }, run()

### Community 148 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, clearStaleRenderCachesOnVersionChange(), Logger, STALE_RENDER_CACHE_DIRS

### Community 149 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 150 - "Test tavoli con id testuali"
Cohesion: 0.22
Nodes (8): fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct, seedTable,
  seedCustomer,
  api, assert, assertEqual, assertIncludes,
  closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path, { tableRoutes }, testDir

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

### Community 155 - "Doc lingue, paesi e niente tasse"
Cohesion: 0.38
Nodes (7): No Taxation Engine (Architecture Boundary), Business settings (timezone, currency, localeOptions), Country profiles (main/countries.ts, localeOptions), UI language decoupled from tenant regional settings, Receipt language (English/Italian), Tax-pack Ed25519 signature verification (upstream), UI Translations (en, it, es, pt-BR, fa with RTL)

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

### Community 160 - "Test adattatore valuta"
Cohesion: 0.57
Nodes (6): getCurrencyUnitAdapter(), captureEvidenceArtifacts(), generatePaymentModalHtml(), main(), runPaymentMathTests(), runUnitTests()

### Community 161 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 162 - "Hook afterPack"
Cohesion: 0.29
Nodes (5): ref_child_process, fs, NATIVE_BINARY_NAMES, path, { spawnSync }

### Community 163 - "Runner test disinstallatore"
Cohesion: 0.29
Nodes (5): path, result, runtime, { spawnSync }, testPath

### Community 164 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 165 - "Codifica code page ESC/POS"
Cohesion: 0.40
Nodes (6): buildEscPos(), encodeCodePageLine(), hasArabicScript(), isCodePageRepresentable(), makeUnsupportedLineWarning(), transliterateToAscii()

### Community 166 - "Disinstallatore macOS"
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

### Community 170 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 171 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 172 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 173 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 174 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp Brand Mark (logo), BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering)

### Community 175 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 176 - "Build Windows"
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
- **2160 isolated node(s):** `Filters`, `FilterType`, `OrdersKey`, `RoomSizeKey`, `BookingLayout` (+2155 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2472 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `getCountryByCode()` connect `Paesi, valuta e formati` to `Stampa web del preconto`, `Componenti UI base`, `Rilevamento stampanti`, `Rotte auth e menu demo`, `Pagina impostazioni`, `Tavoli, prenotazioni e giornata`, `Test riconciliazione conti`, `Impostazioni, ordini e sconti`, `Staff, clienti e impostazioni`, `Moduli e UI condivisa`, `Messaggio WhatsApp e test locale UI`, `Profili stampante`, `Helper di test condivisi`, `Pannello preferenze locale`, `Menu fisso: conteggio ed editor`, `Encoder preconto frontend`, `Pagina prova stampa e dati di test`, `Test paesi e localizzazione`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `getDatabase()` connect `Tavoli, prenotazioni e giornata` to `Import CSV del menu`, `Test autorizzazioni ordini`, `Impostazioni, ordini e sconti`, `Staff, clienti e impostazioni`, `Test stampa scontrino`, `Server KDS e WebSocket`, `Database, backup e ripristino`, `Helper di test condivisi`, `Config Next e storico ordini`, `Servizio WhatsApp (Baileys)`, `PIN master`, `Servizio menu fisso`, `Test ciclo di vita ordine`, `Servizio Google Drive`, `Salute dello schema DB`, `Rilevamento stampanti`, `Inizializzazione e riparazioni DB`, `Backup, ripristino e import DB`, `Test spegnimento e Google Drive`, `Processo principale Electron`, `Test quantità addon`, `Test import DB durante lo spegnimento`, `Server, sicurezza e CSP`, `Revoca token e sicurezza`, `Rotte auth e menu demo`, `Test backup su Windows`, `API strumenti database`, `Rotte categorie`, `Allowlist URL e stampa`, `Test DB legacy e stampa scontrino`, `Test varianti in cucina`, `Test integrità prezzi addon`, `Test annulli con override`, `Test sistema sconti`, `Test addon su righe ordine`, `Test impostazioni sconti`, `Test API stampanti`, `Test stampa conti`, `Rotte gruppi addon`, `Test larghezza carta`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._