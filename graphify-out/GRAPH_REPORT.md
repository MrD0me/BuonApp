# Graph Report - BuonApp  (2026-09-26)

## Corpus Check
- Large corpus: 544 files · ~814,365 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 5094 nodes · 14053 edges · 213 communities (190 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 172 edges (avg confidence: 0.85)
- Token cost: 69,993 input · 0 output

## Community Hubs (Navigation)
- Moduli e UI condivisa
- Mappa sala e dettaglio tavolo
- Shell del palmare
- Modulo tavolo
- Test retry del carrello POS
- Pannello ordine e cassa POS
- Test stampa scontrino
- Sessione API palmare
- Server KDS e WebSocket
- KDS standalone
- Preferenze di locale
- Servizio WhatsApp (Baileys)
- Badge dietetici
- Errori di stampa
- Test recupero stato auth
- Rotte ordini e clienti
- Errori di login
- Cache di avvio
- Test finestra KDS
- Menu fisso lato frontend
- Tipi API Electron
- Store impostazioni POS
- Tipi dei messaggi i18n
- Errori API frontend
- PIN master e IPC
- Avvio standalone
- Doppio dell'app Electron nei test
- Connessione KDS frontend
- Componenti UI base
- Pagina Impostazioni
- Pagina WhatsApp e tabelle
- Servizio menu fisso
- Rilevamento e stampa termica
- Username e rotte staff
- Rotte di autenticazione
- Database, backup e ripristino
- Primo avvio e paesi
- Impostazioni e tipi di ordine
- Tipi WebUSB
- Pagina prova stampa
- Test menu fisso e giri
- Servizi tavoli, giornata, prenotazioni
- Idempotenza invio ordine
- Salute dello schema DB
- Varianti e gruppi addon
- Encoder preconto frontend
- PrinterService e hook stampante
- Tipi e componenti ordine
- Test traduzioni
- Provider i18n e fuso SSR
- Spegnimento pulito
- Profili paese e valuta
- Registro lingue i18n
- Backup Google Drive
- Test ciclo di spegnimento
- Test errori localizzati
- Conti e pagamenti
- Test coperti al tavolo
- Test backup e ripristino
- Figlio test avvio fallito
- Pagine POS e ordini
- Validazione note ordine
- Menu a tendina e barra azioni
- Test primo avvio e ruolo cameriere
- Credenziali Drive e shutdown
- Avvio server Electron/Express
- Stampa web del preconto
- Test ESC/POS
- Ordini sospesi e service worker
- Tipi receipt-printer-encoder
- Test stampa conti
- Test backup su Windows
- Test revoca token
- Rotte stampanti e profili
- Test fondamenta RTL
- Test larghezza carta
- Verifica runtime Electron
- Test locale, fuso e tipi ordine
- Runner test Electron
- Generazione numeri d'ordine
- Test rate limit PIN manager
- Test RTL setup e impostazioni
- Shard dei test in CI
- Test rimedi audit i18n
- Test ricerca per telefono
- Test chunk delle lingue
- Passi di spegnimento
- Script afterPack
- Runner test disinstallatore
- Helper di test condivisi
- Test preconti nel browser
- Azioni menu con PIN
- Raggruppamento righe comanda/conto
- Test DB e WebSocket KDS
- Test autorizzazioni staff
- Test username
- Contratto KDS e addon
- Test immagini e riscatto punti
- Test ciclo di vita ordine
- Test catalogo prodotti
- Test sconti, fedeltà, PIN manager
- Rotte prodotti
- Layout preconto e report giornata
- Test clienti e paginazione
- Server e2e di test
- Dev server
- Rotte stampanti e giri di comanda
- Test migrazioni e upgrade
- Test fedeltà e auth cliente
- Layout app e lingua HTML
- Test RTL delle schermate
- Test coperto e numerazione
- Script kill-ports
- Figlio test import DB
- API strumenti database
- Test tavoli, prenotazioni, giornate
- Allowlist URL e stampa
- Spec Playwright RTL
- Import/export menu CSV
- Test integrità prezzi addon
- Test annulli con override
- Test sistema sconti
- Test varianti in cucina
- Test addon su righe ordine
- Test API stampanti
- Test impostazioni sconti
- Spec Playwright i18n
- Changelog 6.x: palmare e username
- Changelog 6.0: menu fisso e coperto
- Workflow di rilascio
- Changelog 6.0.1: comande a giri
- Changelog 5.0: preconto e rimozioni
- Pipeline CI
- Changelog: origini da FloCafe
- Changelog: chiusura giornata
- Changelog 4.x: sala e prenotazioni
- Script npm del backend
- DevDependencies frontend
- Script metainfo Linux
- tsconfig dei test
- Config electron-builder
- Build macOS
- Override frontend
- Manifest PWA
- Build Snap
- Build Linux
- Build AppX
- Voce desktop Linux
- Script frontend
- Disinstallatore macOS
- Installer NSIS
- Pubblicazione GitHub
- Override backend
- Script nuclear-reset
- ESLint frontend
- Build Windows
- Autore del pacchetto
- Script verifica runtime
- Config PostCSS
- Script restart
- Note di rilascio MAS
- Script run-test
- Dipendenze e engine backend
- Test metodi di pagamento
- Disinstallatore Windows
- DevDependencies backend
- Pacchetto frontend
- Dipendenze frontend
- Config shadcn
- tsconfig frontend
- Dipendenze runtime backend
- tsconfig backend
- Invarianti del fork
- Doc giri di comanda e API
- Palmare e proxy Server App
- Doc menu fisso e sconti
- Architettura dei tre server
- Doc giornate, coperti, tavoli uniti
- Doc chiusura e navigazione
- Domini del servizio al tavolo
- Coperto e profili paese
- Screenshot POS (FloCafe)
- Funzioni chiave dal README
- Social preview (FloCafe)
- KDS legacy renderer
- Doc invio comanda
- Doc menu a conteggio e ticket
- Doc Drive e WhatsApp spento
- Doc sistema i18n
- Logo frontend
- Marchio BuonApp
- Connessioni stampanti
- Pannello ordine condiviso
- Login e blocco tentativi
- Autorità del backend
- Fonti di verità e policy AI
- Retry idempotente dell'invio
- Pacchetti Linux e installer
- Accesso QR ai palmari
- Invariante riuso
- Cancellazione cliente
- Ordini sospesi (API)
- Tray di sistema
- SEC-02 sandbox renderer
- SEC-04 copertura scansione
- Rubrica clienti opzionale
- Flussi d'ordine
- Indice documentazione
- README frontend: sala e cucina
- README frontend: cassa e ordini
- README frontend: architettura
- README frontend: stampa

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
- `BuonApp Does Not Talk to a Vendor` --semantically_similar_to--> `Offline-First Operation Invariant`  [INFERRED] [semantically similar]
  CONTRIBUTING.md → AGENTS.md
- `Feature Request Issue Template` --semantically_similar_to--> `Maintainer Approval Before Architectural Work`  [INFERRED] [semantically similar]
  .github/ISSUE_TEMPLATE/feature_request.yml → CONTRIBUTING.md
- `Code of Conduct` --semantically_similar_to--> `Private Vulnerability Reporting`  [INFERRED] [semantically similar]
  CODE_OF_CONDUCT.md → SECURITY.md
- `DateDisplayTestComponent()` --calls--> `useFormatDate()`  [EXTRACTED]
  tests/decoupled-ui-locale.test.ts → frontend/src/hooks/useFormatDate.ts
- `run()` --indirect_call--> `Ltr()`  [INFERRED]
  tests/issue-241-localized-errors.test.ts → frontend/src/components/layout/Ltr.tsx

## Import Cycles
- 3-file cycle: `main/routes/index.ts -> main/routes/pos-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/kds-info.ts -> main/server.ts -> main/routes/index.ts`
- 3-file cycle: `main/routes/index.ts -> main/routes/server-app-info.ts -> main/server.ts -> main/routes/index.ts`

## Hyperedges (group relationships)
- **Fixed menu data model and counted fill flow** — docs_coperto_e_menu_fisso_fixed_menu, docs_coperto_e_menu_fisso_menu_group_id, docs_coperto_e_menu_fisso_menu_course_id, docs_coperto_e_menu_fisso_plan_course_fill, docs_coperto_e_menu_fisso_menu_a_conteggio, docs_coperto_e_menu_fisso_fixed_menu_picker, docs_api_menu_group_course_put [EXTRACTED 1.00]
- **FloCafe upstream value proposition (local-first, no subscriptions, Electron + Next.js)** — _github_social_preview_flocafe, _github_social_preview_local_first, _github_social_preview_no_subscriptions, _github_social_preview_electron_nextjs_stack [EXTRACTED 1.00]
- **BuonApp Core Invariants** — agents_offline_first_invariant, agents_data_safety_invariant, agents_no_taxation_engine, agents_one_order_one_bill, agents_business_timestamps, agents_backend_authority, agents_reuse_before_adding, agents_scope_discipline [EXTRACTED 1.00]
- **Fork-added table service domains (service days, rooms/map, reservations, joined tables, layouts)** — changelog_service_days, changelog_floor_map, changelog_reservations, changelog_reservation_sheet, changelog_joined_tables, changelog_saved_layouts, changelog_services_routes_split [EXTRACTED 1.00]
- **One static export serves POS, KDS and Server App** — frontend_readme_static_export_in_electron, frontend_readme_buonapp_ui, frontend_readme_kitchen_display, frontend_readme_server_app [EXTRACTED 1.00]
- **Three Local LAN Servers (:3001, :3002, :3003)** — readme_express_api, readme_kds_server, readme_server_app_handheld, readme_mdns_buonapp_local, security_lan_only_ports [EXTRACTED 1.00]
- **Fork removals: taxation, split checks, cloud/telemetry, dashboard, template plugins** — changelog_taxation_removal, changelog_split_check_removal, changelog_cloud_bridge_removal, changelog_dashboard_removal, changelog_receipt_template_plugin_removal [INFERRED 0.85]
- **Kitchen ticket pipeline: rounds, runs, stations, folding, one road** — changelog_kot_rounds, changelog_service_runs, changelog_upstream_kitchen_stations, changelog_identical_dish_folding, changelog_kitchen_ticket_one_road, changelog_kitchen_ticket_design [INFERRED 0.85]
- **POS Order Entry Flow** — docs_images_buonapp_pos_product_grid, docs_images_buonapp_pos_cart_panel, docs_images_buonapp_pos_order_type_selector, docs_images_buonapp_pos_printer_selector [INFERRED 0.85]
- **Fork-Added Table-Service Domains** — readme_floor_map, readme_service_days, readme_reservations, readme_cover_charge, readme_fixed_menus, readme_kitchen_tickets_by_round, agents_services_routes_boundary [INFERRED 0.85]
- **Table service flow: reservations, floor map, service days** — frontend_readme_reservations_page, frontend_readme_tables_page, frontend_readme_service_days_page, frontend_readme_joined_tables_and_layouts [INFERRED 0.85]
- **Service day lifecycle (open, serve, close)** — docs_table_management_service_days, docs_table_management_get_or_open_service_day, docs_table_management_day_close_ritual, docs_api_service_days_endpoints, docs_order_flow_and_navigation_giornata, docs_rifacimento_grafica_service_day_chip [INFERRED 0.85]
- **Handheld Server App device boundary** — docs_palmare_server_app, docs_palmare_proxy, docs_api_server_app_allowlist, docs_table_management_device_boundary, docs_palmare_no_cash [INFERRED 0.95]

## Communities (213 total, 23 thin omitted)

### Community 1 - "Moduli e UI condivisa"
Cohesion: 0.05
Nodes (92): PosKey, ProductsKey, TabType, BookingRowProps, EditBookingModalProps, DayDetailModalProps, Props, StatusInfo (+84 more)

### Community 10 - "Mappa sala e dettaglio tavolo"
Cohesion: 0.05
Nodes (59): Filters, FilterType, OrdersKey, Props, OrderPanelProps, Props, Props, RoomTab (+51 more)

### Community 102 - "Shell del palmare"
Cohesion: 0.26
Nodes (12): OrderAttempt, View, ServerStandalonePage(), clearOrderAttempt(), readOrderAttempt(), saveOrderAttempt(), apiErrorCode(), newIdempotencyKey() (+4 more)

### Community 108 - "Modulo tavolo"
Cohesion: 0.19
Nodes (13): DeleteTableModalProps, Orientation, SizeKey, TableShape, DeleteTableModal(), dimensionsFor(), orientationOf(), sizeForCapacity() (+5 more)

### Community 109 - "Test retry del carrello POS"
Cohesion: 0.21
Nodes (10): MemoryStorage, getPostpaidOrderAttemptStorageKey(), addon(), main(), APPEND_ATTEMPT_MAX_AGE_MS, APPEND_ATTEMPT_STORAGE_KEY, LEGACY_POSTPAID_ATTEMPT_STORAGE_KEY, {
  APPEND_ATTEMPT_MAX_AGE_MS,
  APPEND_ATTEMPT_STORAGE_KEY,
  LEGACY_POSTPAID_ATTEMPT_STORAGE_KEY,
  getAppendAttemptStorageKey,
  getPostpaidOrderAttemptStorageKey,
  buildAppendItemsFingerprint,
  createSafeAppendAttemptStorage,
  getOrCreateAppendAttempt,
  migrateLegacyAppendAttempt,
  readAppendAttempt,
  clearAppendAttempt,
  isPermanentAppendRefusal,
} (+2 more)

### Community 11 - "Pannello ordine e cassa POS"
Cohesion: 0.06
Nodes (62): PrepaidAttempt, HistoryOrder, Props, CancelModal, DiscountModal, OrdersKey, VoidItemModal, Payment (+54 more)

### Community 111 - "Test stampa scontrino"
Cohesion: 0.18
Nodes (11): PrintType, printReceipt(), assert(), runTests(), db, { initDatabase, getDatabase, closeDatabase }, mockApp, Module (+3 more)

### Community 117 - "Sessione API palmare"
Cohesion: 0.33
Nodes (9): ServerSession, ServerUser, clearServerToken(), createServerApi(), readServerToken(), storeServerToken(), useServerSession(), SERVER_APP_TOKEN_KEY (+1 more)

### Community 12 - "Server KDS e WebSocket"
Cohesion: 0.08
Nodes (69): KdsRequestUser, RateLimitOptions, RateLimitRecord, UserAuthCacheEntry, OrderItemRow, KdsClient, areCustomersEnabled(), attachEffectiveAddons() (+61 more)

### Community 126 - "KDS standalone"
Cohesion: 0.33
Nodes (9): KdsViewMode, ServerKdsInfo, createStandaloneApi(), KdsStandalonePage(), useKdsDisabledCheck(), useServerKdsInfo(), fetchServerInfo(), useSyncServerLanguage() (+1 more)

### Community 127 - "Preferenze di locale"
Cohesion: 0.29
Nodes (10): Props, SettingsKey, Tenant, CalendarMode, CountryLocaleOptions, CurrencyDisplay, DigitMode, CALENDAR_LABELS (+2 more)

### Community 14 - "Servizio WhatsApp (Baileys)"
Cohesion: 0.06
Nodes (67): BlocklistRow, InboxMessage, MinimalLogger, QueuedSend, SendResult, SentMessageRow, WhatsAppConnectionState, WhatsAppStatus (+59 more)

### Community 142 - "Badge dietetici"
Cohesion: 0.31
Nodes (9): KnownDietaryTag, PosKey, firstTagBg(), formatTagName(), normalizeTag(), TagBadge(), tagLabel(), DIETARY_TAG_KEYS (+1 more)

### Community 143 - "Errori di stampa"
Cohesion: 0.33
Nodes (9): correlatedError, FloErrorCode, correlationId(), errorDetails(), classifyPrintFailure(), extractPlatformErrorCode(), printKOTDetailed(), printReceiptDetailed() (+1 more)

### Community 145 - "Test recupero stato auth"
Cohesion: 0.31
Nodes (5): MockLocalStorage, parseStoredTenant(), run(), { assertEqual, assert }, storage

### Community 15 - "Rotte ordini e clienti"
Cohesion: 0.05
Nodes (54): NormalizedPhoneResult, AddonGroupImportPlan, CsvImportError, NumericParseResult, createSchema(), upsertSettings(), verifyPin(), normalizeOptionalPhone() (+46 more)

### Community 150 - "Errori di login"
Cohesion: 0.25
Nodes (7): LoginFailure, parseLoginFailure(), assert, frontendRequire, Module, { parseLoginFailure }, path

### Community 151 - "Cache di avvio"
Cohesion: 0.31
Nodes (4): CacheFsOps, Logger, clearStaleRenderCachesOnVersionChange(), STALE_RENDER_CACHE_DIRS

### Community 16 - "Menu fisso lato frontend"
Cohesion: 0.07
Nodes (65): Props, Props, RowEdit, CourseFill, CourseFillEntry, CourseMembership, MenuGroupState, MenuLineDish (+57 more)

### Community 163 - "Tipi API Electron"
Cohesion: 0.29
Nodes (6): ElectronAPI, HealthCheckReport, HealthFinding, HealthFindingRisk, UpdateStatus, Window

### Community 171 - "Store impostazioni POS"
Cohesion: 0.40
Nodes (5): SelectableOrderType, CoreBillTemplate, PosSettingsState, PrinterPrintMode, Settings page

### Community 172 - "Tipi dei messaggi i18n"
Cohesion: 0.40
Nodes (5): Locale, AppConfig, Messages, use-intl, frontend_src_lib_i18n_messages_en

### Community 178 - "Errori API frontend"
Cohesion: 0.50
Nodes (4): ApiErrorBody, Translate, apiErrorText(), toastApiError()

### Community 18 - "PIN master e IPC"
Cohesion: 0.07
Nodes (57): MasterPinAuthResult, MasterPinBlob, getSchemaVersionFromBackup(), isManagedBackupFile(), handle(), isTrustedSender(), maskSetting(), registerIpcHandlers() (+49 more)

### Community 180 - "Avvio standalone"
Cohesion: 0.50
Nodes (4): StandaloneStartupOptions, startStandaloneServers(), throwIfShutdownRequested(), testStandaloneStartupCancellation()

### Community 19 - "Connessione KDS frontend"
Cohesion: 0.07
Nodes (51): KdsColumnProps, KdsHeaderProps, KdsItemModalProps, BoardStatus, DragData, DropData, KdsKanbanBoardProps, KdsTabsViewProps (+43 more)

### Community 2 - "Componenti UI base"
Cohesion: 0.04
Nodes (79): NavItem, NavKey, PageHeaderProps, SidebarContextProps, AddonGroupsPage(), getLandingPage(), GlobalNotifications(), AppSidebar() (+71 more)

### Community 20 - "Pagina Impostazioni"
Cohesion: 0.06
Nodes (46): InvoiceResetPeriod, SettingsKey, TemplateCard, PendingPinAction, HealthCheckDialogProps, InitializeDatabaseDialogProps, MasterPinPromptProps, ConfirmState (+38 more)

### Community 23 - "Pagina WhatsApp e tabelle"
Cohesion: 0.05
Nodes (50): BusinessTypeKey, StaffRoleKey, BlocklistRow, InboxMessage, SentMessage, StatusStep, WhatsAppApiErrorKey, WhatsAppKindKey (+42 more)

### Community 24 - "Servizio menu fisso"
Cohesion: 0.08
Nodes (46): Db, ExpandedOrderItem, FixedMenuChoiceInput, FixedMenuCourse, FixedMenuSurcharge, MenuCountPlan, MenuCoursePlan, MenuGroupRow (+38 more)

### Community 26 - "Rilevamento e stampa termica"
Cohesion: 0.08
Nodes (49): DayReportLabels, DispatchResult, KotLabels, PrinterColumnWidth, PrinterInfo, PrintFailureClass, PrintResult, PrintWarning (+41 more)

### Community 27 - "Username e rotte staff"
Cohesion: 0.07
Nodes (38): LegacyLoginRow, assignMissingUsernames(), convertLegacyUsernames(), isUsernameShape(), isValidUsername(), normalizeUsername(), pickUniqueUsername(), takenUsernames() (+30 more)

### Community 29 - "Rotte di autenticazione"
Cohesion: 0.06
Nodes (38): DemoLang, DemoMenu, defaultTableSize(), demoLanguage(), dialCodeFor(), insertCategory(), insertCustomer(), insertProduct() (+30 more)

### Community 3 - "Database, backup e ripristino"
Cohesion: 0.04
Nodes (98): InvoiceResetPeriod, KdsEnabledSettingState, KdsStationRoutingScope, KitchenStationSecurityState, ReplacementJournal, RestoreProtectedSettingState, RestoreResult, RevocationRow (+90 more)

### Community 31 - "Primo avvio e paesi"
Cohesion: 0.07
Nodes (35): ServiceModel, SetupKey, SetupProfile, TimeZoneSelectProps, Country, SetupPage(), roleLabel(), StaffSettings() (+27 more)

### Community 32 - "Impostazioni e tipi di ordine"
Cohesion: 0.06
Nodes (34): SelectableOrderType, LocalePreferenceKey, CoreBillTemplate, OrderHistoryGrid(), getCurrencySymbol(), isOrderTypeAllowed(), isSelectable(), parseOrderTypes() (+26 more)

### Community 34 - "Tipi WebUSB"
Cohesion: 0.05
Nodes (22): Navigator, USB, USBAlternateInterface, USBConfiguration, USBConnectionEvent, USBControlTransferParameters, USBDevice, USBDeviceFilter (+14 more)

### Community 37 - "Pagina prova stampa"
Cohesion: 0.11
Nodes (34): PaperWidth, TestMode, WhatsAppShareOptions, generateKotHtml(), generateThermalReceiptHtml(), PrintTestPage(), formatDate(), createTestBill() (+26 more)

### Community 39 - "Test menu fisso e giri"
Cohesion: 0.07
Nodes (35): Db, defaultServiceRunForProduct(), groupItemsByServiceRun(), normalizeServiceRun(), resolveServiceRun(), seedServerUser(), main(), fixedMenuRoutes (+27 more)

### Community 4 - "Servizi tavoli, giornata, prenotazioni"
Cohesion: 0.04
Nodes (90): TableShape, CancelOrderOptions, Db, AssignResult, Db, ReservationInput, ReservationRow, ReservationStatus (+82 more)

### Community 40 - "Idempotenza invio ordine"
Cohesion: 0.14
Nodes (35): AppendAttemptCompletion, AppendAttemptOptions, LegacyAppendAttemptConflictError, StoredAttempt, appendAttemptsMatch(), assertVerifiedCompletionReads(), clearAppendAttempt(), completedAttemptMatches() (+27 more)

### Community 42 - "Salute dello schema DB"
Cohesion: 0.08
Nodes (33): ApplySafeFixesResult, ColumnDef, DbSchemaSnapshot, FindingKind, ForeignKeyDef, HealthCheckReport, HealthFinding, IndexDef (+25 more)

### Community 43 - "Varianti e gruppi addon"
Cohesion: 0.07
Nodes (25): FieldErrors, serializeAddon(), serializeAddonGroup(), toBoolean(), assert(), assertEqual(), makeRequest(), runTests() (+17 more)

### Community 44 - "Encoder preconto frontend"
Cohesion: 0.14
Nodes (30): Col4Widths, dishIdentity(), billRowIdentity(), menuCourseLine(), printableBillRows(), amountTextFor(), buildClassicReceiptBytes(), buildCompactReceiptBytes() (+22 more)

### Community 49 - "PrinterService e hook stampante"
Cohesion: 0.10
Nodes (17): HardwarePrinter, KotOptions, KotSendResponse, KotSendResult, PaperWidth, PrinterState, PrintModeType, ReceiptTenant (+9 more)

### Community 5 - "Tipi e componenti ordine"
Cohesion: 0.06
Nodes (79): LtrProps, Props, Props, Props, Props, Props, Tally, Props (+71 more)

### Community 52 - "Test traduzioni"
Cohesion: 0.14
Nodes (30): IcuInfo, assert(), collectCalledKeys(), collectUnsafeDynamicKeys(), expectDetected(), faFallbackErrors(), findDuplicateKeys(), findStructuralErrors() (+22 more)

### Community 55 - "Provider i18n e fuso SSR"
Cohesion: 0.12
Nodes (24): Messages, getDefaultTimeZone(), handleI18nError(), I18nProvider(), resolveInitialLanguage(), getCachedMessages(), loadLocaleMessages(), assert() (+16 more)

### Community 56 - "Spegnimento pulito"
Cohesion: 0.10
Nodes (28): ClosableHttpServer, HttpRequestState, HttpServerState, ShutdownAppEvent, ShutdownCoordinatorOptions, ShutdownEntrypointApp, ShutdownEntrypointOptions, ShutdownEntrypointProcess (+20 more)

### Community 57 - "Profili paese e valuta"
Cohesion: 0.13
Nodes (19): CurrencyUnitAdapter, LocalePreferences, Row, HistoryOrderCard(), formatCurrency(), formatMoney(), formatNumber(), formatNumberForTenant() (+11 more)

### Community 58 - "Registro lingue i18n"
Cohesion: 0.18
Nodes (22): BusinessTypeKey, CommonKey, OrdersKey, StaffKey, TablesKey, Language, LanguageConfig, LanguageDirection (+14 more)

### Community 60 - "Backup Google Drive"
Cohesion: 0.21
Nodes (6): GoogleDriveService, createDriveShutdownError(), getTokenFilePath(), isSecureStorageAvailable(), requestSignal(), waitForDriveOperation()

### Community 61 - "Test ciclo di spegnimento"
Cohesion: 0.17
Nodes (22): ProcessDouble, cancelHttpShutdownWork(), closeServerResources(), createShutdownCoordinator(), createShutdownEntrypoints(), installHttpShutdownTracking(), delay(), getFreeTcpPort() (+14 more)

### Community 62 - "Test errori localizzati"
Cohesion: 0.08
Nodes (26): Lang, assert(), buildHtmlDocument(), renderScreenshotWithPlaywright(), run(), t(), BUILT_CSS, { createTranslator } (+18 more)

### Community 63 - "Conti e pagamenti"
Cohesion: 0.11
Nodes (21): OrderBillSyncValues, PaymentInput, PreparedPayment, utcDayBounds(), utcTodayDate(), applyPaymentBatch(), calculateCashback(), canonicalizePaymentRequest() (+13 more)

### Community 67 - "Test coperti al tavolo"
Cohesion: 0.11
Nodes (21): PosKey, Props, Database, TablePickerModal(), TableDetailModal(), coversForNewOrder(), validCovers(), booking() (+13 more)

### Community 71 - "Test backup e ripristino"
Cohesion: 0.09
Nodes (16): Database, dataOnlyRestore(), getColumns(), getTables(), backupPath, currentDb, extractedVersion, invalidBackup (+8 more)

### Community 72 - "Figlio test avvio fallito"
Cohesion: 0.08
Nodes (12): SchemaVersionMismatchError, app, appListeners, events, exitCodes, fs, log, Module (+4 more)

### Community 73 - "Pagine POS e ordini"
Cohesion: 0.17
Nodes (18): PostpaidAttempt, PrepaidPayment, KotSupportError, AppendAttempt, AppendAttemptStorage, OrdersPage(), normalizeBarcode(), POSPage() (+10 more)

### Community 74 - "Validazione note ordine"
Cohesion: 0.14
Nodes (17): HeldOrderRow, TestDb, isRecord(), isValidIdentifier(), parseStoredHeldOrder(), validateHeldOrderInput(), validateHeldOrderItem(), validateItemNotes() (+9 more)

### Community 77 - "Menu a tendina e barra azioni"
Cohesion: 0.13
Nodes (15): Props, UpdateBadge(), OrderActionBar(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+7 more)

### Community 8 - "Test primo avvio e ruolo cameriere"
Cohesion: 0.04
Nodes (65): FakeWebContents, deleteBackup(), getDbHealth(), resolveContainedPath(), resolveStaticPage(), startServer(), count(), isNativeAbiMismatch() (+57 more)

### Community 88 - "Credenziali Drive e shutdown"
Cohesion: 0.11
Nodes (17): BackupFrequency, GoogleDriveStatus, OAuth2Client, StoredTokens, cancelDriveOperation(), computeFilesToDelete(), getClientCredentials(), isBackupDue() (+9 more)

### Community 9 - "Avvio server Electron/Express"
Cohesion: 0.06
Nodes (66): ServerAppUser, buildCspHeader(), beginDatabaseShutdown(), createDatabaseShutdownTimeoutError(), isServerAppEnabled(), waitForDatabaseRequests(), checkForUpdates(), createMenu() (+58 more)

### Community 90 - "Stampa web del preconto"
Cohesion: 0.21
Nodes (17): PaperSize, ReceiptTenant, WebPrintOptions, ensureReceiptMessagesLoaded(), escapeHtml(), formatReceiptDate(), generateBillHtml(), getPaperStyles() (+9 more)

### Community 91 - "Test ESC/POS"
Cohesion: 0.11
Nodes (11): PrinterCommandSet, PrinterCutMode, SupportedPrinterProfile, getSupportedPrinterProfiles(), row(), loadFrontendPrinterModules(), SUPPORTED_PRINTER_PROFILES, failures (+3 more)

### Community 98 - "Ordini sospesi e service worker"
Cohesion: 0.14
Nodes (14): HeldOrder, createHeldOrdersStore(), clone(), main(), makeHeldOrder(), PRECACHE_URLS, assert, { createHeldOrdersStore } (+6 more)

### Community 99 - "Tipi receipt-printer-encoder"
Cohesion: 0.12
Nodes (3): ReceiptPrinterEncoder, ReceiptPrinterEncoderOptions, @point-of-sale/receipt-printer-encoder

### Community 100 - "Test stampa conti"
Cohesion: 0.14
Nodes (15): assert(), runTests(), app, { billRoutes }, db, express, { getJWTSecret }, { initDatabase, getDatabase, closeDatabase } (+7 more)

### Community 101 - "Test backup su Windows"
Cohesion: 0.16
Nodes (15): check(), runTests(), { authRoutes, getJWTSecret }, Database, { databaseRoutes }, express, fs, {
  initDatabase,
  getDatabase,
  closeDatabase,
  createBackup,
  getCurrentSchemaVersion,
} (+7 more)

### Community 103 - "Test revoca token"
Cohesion: 0.15
Nodes (14): run(), bcrypt, Database, fs, { getJWTSecret, authRoutes }, { initDatabase, getDbPath }, {
  initTestDb, createApp, assertEqual, getResults, getDatabase, closeDatabase, now,
}, { isTokenRevoked, revokeToken } (+6 more)

### Community 110 - "Rotte stampanti e profili"
Cohesion: 0.21
Nodes (14): getSettingValue(), buildTestPage(), columnsForPaperWidth(), dispatchPrint(), formatReceipt(), getColumnsForPrinter(), getPrinterConfig(), getPrinterStatus() (+6 more)

### Community 113 - "Test fondamenta RTL"
Cohesion: 0.20
Nodes (13): assert(), loadLtrComponent(), run(), scanDir(), scanFile(), ALLOWLIST, frontendRequire, GLOBALS_CSS (+5 more)

### Community 118 - "Test larghezza carta"
Cohesion: 0.21
Nodes (11): escPosToText(), initPrinter(), assert(), main(), fs, { initDatabase, getDatabase, closeDatabase, now }, { initPrinter, prepareReceipt, escPosToText }, Module (+3 more)

### Community 119 - "Verifica runtime Electron"
Cohesion: 0.24
Nodes (10): fail(), classifyQuarantine(), main(), readQuarantine(), run(), { execFileSync }, fs, path (+2 more)

### Community 120 - "Test locale, fuso e tipi ordine"
Cohesion: 0.20
Nodes (11): main(), setSetting(), settingValue(), assert, {
  createApp,
  startServer,
  seedOwnerUser,
  api,
  initTestDb,
  getDatabase,
  closeDatabase,
  now,
}, fs, Module, os (+3 more)

### Community 121 - "Runner test Electron"
Cohesion: 0.18
Nodes (10): runElectronNode(), verifyBetterSqlite3(), args, electronPath, path, rebuildCli, result, { spawnSync } (+2 more)

### Community 128 - "Generazione numeri d'ordine"
Cohesion: 0.24
Nodes (10): dateStampInTimezone(), generateOrderNumber(), main(), fs, { generateOrderNumber, generateBillNumber, dateStampInTimezone }, {
  initTestDb, getResults, closeDatabase,
  assert, assertEqual,
}, Module, os (+2 more)

### Community 13 - "Test rate limit PIN manager"
Cohesion: 0.04
Nodes (68): getUserAuthStatus(), getJWTSecret(), requireAuth(), buildApp(), main(), seedUser(), seedServerUser(), main() (+60 more)

### Community 131 - "Test RTL setup e impostazioni"
Cohesion: 0.25
Nodes (8): assert(), loadLtrComponent(), run(), ALLOWLIST, frontendRequire, Module, ROOT, SCREEN_FILES

### Community 132 - "Shard dei test in CI"
Cohesion: 0.18
Nodes (9): fs, index, mine, packageJsonPath, path, pkg, { spawnSync }, suites (+1 more)

### Community 146 - "Test rimedi audit i18n"
Cohesion: 0.22
Nodes (7): assert(), run(), cleanupResolver, failures, { getCachedMessages, loadLocaleMessages }, { ITEM_STATUS_LABEL_KEYS }, { LANGUAGES, getLanguageDirection }

### Community 147 - "Test ricerca per telefono"
Cohesion: 0.20
Nodes (9): insertCustomer(), fs, { initTestDb, closeDatabase, seedOwnerUser, api, assertEqual, assert, getResults, createApp, startServer }, mockApp, Module, os, path, { registerRoutes } (+1 more)

### Community 158 - "Test chunk delle lingue"
Cohesion: 0.43
Nodes (7): assert(), decodeJavaScriptEscapes(), getLocaleMarkers(), run(), walkFiles(), MESSAGES_DIR, OUT

### Community 164 - "Passi di spegnimento"
Cohesion: 0.29
Nodes (7): createExitCodeAwareShutdown(), isShutdownTimeout(), runShutdownSteps(), main(), testDatabaseCloseRequiresSuccessfulDrains(), testExitCodeEscalation(), testTimedOutCleanupUsesFatalBarrier()

### Community 166 - "Script afterPack"
Cohesion: 0.29
Nodes (5): fs, NATIVE_BINARY_NAMES, path, { spawnSync }, ref_child_process

### Community 167 - "Runner test disinstallatore"
Cohesion: 0.29
Nodes (5): path, result, runtime, { spawnSync }, testPath

### Community 17 - "Helper di test condivisi"
Cohesion: 0.18
Nodes (67): main(), main(), main(), main(), api(), assert(), assertEqual(), assertIncludes() (+59 more)

### Community 174 - "Test preconti nel browser"
Cohesion: 0.40
Nodes (4): assert(), run(), failures, { webPrint, i18n, countries }

### Community 177 - "Azioni menu con PIN"
Cohesion: 0.80
Nodes (5): MenuActionHandler(), beginPinGatedAction(), handlePinSubmit(), runBackup(), runRestore()

### Community 179 - "Raggruppamento righe comanda/conto"
Cohesion: 0.40
Nodes (5): billRowIdentity(), compactBillRows(), compactKotItems(), kotItemIdentity(), printableBillRows()

### Community 21 - "Test DB e WebSocket KDS"
Cohesion: 0.05
Nodes (55): autoRepairDefaultPrinter(), autoRepairPaymentDetails(), closeDatabase(), initDatabase(), repairSequences(), runStartupIntegrityCheck(), getKdsPort(), stopKdsServer() (+47 more)

### Community 22 - "Test autorizzazioni staff"
Cohesion: 0.04
Nodes (54): countrySearch(), run(), main(), seedUser(), main(), seedUser(), authRoutes, staffRoutes (+46 more)

### Community 25 - "Test username"
Cohesion: 0.07
Nodes (49): captureUserSecurityState(), createBackup(), getCurrentSchemaVersion(), getDatabase(), assertNoRestoreAttachment(), clearLinkedData(), copyAndStamp(), run() (+41 more)

### Community 28 - "Contratto KDS e addon"
Cohesion: 0.05
Nodes (44): main(), seedUser(), kdsRoutes, kitchenRoutes, orderItemRoutes, { attachEffectiveAddons }, fs, { getEffectiveOrderItems } (+36 more)

### Community 30 - "Test immagini e riscatto punti"
Cohesion: 0.05
Nodes (41): assertGreaterThan(), seedWalletCredit(), fs, { heldOrderRoutes }, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedTable,
  api, assert, assertEqual,
  closeDatabase, getDatabase, now,
}, Module, os, path (+33 more)

