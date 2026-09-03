# Coperto e menu fisso

**Stato:** CURRENT. Decisioni prese con l'utente il 2026-08-30, il menu fisso il 2026-08-31.
**Fatto tutto**: il coperto con le migrazioni v88-v90, il menu fisso con la v91.

## Contesto

Due cose che mancano al servizio di sala, legate fra loro: il **coperto** non ha un prezzo, e il
**menu completo** — antipasto, primo, secondo, frutta o dolce, acqua, a volte il vino, coperto
incluso — non esiste come tale.

L'utente ha provato a costruire il menu completo sui **gruppi extra**, come avevamo ipotizzato, e ha
trovato il difetto vero: in cucina arriva "Menu completo" con le scelte appese sotto, invece di
Antipasti / Primi / Secondi. Non è un problema di formattazione della comanda. Una voce di gruppo
extra è un *modificatore di un piatto* e nel database non ha una categoria: solo nome e prezzo. La
comanda mette i piatti in sezioni usando la **categoria del prodotto**, quindi un pacchetto
commerciale non può essere spezzato in portate — non ha niente con cui esserlo.

Da qui la regola che guida tutto il resto:

> **Il menu fisso deve scrivere righe vere nell'ordine, una per piatto scelto.**

La comanda le raggruppa da sola come fa già oggi, il KDS le vede singolarmente, l'archivio dice cosa
è stato mangiato davvero. Il prezzo invece resta uno solo, sulla riga del pacchetto.

## Stato attuale

| Fatto | Dove |
| --- | --- |
| I coperti si contano ma non si prezzano: `guest_count` non entra in nessun totale | `main/routes/orders.ts` |
| ~~`service_charge` compare nel calcolo dei conti e nella stampa, ma la colonna non esiste: vale sempre zero — residuo del modulo fiscale rimosso~~ tolto da entrambi i punti | `main/routes/bills.ts`, `frontend/src/lib/printer/receipt-encoder.ts` |
| Il numero di coperti si sceglie alla presa dell'ordine e non si può più correggere | `frontend/src/components/pos/CartPanel.tsx` |
| La comanda raggruppa per categoria del prodotto | `main/printers/thermal.ts:1318` |
| Un extra ha nome e prezzo, nessuna categoria | `main/db.ts` (tabella `addons`) |
| Consegna e imballo sono già cariche sull'ordine che entrano nel totale | `orders.delivery_charge`, `orders.packaging_charge` |

## A. Il coperto

Segue la strada già battuta da consegna e imballo, che entrano nel totale e si stampano come voce
propria.

- Impostazione: **importo per coperto** (zero = nessun coperto, e la voce sparisce ovunque).
- Colonna `orders.cover_charge`, calcolata alla creazione dell'ordine e ricalcolata quando cambiano
  i coperti o le righe di menu fisso.
- Formula: `(coperti − coperti già inclusi in un menu) × importo`. I menu che includono il coperto
  lo dichiarano (vedi sotto), quindi chi prende il menu non lo paga due volte.
- Sul preconto: `Coperto 4 × 2,00 8,00`, accanto alle altre cariche.
- **Serve anche poter correggere i coperti a ordine aperto.** Oggi il numero si fissa alla presa
  dell'ordine: senza una via per cambiarlo, l'amico che arriva dopo lascia il conto sbagliato. Va
  nel pannello ordine, accanto alle altre correzioni da responsabile.

Va fatto **prima** del menu fisso: è indipendente, è mezza giornata, e il menu ne ha bisogno per
poter dire "coperto incluso".

**Fatto il 2026-08-30.** Come è venuto, con due scelte prese strada facendo:

- **L'asporto non paga il coperto**, qualunque sia il numero di persone: non è un tavolo apparecchiato.
- **Le sei somme del totale sono diventate una.** Consegna, imballo e coperto si sommano in
  `orderCharges()` (`main/money.ts`), chiamata da tutti i punti che ricostruiscono un totale. Erano
  sei formule scritte a mano, e il coperto sarebbe stata la settima occasione di dimenticarne una.