### Community 33 - "Test ciclo di vita ordine"
Cohesion: 0.06
Nodes (39): resetCounters(), seedManagerUser(), seedTable(), installConcurrentOrderBoundaryMutation(), installOrderBoundaryMutation(), main(), waitForOutboxCount(), bcrypt (+31 more)

### Community 35 - "Test catalogo prodotti"
Cohesion: 0.05
Nodes (36): seedCategoryRow(), addonGroupRoutes, categoryRoutes, productRoutes, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual, getResults, closeDatabase,
}, Module, os (+28 more)

### Community 36 - "Test sconti, fedeltà, PIN manager"
Cohesion: 0.05
Nodes (35): seedBill(), makeToken(), run(), billRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer,
  seedOwnerUser, seedCategory, seedProduct,
  api, assert, assertEqual,
  getResults, closeDatabase, getDatabase, now,
}, Module (+27 more)

### Community 38 - "Rotte prodotti"
Cohesion: 0.08
Nodes (25): generateShortId(), isBlockedSsrfTarget(), createCategory(), deleteCategory(), hasOwn(), isDescendantCategory(), normalizeCategoryName(), normalizeOptionalString() (+17 more)

### Community 45 - "Layout preconto e report giornata"
Cohesion: 0.14
Nodes (33): parseDbTimestamp(), addonRows(), buildEscPos(), capitalize(), coverChargeLabel(), encodeCodePageLine(), financialRows(), formatClassicReceipt() (+25 more)

### Community 46 - "Test clienti e paginazione"
Cohesion: 0.06
Nodes (30): main(), makeToken(), customerRoutes, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, Module (+22 more)

### Community 47 - "Server e2e di test"
Cohesion: 0.07
Nodes (28): stop(), bcrypt, { createExitCodeAwareShutdown, waitForHttpShutdownWork, isShutdownTimeout }, fs, { initDatabase, getDatabase, closeDatabase, beginDatabaseShutdown, waitForDatabaseRequests, now }, Module, os, path (+20 more)

### Community 48 - "Dev server"
Cohesion: 0.07
Nodes (30): shutdown(), { createExitCodeAwareShutdown, waitForHttpShutdownWork, isShutdownTimeout }, envPath, fs, { initDatabase, closeDatabase, beginDatabaseShutdown, waitForDatabaseRequests }, mockApp, Module, os (+22 more)

### Community 50 - "Rotte stampanti e giri di comanda"
Cohesion: 0.11
Nodes (28): isKotPrintingEnabled(), withTxn(), claimKotBatch(), cookableItems(), ensureDefaultPrinter(), getKotBatchItems(), getLastKotBatch(), getPendingKotItems() (+20 more)

### Community 51 - "Test migrazioni e upgrade"
Cohesion: 0.07
Nodes (28): isNativeAbiMismatch(), main(), isNativeAbiMismatch(), main(), main(), dbPath, FIXTURE, FixtureDatabase (+20 more)