- `PATCH /orders/:id/guests` corregge i coperti a ordine aperto e riprezza; rifiutata su ordine
  chiuso o conto diviso, come le altre modifiche che spostano denaro.
- Sul conto la riga dice il conto della serva: `Coperto 4 x 2,00`.

**Corretto subito dopo (v89).** Cambiare i coperti riprezzava l'ordine e il totale del conto, ma
non la riga del coperto sul conto: la stampa divideva l'importo vecchio per le teste nuove e
annunciava un prezzo a coperto che nessuno aveva mai messo — `Coperto 5 x 1,60` sotto un totale che
contava correttamente cinque coperti a due euro. Ora il coperto viaggia col totale in
`recomputeOrderAfterItemChange()`, la migrazione raddrizza i conti ancora aperti che il difetto
aveva già scritto, e la stampa smette di scrivere il calcolo quando i conti non tornano — servirà
col menu fisso, dove il coperto non si divide più per il numero di commensali. Nel farlo il coperto
è arrivato anche sulla stampa dal browser, che non l'aveva mai avuto.

**Il coperto si divide a testa (v90).** Dividendo il conto veniva spartito col cibo, a peso: quattro
coperti da 2,00 diventavano 3,01 sulla quota di chi aveva preso la tagliata e 1,89 su chi aveva
preso la zuppa. Ma il coperto e' tanto a testa, e una quota e' una testa: ora si divide in parti
uguali, il centesimo dispari alle prime quote. Il totale di ogni quota si ricompone dalle sue righe
invece di essere spartito per conto suo, cosi' il conto in mano al cliente torna riga per riga. E
sulla quota di un conto diviso la stampa scrive `Coperto` e basta: il numero di teste del tavolo non
descrive quella quota.

**Trovato mentre lo facevo, non sistemato:** la stampa termica non ha mai stampato consegna e
imballo — solo l'encoder del browser lo fa. Su un conto con consegna, le righe non tornano col
totale. Qui non si vede perché delivery e asporto sono spenti, ma è un difetto vero e resta lì.

## B. Il menu fisso

### Che cos'è, nel database

**Un menu fisso è un prodotto**, con una spunta che lo dichiara tale. Così eredita gratis tutto
quello che già esiste per i prodotti: la riga d'ordine, il conto, l'archivio, i report. Attorno gli
si appendono le portate.

- `products.is_fixed_menu` — questo prodotto è un menu, non un piatto.
- `fixed_menu_courses` — le portate del menu: etichetta ("Primo"), obbligatoria o facoltativa,
  quante scelte, ordine di comparsa.
- `fixed_menu_course_categories` — da quali **categorie** pesca ogni portata. Categorie e non
  elenchi di piatti, così quando disattivi la crostata perché è finita la portata si aggiorna da
  sola: è esattamente il caso "frutta o dolce a seconda della disponibilità".
- `fixed_menu_course_surcharges` — il supplemento di un singolo piatto dentro una portata (il
  secondo di pesce che costa 3 € in più). Presente solo per i piatti che ce l'hanno.
- `products.fixed_menu_includes_cover` — se il coperto è compreso nel prezzo. Il disegno diceva
  `fixed_menus.includes_cover`, una tabella testata che il resto non aveva: appesa al prodotto come
  tutto il resto, non serve.
- `order_items.menu_group_id` — lega i piatti scelti alla riga del pacchetto che li ha generati.
  Due menu allo stesso tavolo sono due gruppi distinti, ognuno con le sue scelte.
- `order_items.menu_role` — `package` o `course`. Serve perché ogni riga sappia dire da sola cosa
  è, senza join a `products` e senza dipendere dal fatto che il prodotto sia ancora spuntato come
  menu: la stessa ragione per cui `product_name` è già una copia sulla riga.

### Cosa finisce nell'ordine

Scegliendo un menu completo si scrivono **una riga per il pacchetto** (con il prezzo) e **una riga
per ogni piatto scelto** (senza prezzo, o con il solo supplemento), tutte legate dallo stesso
`menu_group_id`.