### Community 53 - "Test fedeltà e auth cliente"
Cohesion: 0.07
Nodes (27): main(), makeToken(), bcrypt, { customerRoutes }, { getJWTSecret }, {
  initTestDb,
  createApp,
  assertEqual,
  getResults,
  closeDatabase,
  now,
}, jwt, Module (+19 more)

### Community 54 - "Layout app e lingua HTML"
Cohesion: 0.12
Nodes (19): KdsHtmlLang(), AuthGuard(), DirectionalToaster(), HtmlLangSync(), Tabs(), TabsList(), getLanguageDirection(), getLanguageFromLocale() (+11 more)

### Community 59 - "Test RTL delle schermate"
Cohesion: 0.10
Nodes (24): assert(), loadComponents(), run(), renderDirectionalToaster(), assert(), loadComponents(), run(), ALLOWLIST (+16 more)

### Community 6 - "Test coperto e numerazione"
Cohesion: 0.03
Nodes (78): routeItemsToStations(), seedPrintableBill(), upsertSetting(), main(), settingsRoutes, capVersion, mockApp, Module (+70 more)

### Community 65 - "Script kill-ports"
Cohesion: 0.14
Nodes (23): getCmdline(), getProcessesOnPort(), gracefulKill(), gracefulKillWindows(), isBuonAppProcess(), isProjectDevInstance(), isValidPid(), killPort() (+15 more)

### Community 66 - "Figlio test import DB"
Cohesion: 0.09
Nodes (24): run(), main(), databaseRoutes, {
  createShutdownCoordinator,
  createShutdownEntrypoints,
  installHttpShutdownTracking,
}, Database, dbModule, express, fs (+16 more)

### Community 69 - "API strumenti database"
Cohesion: 0.09
Nodes (22): assert(), runTests(), tokenFor(), databaseToolsRoutes, { API_JSON_BODY_LIMIT }, app, { authRoutes }, { cancelHttpShutdownWork, closeHttpServer, installHttpShutdownTracking } (+14 more)

### Community 7 - "Test tavoli, prenotazioni, giornate"
Cohesion: 0.03
Nodes (77): orderRoutes, roomRoutes, serviceDayRoutes, tableRoutes, { assertEqual, assert }, { buildIdealSchemaDb }, db, ins (+69 more)

### Community 78 - "Allowlist URL e stampa"
Cohesion: 0.14
Nodes (18): createWindow(), isAllowedLocalWindowUrl(), isSafeExternalUrl(), originFor(), assert(), loadFrontendModules(), run(), printerRoutes (+10 more)

### Community 79 - "Spec Playwright RTL"
Cohesion: 0.14
Nodes (5): base64Url(), getE2eToken(), setLanguage(), E2E_JWT_SECRET, E2E_PASSWORD