### Le decisioni prese

- **Il vino della casa è una portata facoltativa** dentro un unico menu: si spunta al momento
  dell'ordine e il prezzo del menu non cambia.
- **I supplementi esistono, per singolo piatto.** Il supplemento sta sulla riga del piatto, così il
  conto si legge da solo: `Menu completo 25,00` e sotto `Tagliata +3,00`, e il totale torna.
- **Sul preconto i piatti compaiono sotto la voce del menu**, rientrati e senza importo (tranne i
  supplementi). Il cliente vede cosa gli è stato contato.

### Le regole di stampa

- **Comanda:** salta le righe di pacchetto — la cucina non cucina "Menu completo" — e stampa i
  piatti come qualunque altra riga, quindi già raggruppati in Antipasti / Primi / Secondi.
- **Preconto:** la riga del pacchetto porta il prezzo; le righe dei piatti si stampano rientrate e
  senza importo.
- **Attenzione:** una riga che vale zero oggi stampa **Offerto** (deciso il 2026-08-29). I piatti di
  un menu valgono zero per costruzione e non sono regali: la regola dell'*Offerto* va esclusa per le
  righe che appartengono a un gruppo di menu.

### Fuori dal menu

Chi non prende il menu completo paga tutto singolarmente: è il comportamento di sempre e non cambia
niente. Il menu fisso è un prodotto in più nel catalogo, non un modo diverso di ordinare.

### Le decisioni prese il 2026-08-31, e come è venuto

Il piano lasciava aperti quattro punti che il documento non aveva visto. Decisi con l'utente prima
di scrivere una riga:

- **Un menu è un gruppo, di quantità uno.** Sei menu uguali sono sei righe da 25,00, ognuna coi suoi
  piatti sotto. Non è una scelta estetica: è l'unica forma in cui il blocco unico della divisione
  regge, perché un blocco da sei non si può spartire fra sei quote. Il costo — battere sei volte —
  lo paga il pulsante **"Un altro uguale"**, che riapre la finestra con le scelte dell'ultimo menu.
  Nel carrello un menu non si fonde mai con un altro (`cart-identity.ts`) e non ha il selettore di
  quantità.
- **Il conto diviso muove il menu intero.** Nella finestra di divisione un menu è una riga sola —
  pacchetto col prezzo, piatti elencati sotto — e si assegna a un commensale con un tocco. Il
  backend rifiuta comunque un'allocazione che spezza un gruppo: nascondere la cosa nella griglia
  non è un controllo. Senza questa regola, il pacchetto a una quota e i piatti all'altra danno una
  quota che paga 25,00 senza aver mangiato e una che mangia gratis, **con entrambe le quote che
  tornano** — nessuno se ne accorgerebbe mai.
- **Il coperto incluso vale un coperto per menu, mai più dei commensali.** Tre menu a un tavolo di
  due non fanno coperto negativo: `computeCoverCharge` taglia a zero. Il ricalcolo sta in
  `orderCoverCharge()` (`routes/orders.ts`), chiamata da tutti i punti che cambiano le righe:
  creazione, aggiunta, ricalcolo, annullo, ripristino. Le quattro formule scritte a mano che
  c'erano prima erano quattro occasioni di riprezzarne una e non le altre — che è esattamente il
  difetto che la v89 ha dovuto riparare.
- **Il menu si annulla intero**, da qualunque riga si parta, con una conferma che lo dice. Mezzo
  menu — il pacchetto senza piatti, o i piatti senza niente di prezzato — non è una cosa che
  qualcuno abbia ordinato.

Trovato e sistemato strada facendo:

- **Il KDS vedeva il pacchetto.** Il documento dettava la regola solo per la comanda, ma il KDS
  legge le stesse righe: "Menu completo" sarebbe comparso in cucina come piatto da cuocere. Escluso
  con `NOT_A_MENU_PACKAGE` (`services/kds.ts`), condiviso con le rotte.