### Community 81 - "Import/export menu CSV"
Cohesion: 0.10
Nodes (19): addonCsv(), addonCsvWithHeader(), productCsv(), getText(), fs, {
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
}, { menuCsvRoutes }, Module (+11 more)

### Community 82 - "Test integrità prezzi addon"
Cohesion: 0.12
Nodes (18): assertEqual(), isNativeAbiMismatch(), listen(), main(), request(), bcrypt, express, fs (+10 more)

### Community 83 - "Test annulli con override"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), isNativeAbiMismatch(), listen(), main(), request(), seedTestData(), bcrypt (+12 more)

### Community 84 - "Test sistema sconti"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), assertIncludes(), isNativeAbiMismatch(), listen(), main(), request(), seedTestData() (+11 more)

### Community 85 - "Test varianti in cucina"
Cohesion: 0.13
Nodes (20): assert(), assertEqual(), isNativeAbiMismatch(), listen(), main(), request(), seedTestData(), bcrypt (+12 more)

### Community 89 - "Test addon su righe ordine"
Cohesion: 0.13
Nodes (19): assert(), assertEqual(), isNativeAbiMismatch(), listen(), main(), request(), bcrypt, express (+11 more)

### Community 92 - "Test API stampanti"
Cohesion: 0.14
Nodes (16): printReceipt(), assert(), defaultCount(), defaultId(), runTests(), app, db, express (+8 more)

### Community 94 - "Test impostazioni sconti"
Cohesion: 0.14
Nodes (15): assertEqual(), assertIncludes(), main(), on(), request(), seedTestData(), fs, http (+7 more)

### Community 115 - "Changelog 6.x: palmare e username"
Cohesion: 0.18
Nodes (12): Any waiter can work any open order, Cloud bridge and telemetry removal (migration v80), Handheld catalogue/settings refresh on tick and visibility, Handheld / Server App (:3003), Pre-migration auto-backup before every upgrade (2.0.1), Persisted token revocation on handheld logout, Upstream cloud sync, FloAdmin, RevFlo and telemetry, Master PIN protection and password recovery (+4 more)

### Community 122 - "Changelog 6.0: menu fisso e coperto"
Cohesion: 0.25
Nodes (11): Counted fixed menu (menu line with quantity N), Cover charge (migrations v88-v90), New order starts from the table's covers, Fixed menu (migration v92), Joined tables (migration v77, merged_into), Per-dish exceptions in menu courses (migration v93), Fixed menu filled in as the meal goes (migration v95), Line discount follows menu count; cash discount capped (+3 more)

### Community 134 - "Workflow di rilascio"
Cohesion: 0.20
Nodes (9): Release Notes from CHANGELOG.md, Release Tag Validation (strict X.Y.Z = package.json), Windows Auto-Update Assets (latest.yml + .exe.blockmap), Unsigned Windows NSIS Installer, changelog-notes.sh script, Full Cross-Platform Matrix Workflow, Release Workflow, Branch Naming & Conventional Commits (+1 more)

### Community 135 - "Changelog 6.0.1: comande a giri"
Cohesion: 0.24
Nodes (10): Folding identical dishes (ticket, table, bill), Kitchen ticket redesign, Kitchen ticket has one road (backend only), Kitchen tickets sent in rounds (kot_batch, migration v72), Service runs (migration v94), Kitchen stations routing (1.9.7), Void with mirrored negative line and manager PIN (2.2.0), Cached C# DLL for USB raw ESC/POS printing on Windows (+2 more)

### Community 136 - "Changelog 5.0: preconto e rimozioni"
Cohesion: 0.27
Nodes (10): Price written on the row (migrations v84, v87), Order screen (formerly till) takes no money, Preconto (bill, not a receipt), Receipt-template plugin path removal (migration v82), Split check between guests removed (migration v91), Taxation module removal (migration v81), Upstream split checks and split payments (3.0.0), Upstream country tax packs and manual tax builder (+2 more)

### Community 148 - "Pipeline CI"
Cohesion: 0.25
Nodes (9): Security & Dependency Review Job, End-to-End Playwright & Release Regression Job, Lint & Build Validation (Linux) Job, Sharded Core Test Suite Job, CI Path Filtering (frontend/backend/kds/db/uninstaller), Windows Uninstaller Pester Tests Job, CI Workflow, Dependabot Configuration (+1 more)

### Community 159 - "Changelog: origini da FloCafe"
Cohesion: 0.33
Nodes (7): Clean shutdown and single-instance lock handling, FloCafe (upstream project), Rename Flo Cafe to BuonApp (it.buonapp.pos, buonapp.local), Google Drive backups (1.9.9), Release 4.0.1 - new application icon, Release 4.1.1 - clean shutdown, CHANGELOG.md

### Community 168 - "Changelog: chiusura giornata"
Cohesion: 0.33
Nodes (6): Dashboard removal, Service day close, Forced day close (owner-only, cancels open orders), Service days (migration v74), Timestamp normalization to SQLite CURRENT_TIMESTAMP format (2.6.0), Release 6.2.3 - cancelled order bill no longer blocks day close

### Community 96 - "Changelog 4.x: sala e prenotazioni"
Cohesion: 0.18
Nodes (16): auto_print_kot setting removed, Customer book switch customers_enabled (migration v79), Floor map with rooms (migration v75), Orders keep a snapshot of their table (migration v73), Reservation sheet with dynamic table assignment, Reservations (migration v76), Saved floor plans / table_layouts (migration v78), Horizontal/vertical rectangular table orientation (+8 more)

### Community 0 - "Script npm del backend"
Cohesion: 0.01
Nodes (158): scripts, audit:db, build, build:all-platforms, build:appx, build:frontend, build:linux, build:mac (+150 more)

### Community 107 - "DevDependencies frontend"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, @playwright/test, postcss, shadcn, tailwindcss (+6 more)

### Community 112 - "Script metainfo Linux"
Cohesion: 0.14
Nodes (13): date, escapedVersion, { execFileSync }, META_FILE, notes, NOTES_HELPER, path, pkg (+5 more)

### Community 114 - "tsconfig dei test"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 129 - "Config electron-builder"
Cohesion: 0.18
Nodes (11): build, afterPack, appId, asar, asarUnpack, directories, extraResources, files (+3 more)

### Community 130 - "Build macOS"
Cohesion: 0.18
Nodes (11): mac, artifactName, category, entitlements, entitlementsInherit, gatekeeperAssess, hardenedRuntime, icon (+3 more)

### Community 139 - "Override frontend"
Cohesion: 0.20
Nodes (10): overrides, brace-expansion@<1.1.18, brace-expansion@>=4.0.0 <5.0.9, fast-uri, hono, @hono/node-server, ip-address, postcss (+2 more)

### Community 140 - "Manifest PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 144 - "Build Snap"
Cohesion: 0.20
Nodes (10): snapcraft, confinement, environment, extensions, plugs, stagePackages, useLXD, TMPDIR (+2 more)

### Community 152 - "Build Linux"
Cohesion: 0.22
Nodes (9): linux, artifactName, category, description, executableName, extraFiles, icon, synopsis (+1 more)

### Community 156 - "Build AppX"
Cohesion: 0.25
Nodes (8): applicationId, backgroundColor, displayName, identityName, languages, publisher, publisherDisplayName, appx

### Community 165 - "Voce desktop Linux"
Cohesion: 0.29
Nodes (7): entry, Comment, GenericName, Keywords, Name, StartupWMClass, desktop

### Community 169 - "Script frontend"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test:e2e

### Community 173 - "Disinstallatore macOS"
Cohesion: 0.73
Nodes (5): log(), remove_path(), run(), uninstall-macos.sh script, step()

### Community 181 - "Installer NSIS"
Cohesion: 0.40
Nodes (5): nsis, allowToChangeInstallationDirectory, createDesktopShortcut, createStartMenuShortcut, oneClick

### Community 182 - "Pubblicazione GitHub"
Cohesion: 0.40
Nodes (5): publish, owner, provider, releaseType, repo

### Community 183 - "Override backend"
Cohesion: 0.40
Nodes (5): brace-expansion, overrides, brace-expansion, minimatch@3.1.5, node-abi

### Community 184 - "Script nuclear-reset"
Cohesion: 0.80
Nodes (4): clear_electron_caches(), clear_path(), is_safe_clear_path(), nuclear-reset.sh script

### Community 189 - "ESLint frontend"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint-config-next, ref_eslint

### Community 190 - "Build Windows"
Cohesion: 0.50
Nodes (4): win, artifactName, icon, target

### Community 192 - "Autore del pacchetto"
Cohesion: 0.67
Nodes (3): author, email, name

### Community 41 - "Dipendenze e engine backend"
Cohesion: 0.06
Nodes (34): allowScripts, description, engines, node, homepage, license, main, name (+26 more)

### Community 68 - "Test metodi di pagamento"
Cohesion: 0.08
Nodes (23): reportRoutes, { billRoutes }, fs, {
  initTestDb, createApp, startServer, seedOwnerUser, seedManagerUser, seedCategory, seedProduct,
  seedCustomer, seedWalletCredit, api, assert, assertEqual, assertIncludes,
  getResults, closeDatabase, getDatabase, now,
}, Module, { orderRoutes }, os, path (+15 more)

### Community 70 - "Disinstallatore Windows"
Cohesion: 0.25
Nodes (23): Add-ChildUninstallerProcessIds(), Close-BuonApp(), Confirm-BuonAppStopped(), Confirm-ChildUninstallerStopped(), Confirm-NoActiveUninstallWork(), Get-FloProcesses(), Get-ProcessTreeIds(), Invoke-BuonAppUninstall() (+15 more)

### Community 75 - "DevDependencies backend"
Cohesion: 0.09
Nodes (23): devDependencies, cross-env, electron, electron-builder, @electron/rebuild, eslint, @formatjs/icu-messageformat-parser, supertest (+15 more)

### Community 76 - "Pacchetto frontend"
Cohesion: 0.09
Nodes (21): name, private, version, eslint, libphonenumber-js, @types/node, typescript, clsx (+13 more)

### Community 80 - "Dipendenze frontend"
Cohesion: 0.10
Nodes (21): dependencies, axios, class-variance-authority, clsx, @dnd-kit/dom, @dnd-kit/react, libphonenumber-js, lucide-react (+13 more)

### Community 86 - "Config shadcn"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 87 - "tsconfig frontend"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 93 - "Dipendenze runtime backend"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, better-sqlite3, bonjour-service, cors, decimal.js, electron-log, electron-updater (+10 more)

### Community 95 - "tsconfig backend"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+9 more)

### Community 104 - "Invarianti del fork"
Cohesion: 0.15
Nodes (14): Cloud Bridge & Telemetry Removal (4.0.0, migration v80), Data Protection (pre-migration backups, restore, health checks), Upgrade from flo-desktop User-Data Directory, Fork of FloCafe, Optional Google Drive Backup, Feature Request Issue Template, Pull Request Template, Google Drive Backup Setup (docs/google-drive-setup.md) (+6 more)

### Community 105 - "Doc giri di comanda e API"
Cohesion: 0.15
Nodes (14): order_items.kot_batch round ledger, PUT /orders/:id/menu-groups/:groupId/courses/:courseId, Rooms endpoints (/api/rooms), PATCH /orders/:id/items/:itemId/service-run, cancelTargetIds split cancel (package vs dish), isPendingKot (lib/kot.ts), order_items.menu_course_id (v95), PATCH /orders/:id/menu-groups/:groupId quantity (+6 more)

### Community 106 - "Palmare e proxy Server App"
Cohesion: 0.18
Nodes (14): Server App for handhelds (:3003), Server App proxy (main/server-app.ts), Sala view (table list, natural order), Server App tableside handheld, PageToolbar shared page header, Status colors in one place (status-styles.ts), UI primitives (modal, side-panel, stepper, status-badge, segmented-control, action-bar, empty-state), Declared z layers (panel 50, modal 60, confirm 70) (+6 more)

### Community 116 - "Doc menu fisso e sconti"
Cohesion: 0.17
Nodes (12): Order, item and bill discounts with limits, Manager/owner PIN override, Order status transition matrix, fixed_menu_course_products per-dish exceptions (v93), Menu fisso (fixed menu as a product), insertOrderItemRows() unified row writer, order_items.menu_group_id and menu_role, NOT_A_MENU_PACKAGE KDS filter (services/kds.ts) (+4 more)