- **Il filtro della comanda va in `routeItemsToStations`, non nella selezione delle righe.** La riga
  pacchetto deve restare in `getPendingKotItems` per ricevere il timbro `kot_batch`: escluderla
  prima la lascerebbe pendente per sempre, e ogni invio successivo se la ritroverebbe davanti.
  Quando una stazione fallisce, il pacchetto torna in coda insieme ai suoi piatti
  (`withMenuPackages`), altrimenti resterebbe timbrato su una comanda mai uscita.
- **Il ciclo che scrive le righe era copiato due volte** (creazione ordine e aggiunta righe).
  Unificato in `insertOrderItemRows()` prima di toccarlo, altrimenti l'espansione del menu sarebbe
  stata la prossima cosa da tenere allineata a mano. Stessa cosa lato interfaccia: i quattro mapper
  che costruivano il payload delle righe in Ordina sono diventati `cartItemToPayload()`, e un menu
  che avesse raggiunto tre di loro avrebbe perso le scelte sul quarto.
- **L'indice su `order_items(menu_group_id)` non può stare in `createSchema()`.** Quella funzione
  gira anche su un'installazione che non è ancora arrivata alla v91, dove la colonna non esiste:
  `test:upgrade-path` l'ha preso al primo giro. Sta solo nella migrazione, come
  `idx_order_items_kot_batch`.
- **La finestra di scelta non importa il client API.** Prende catalogo e menu come props e
  restituisce la selezione con una callback, sul modello di `AddonModal`. È quello che la rende
  montabile nel Server App dei palmari quando arriverà il suo rifacimento — che è dove all'utente
  il menu fisso serve davvero.

**Non fatto, per scelta:** il menu fisso non è stato montato nel Server App. Il palmare non sa fare
nemmeno gli aggiuntivi e va rifatto per intero; la finestra è pronta per allora. E cambiare una
scelta a menu già battuto non esiste: si annulla il gruppo e si rifà.

## Ordine dei lavori

Tutti e quattro i passi sono fatti.

1. ~~**Coperto**~~ — impostazione, colonna, totale, voce sul preconto, correzione dei coperti a
   ordine aperto. Migrazioni v88-v90.
2. ~~**Struttura del menu fisso**~~ — migrazione v91, `services/fixed-menu.ts`,
   `routes/fixed-menus.ts`, scheda "Menu fissi" dentro Menu.
3. ~~**La scelta in Ordina**~~ — `components/pos/FixedMenuPicker.tsx` e l'espansione lato backend.
4. ~~**Stampa**~~ — comanda e KDS che saltano i pacchetti, preconto che rientra i piatti,
   esclusione dalla regola dell'*Offerto*. In più: divisione del conto e annullamenti.

## Verifica

| Passo | Controlli minimi |
| --- | --- |
| 1 | `npm run lint`, `npm run build`, `npm run build:frontend`, `npm run i18n:check`, `test:schema-health`, `test:upgrade-path`, `test:integration-happy`, `test:receipt-printing` |
| 2-3 | suite focalizzata nuova sul menu fisso (composizione, supplementi, portate facoltative), `test:order-item-addons`, `test:issue-244-product-addon-links` |
| 4 | `npm run test:printer`, `test:kot-batch`, `test:receipt-printing`, più una prova a mano con la stampante vera: due menu completi allo stesso tavolo devono uscire in cucina come piatti in sezioni, e sul conto come due pacchetti con i piatti sotto |

`npm test` al termine, e un giro a mano in sala prima di usarlo di sera.

La suite del menu fisso è `npm run test:fixed-menu` (52 controlli), ed è dentro la catena di
`npm test`. Copre composizione, supplementi, portata facoltativa, prezzo forgiato dal client,
tre menu = tre gruppi, coperto incluso che non va sotto zero, riprezzamento su aggiunta e annullo,
annullo di gruppo, divisione rifiutata e accettata, comanda senza pacchetto, preconto rientrato.

**Resta da fare a mano, con la stampante vera:** due menu completi allo stesso tavolo devono uscire
in cucina come piatti in sezioni e sul conto come due pacchetti coi piatti sotto; e quel conto
diviso in due deve dare a ogni quota il suo menu intero.