### Community 123 - "Architettura dei tre server"
Cohesion: 0.20
Nodes (10): Renderer loading page (index.html), Health-check redirect to localhost:3001, Express API and WebSocket (:3001), mDNS advertisement buonapp.local, Role-based access (owner, manager, cashier, server, chef), Standalone KDS server (:3002), useSyncServerLanguage for standalone surfaces, SEC-01 LAN traffic not encrypted (+2 more)

### Community 124 - "Doc giornate, coperti, tavoli uniti"
Cohesion: 0.22
Nodes (11): Joined tables endpoints (merge/split), Reports summary and sales (UTC dates), Reservations endpoints, Service Days endpoints, coversForNewOrder (covers start from table), Booking sheet: assignment as exchange of places, Joined tables (tables.merged_into, v77), Service days business-day cycle (v74) (+3 more)

### Community 125 - "Doc chiusura e navigazione"
Cohesion: 0.20
Nodes (10): Floor plan endpoints (/api/table-layouts), Tables endpoints (/api/tables), Archivio (past service days, expandable orders), Giornata screen (current service day, not calendar day), ServiceDayChip in page header, Day close ritual, Saved floor plans (table_layouts, v78), Navigazione a cinque voci (Sala, Ordina, Giornata, Menu, Archivio) (+2 more)

### Community 133 - "Domini del servizio al tavolo"
Cohesion: 0.20
Nodes (10): Cover Charge, Dining Room as a Map (rooms, joined tables, saved layouts), Preconto (non-fiscal bill), Reservations (same service day, name + head count), Service Days, Restaurant Workflow Feedback Template, Business Timestamps Invariant, No Taxation Engine (Architecture Boundary) (+2 more)

### Community 137 - "Coperto e profili paese"
Cohesion: 0.22
Nodes (9): Business settings (timezone, currency, localeOptions), Coperto (cover charge, migrations v88-v90), orderCoverCharge() / computeCoverCharge, Country profiles (main/countries.ts, localeOptions), Receipt language (English/Italian), Tax-pack Ed25519 signature verification (upstream), orderCharges() single charge sum (main/money.ts), UI language decoupled from tenant regional settings (+1 more)

### Community 138 - "Screenshot POS (FloCafe)"
Cohesion: 0.22
Nodes (10): Cart Panel, Customer Phone Lookup with Name Auto-fill, FloCafe Upstream Branding, Order Type Selector (Dine in / Takeaway / Delivery), POS Order Entry Screen, Printer Selector, Product Grid with Category Filters, Server Status Bar (API :3001, heap, uptime) (+2 more)

### Community 149 - "Funzioni chiave dal README"
Cohesion: 0.31
Nodes (9): Express API and WebSocket Server (:3001), Fixed Menus (count-based), Standalone Kitchen Display Server (:3002), Kitchen Tickets by Round & Service Runs, mDNS Advertisement as buonapp.local, Tableside Server App for Handhelds (:3003), Thermal ESC/POS Printing (USB, TCP 9100, OS queues, WebUSB), Printed Output Languages (RECEIPT_LABELS, en/it only) (+1 more)

### Community 153 - "Social preview (FloCafe)"
Cohesion: 0.29
Nodes (8): Electron + Next.js stack, FloCafe (upstream POS), FloPOS (FreeOpenSourcePOS), Sidebar navigation (POS, Dashboard, Orders, Products, Tables, KDS, Customers), Dashboard UI mockup (sales, running orders, avg order value, recent orders, top products), GitHub Social Preview Card (FloCafe branding), Local-first / Local data stays yours, No subscriptions

### Community 154 - "KDS legacy renderer"
Cohesion: 0.29
Nodes (6): Legacy renderer KDS page (kds.html), connect(), renderOrders(), updateStatus(), KDS category filtering for chefs, KDS WebSocket /kds protocol

### Community 155 - "Doc invio comanda"
Cohesion: 0.29
Nodes (8): POST /api/printers/print-kot, AttachToMenuModal and ServiceRunPicker, FixedMenuPicker window, OrdinaView product list with stepper, Kitchen stations routing by category, Kitchen ticket rounds (only unsent rows), WebUSB printers print bills only, Derived append-target order

### Community 160 - "Doc menu a conteggio e ticket"
Cohesion: 0.29
Nodes (7): compactKotItems / compactBillRows / compactOrderRows, Menu a conteggio (counted fixed menu), planCourseFill matching, printableBillRows (cancelled rows excluded from preconto), pendingDishCount (counts dishes not rows), Kitchen ticket layout and dish folding, Service runs on kitchen tickets

### Community 161 - "Doc Drive e WhatsApp spento"
Cohesion: 0.29
Nodes (7): createBackup() shared backup artifact, Optional Google Drive backup (off by default), OAuth desktop loopback flow (127.0.0.1 random port), OAuth tokens encrypted with Electron safeStorage, WhatsApp switched off (WHATSAPP_AVAILABLE), SEC-05 WhatsApp session stored unencrypted, drive.file scope only

### Community 162 - "Doc sistema i18n"
Cohesion: 0.29
Nodes (7): npm run i18n:check validator, Centralized language registry (languages.ts), Lazy locale loader with eager English fallback (loader.ts), <Ltr> component for LTR isolation, RTL support (logical CSS, rtl-flip, HtmlLangSync), use-intl v4 runtime, Canonical en.json and strict 100% key parity

### Community 175 - "Logo frontend"
Cohesion: 0.50
Nodes (5): BuonApp Brand Identity, Chef Hat on Smartphone Mark, Orange and Teal Brand Palette, Order Taking on Phone (depicted), BuonApp Logo (logo.png)

### Community 186 - "Marchio BuonApp"
Cohesion: 0.67
Nodes (4): BuonApp restaurant POS, Chef hat over smartphone motif, Waiter taking order on pad (tableside ordering), BuonApp Brand Mark (logo)

### Community 187 - "Connessioni stampanti"
Cohesion: 0.50
Nodes (4): CUPS printing on Linux (lp group), Printer connection types (Network, USB/OS queue, WebUSB), Windows spooler RAW/winprint requirement, WPC1252 code page for accented characters

### Community 188 - "Pannello ordine condiviso"
Cohesion: 0.50
Nodes (4): useSendKot shared hook, OrderPanel split into header/lines/sheet/totals/action bar, Ordina composes and sends, never takes payment, Pannello ordine condiviso (OrderPanel)

### Community 191 - "Login e blocco tentativi"
Cohesion: 0.67
Nodes (3): POST /api/auth/login (JWT), Login lockout (5 attempts, 15 minutes), Username-based login (migration v96)

### Community 64 - "Indice documentazione"
Cohesion: 0.14
Nodes (22): Contributor Covenant 2.1, Private Vulnerability Reporting, Bug Report Issue Template, Issue Template Config (contact links), AGENTS.md (BuonApp agent guide), Code of Conduct, Local API Reference (docs/API.md), Coperto e menu fisso (+14 more)

### Community 141 - "README frontend: sala e cucina"
Cohesion: 0.20
Nodes (10): Joined tables and saved floor plans, Kitchen Display (KDS, :3002), Reservations page, Server App for tableside handhelds (:3003), Service days page, Static export served by Electron, Tables page (floor map), Reservation assignment swaps held table (+2 more)

### Community 170 - "README frontend: cassa e ordini"
Cohesion: 0.33
Nodes (6): Held orders shared across devices, Customer book and loyalty wallet (optional), Manager PIN override, Orders page, POS page, One bill per order, multiple payment methods

### Community 176 - "README frontend: architettura"
Cohesion: 0.40
Nodes (5): Customer display (guest-facing second screen), Local Express backend (:3001), Initial setup wizard, Zustand global state, BuonApp UI (Next.js 16 static export)

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
- **2150 isolated node(s):** `PosKey`, `ProductsKey`, `TabType`, `DayDetailModalProps`, `Props` (+2145 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2458 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
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
- **Why does `scripts` connect `Script npm del backend` to `Dipendenze e engine backend`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._