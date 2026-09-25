# Coperto e menu fisso

**Stato:** CURRENT. Decisioni prese con l'utente il 2026-08-30, il menu fisso il 2026-08-31, il
menu aperto e le uscite il 2026-09-05, corretto dopo la prima sera in sala lo stesso giorno.
**Fatto tutto**: il coperto con le migrazioni v88-v90, il menu fisso con la v92 (nata come v91,
ha preso il numero dopo perché nel frattempo la v91 è servita a togliere la divisione del conto),
le eccezioni per piatto con la v93, le uscite con la v94, il menu aperto con la v95. Il menu **a
conteggio** (2026-09-21, branch `menu-fisso-rivisto`, senza migrazioni) sostituisce il menu a
persona: vedi la sezione in fondo.

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
  chiuso, come le altre modifiche che spostano denaro.
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
preso la zuppa. Il coperto invece è tanto a testa, e una quota era una testa. La v91 ha poi tolto
la divisione del conto del tutto (vedi [order-flow-and-navigation.md](order-flow-and-navigation.md)),
quindi di quel lavoro resta solo la parte che vale ancora: il totale di un conto si ricompone dalle
sue righe invece di essere calcolato per conto suo, così la carta in mano al cliente torna riga per
riga.

**I coperti partono dal tavolo (2026-09-17).** Un ordine nuovo partiva da un coperto su qualunque
tavolo, e la sala correggeva il contatore a ogni ordine: un giro mandato prima di farlo contava — e
faceva pagare — un coperto solo a un tavolo da quattro. Adesso il contatore parte dalle **persone della
prenotazione** se il tavolo è prenotato, altrimenti dai **posti del tavolo**, sommati a quelli dei
tavoli uniti a lui. Vale dalla mappa («Prendi ordine» passa `/pos?table=<id>&covers=<n>`), dal
selettore dei tavoli in Ordina e dal palmare; la regola sta in un posto solo,
`coversForNewOrder` (`frontend/src/lib/table-covers.ts`), sempre dentro 1–99 come vuole
`POST /orders`.

- **Il numero toccato a mano resta.** Finché nessuno tocca il contatore i coperti seguono il
  tavolo, anche cambiandolo; dopo, il tavolo non li sovrascrive più: il gruppo è lo stesso a
  qualunque tavolo si sieda. Lo ricorda `guestCountChosen` nel carrello, e lo accende solo il
  contatore (`chooseGuestCount`). I coperti letti da un ordine già aperto (`setGuestCount`) non
  contano come scelta: sono del tavolo di quell'ordine, e se si passa a un tavolo libero valgono
  quelli del nuovo.
- **Un ordine già aperto tiene i suoi**, e una comanda in sospeso torna coi coperti con cui era
  stata messa da parte.
- **Aggiungendo piatti a un ordine già aperto, Ordina non mostra più il contatore.** L'aggiunta
  manda solo i piatti nuovi (`POST /orders/:id/items`), quindi il contatore cambiava lo schermo e
  non il conto: l'amico arrivato dopo, contato lì, sul preconto non c'era. Come sul palmare, i
  coperti dell'ordine si leggono sotto il nome del tavolo («4 coperti · Ordine aperto») e si
  correggono dal pannello del tavolo, «Altro» → «Cambia i coperti».
- **«Prendi ordine» parte da un carrello pulito**, anche vuoto: prima un carrello senza piatti
  restava com'era, e i coperti contati per un altro tavolo avrebbero vinto su quelli di questo.
  Lo stesso sul palmare, per un carrello agganciato a un altro tavolo.

Coperto da `npm run test:table-covers`.

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

- ~~**Un menu è un gruppo, di quantità uno.** Sei menu uguali sono sei righe da 25,00, ognuna coi
  suoi piatti sotto. Non è una scelta estetica: è l'unica forma in cui il blocco unico della
  divisione regge, perché un blocco da sei non si può spartire fra sei quote. Il costo — battere sei
  volte — lo paga il pulsante **"Un altro uguale"**, che riapre la finestra con le scelte
  dell'ultimo menu.~~ Superato il 2026-09-21: la divisione del conto non c'è più dalla v91, e in sala
  il menu si segna contando i piatti, non commensale per commensale. Vedi il menu a conteggio qui
  sotto. Resta vero che nel carrello una riga di menu non si fonde mai con un'altra
  (`cart-identity.ts`).
- **Il coperto incluso vale un coperto per menu, mai più dei commensali.** Tre menu a un tavolo di
  due non fanno coperto negativo: `computeCoverCharge` taglia a zero. Il ricalcolo sta in
  `orderCoverCharge()` (`routes/orders.ts`), chiamata da tutti i punti che cambiano le righe:
  creazione, aggiunta, ricalcolo, annullo, ripristino. Le quattro formule scritte a mano che
  c'erano prima erano quattro occasioni di riprezzarne una e non le altre — che è esattamente il
  difetto che la v89 ha dovuto riparare.
- **Il menu si annulla intero**, da qualunque riga si parta, con una conferma che lo dice. Mezzo
  menu — il pacchetto senza piatti, o i piatti senza niente di prezzato — non è una cosa che
  qualcuno abbia ordinato. ~~Da qualunque riga si parta~~: dalla riga del pacchetto. Vedi la
  sezione del 2026-09-05 qui sotto.

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
  gira anche su un'installazione che non è ancora arrivata alla v92, dove la colonna non esiste:
  `test:upgrade-path` l'ha preso al primo giro. Sta solo nella migrazione, come
  `idx_order_items_kot_batch`.
- **La finestra di scelta non importa il client API.** Prende catalogo e menu come props e
  restituisce la selezione con una callback, sul modello di `AddonModal`. È quello che la rende
  montabile nel Server App dei palmari quando arriverà il suo rifacimento — che è dove all'utente
  il menu fisso serve davvero.

~~**Non fatto, per scelta:** il menu fisso non è stato montato nel Server App. Il palmare non sa fare
nemmeno gli aggiuntivi e va rifatto per intero; la finestra è pronta per allora.~~ Fatto il
2026-09-15: il palmare è stato rifatto e monta la finestra così com'era, vedi
[palmare.md](palmare.md). ~~E cambiare una scelta a menu già battuto non esiste: si annulla il
gruppo e si rifà.~~ Adesso esiste: vedi qui sotto.

## Il menu aperto e le uscite (2026-09-05)

Il menu fisso funzionava ma era un blocco chiuso: si compilava tutto dentro una finestra prima di
aggiungerlo al carrello, e una volta battuto non si toccava più. In sala succede il contrario —
si prende l'antipasto, si manda, e il secondo si decide mezz'ora dopo.

**Scartata**: l'ipotesi di dichiarare solo *quanti* menu prende il tavolo e calcolare
l'attribuzione al conto. Se due prendono la tagliatella dentro il menu e un terzo la ordina a
parte, nessuna euristica sa quale pescare, e quando sbaglia **cambia la cifra che paga il
cliente**. La parte buona dell'idea — ordinare dalla griglia invece che dentro una finestra — si
tiene, ma con l'aggancio deciso dal cameriere con un tocco mentre ordina, non indovinato alla
fine.

### Il menu è un contenitore che si riempie (v95)

- **Una portata obbligatoria può restare vuota.** Il rifiuto in `buildMenuRows` è tolto:
  `is_required` non blocca più l'ordine, dice cosa manca. Il prezzo sta sul pacchetto, quindi un
  menu incompleto costa già la cifra giusta.
- **`order_items.menu_course_id`** dice quale portata soddisfa una riga. Prima si deduceva dalla
  categoria, e smette di essere una risposta appena una portata prende un piatto da fuori le sue
  categorie (v93) o due portate ne condividono una — "frutta o dolce" accanto a "dolce" è un menu
  vero. La migrazione riempie all'indietro solo dove una sola portata combacia; l'ambiguo resta
  NULL, che vuol dire quello che `menu_role='course'` ha sempre voluto dire da solo.
- **`PUT /orders/:id/menu-groups/:groupId/courses/:courseId`** con `{ product_ids }`: la lista è
  quello che la portata contiene *dopo*, non cosa farne. Un endpoint solo per aggiungere,
  scambiare e svuotare, perché tre sarebbero stati tre posti dove sbagliare la politica degli
  storni. Rigiocare la stessa lista non fa niente, quindi un ritentativo non raddoppia un piatto.
  Le righe nuove nascono con `kot_batch` NULL e vanno nel giro successivo da sole.
- **Un piatto che la cucina ha già preso in mano non si scavalca da qui**: 409
  `course_in_progress` e non si scrive niente. Toglierlo dal conto resta affare dell'annullo, con
  il PIN e lo storno che ha già.
- **L'annullo si sdoppia.** La riga del pacchetto è il menu: toglierla toglie tutto. Una riga
  piatto è solo sé stessa, così chi cambia idea sul secondo non perde l'antipasto che ha già
  mangiato. `cancelTargetIds` decide, e vale anche per il ripristino.
- **Agganciare dalla griglia**: battuto un piatto che entra in una portata ancora libera di un
  menu aperto, il POS chiede "compreso nel menu?" con un tocco e *A parte* sempre disponibile.
  Se non ci sono portate libere la finestra non si apre, quindi una casa senza menu fissi non
  vede alcuna differenza.

### Le eccezioni per piatto (v93)

Una portata pescava categorie intere. `fixed_menu_course_products(course_id, product_id, mode)`
aggiunge le eccezioni nei due versi: l'aragosta che sta nei Secondi e nel menu non c'è, il
branzino che sta fuori dai Secondi e nel menu c'è. L'esplicito batte la categoria, e
`courseAllowsDish` è l'unico posto che risponde — con `courseAllowsProduct` che gli fa da specchio
sul till, così la cassa offre esattamente quello che il conto accetta.

Tabella a parte e non una colonna sui sovrapprezzi: SQLite non sa aggiungere una colonna con
`CHECK`, l'editor pota i sovrapprezzi quando una categoria esce dalla portata e cancellerebbe
l'inclusione a ogni salvataggio, e un piatto può essere insieme incluso e più caro.

### Le uscite (v94)

Quando un piatto esce dalla cucina, che non è la stessa cosa di quando è stato mandato.
`order_items.service_run` 1..9, con il valore preso da `categories.default_service_run`: antipasti
1, primi 2, secondi 3, così su un tavolo ordinario nessuno tocca niente. Il cameriere sposta la
singola riga con un tocco, prima e dopo l'invio.

- **Il nome.** `course`/`portata` era già del menu fisso e `round` del giro comanda: in codice
  `service_run`, sulla carta `1ª USCITA`.
- **Un piatto dentro un menu prende l'uscita dalla sua categoria**, non dalla portata del menu:
  un primo dentro un menu è un primo ed esce coi primi. È la stessa ragione per cui il menu
  scrive righe vere. E lì si ferma: dentro un menu l'uscita non si sposta più a mano (vedi il menu
  a conteggio), perché l'ordine delle uscite è il menu stesso.
- **La comanda si sezione per uscita, e dentro l'uscita per categoria.** L'uscita dice *quando* e
  va sopra; la categoria dice *cosa* e resta sotto. Con tutto in uscita 1 il codice prende lo
  stesso ramo di prima e la comanda esce identica — asserito byte per byte in `test:printer`.
- **Le uscite sono etichette, non cancelli.** Si preme Invia e parte tutto il pendente, come
  sempre. Nessun "manda solo la prima uscita": sarebbe un secondo stato da tenere allineato con
  `kot_batch`, e un'uscita dimenticata in coda.
- **Il KDS la vede** (una stringa in `projectKdsItem`), il conto no: l'ordine di servizio è
  coreografia di cucina.

### Due difetti trovati e sistemati, perché stavano in mezzo

- **Lo storno fantasma in coda comande.** `getPendingKotItems` non escludeva `void_adjustment`:
  il tavolo mostrava un giro da mandare e la comanda dopo stampava `1 VOID: TAGLIATA`. Era già un
  difetto; con l'annullo della singola scelta sarebbe stato quotidiano. I tre conteggi lato
  interfaccia erano per giunta divergenti fra loro — mappa, pannello e scheda tavolo escludevano
  cose diverse — e ora passano tutti da `isPendingKot` (`lib/kot.ts`).
- **L'ordine delle righe sul conto.** `getOrderWithItems` non aveva `ORDER BY` e l'altra query
  ordinava per `id`: un dolce scelto mezz'ora dopo ha un id più alto e sarebbe stampato in fondo
  al conto, rientrato e senza importo, sotto un piatto che non c'entra. Adesso ogni gruppo resta
  attaccato al suo pacchetto, sul conto e nel pannello (`menuAwareRowOrder`).

### Corretto alla prima sera in sala

Cinque cose trovate usandolo, di cui la prima mandava le comande sul tavolo
sbagliato.

- **Il tavolo cambiato non sganciava l'ordine.** Entrando da un tavolo con
  "aggiungi articoli" il carrello punta a quell'ordine; cambiando tavolo in
  Ordina si spostava solo l'etichetta, e lo schermo diceva tavolo 10 mentre
  tutto quello che si mandava finiva sul conto del tavolo 2. Adesso l'ordine
  di destinazione e' un valore **derivato**: vale finche' il carrello punta al
  suo tavolo. Derivato e non tenuto in pari a mano perche' il selettore, il
  ripristino di un ordine sospeso e il parametro `?append=` impostano tutti e
  tre il tavolo, e uno dei tre si sarebbe dimenticato.
- **La nota del menu non la leggeva nessuno.** Era una sola per tutto il menu
  e finiva sulla riga del pacchetto, che ogni comanda filtra via. Adesso la
  nota sta **sul singolo piatto scelto**, dentro la finestra del menu, e
  arriva in cucina come quella di qualunque altra riga.
- **L'uscita idem.** Nel carrello la targhetta stava sulla riga del menu, che
  non e' un piatto e in cucina non ci va: adesso ogni piatto scelto ha la sua
  accanto alla nota, e sulla riga di un menu la targhetta non compare piu'.
- **La targhetta diceva sempre "1ª".** Il carrello non conosceva l'uscita
  predefinita della categoria, quindi mostrava la prima su un secondo che
  sarebbe uscito in terza: il backend faceva la cosa giusta e lo schermo
  raccontava un'altra. `serviceRunForProduct` fa lato interfaccia lo stesso
  conto che fa `resolveServiceRun` lato server. Nessun rischio di
  sovrascrittura: se la sala sceglie vince la scelta, se non tocca niente
  vince la categoria.
- **Il menu si riapriva con le scelte di quello prima.** Era voluto ed era
  sbagliato: il secondo commensale raramente ordina lo stesso, e i piatti gia'
  spuntati si mandavano senza accorgersene. Ripetere un menu ha gia' il suo
  pulsante, e quello prende le scelte dalla finestra che si ha davanti.

### Obbligatoria diventa prevista

`is_required` non poteva piu' significare obbligatoria da quando un menu si
puo' battere mezzo deciso. Non e' stato tolto perche' la distinzione serve
ancora - il vino della casa e' facoltativo, il dolce e' compreso - ma dice
un'altra cosa: **quali portate il menu prevede**, cioe' cosa segnalare se il
conto si chiude senza. Nell'editor la spunta si chiama "Prevista" e lo dice
nel suggerimento; nella finestra dell'ordine la portata mancante e' una riga
ambra e mai un rifiuto.

### Cosa resta fuori, per scelta

- **Agganciare a un menu una riga già battuta a parte.** La riga può avere un `kot_batch`, uno
  stato `preparing`, aggiuntivi, uno sconto e il magazzino già scalato: riprezzarla sul posto
  muterebbe una riga che il preconto stampato può già mostrare, senza nessuno storno che registri
  che il cliente era stato caricato. La via pulita — annulla e rifai — rimanda il piatto in
  cucina. Se servirà, la mezza misura onesta è un `absorb_item_id` sul `PUT`, accettato solo se la
  riga è `pending`, senza `kot_batch`, senza aggiuntivi e senza sconto.
- **Due camerieri sullo stesso menu.** Il `PUT` è ultimo-che-scrive-vince. Se morde, un
  `expected_item_ids` che risponde 409.
- **`is_required` smette in silenzio di significare "obbligatorio".** Chi lo usava come rete
  contro le battiture sbagliate la perde: va nelle note di rilascio.
- ~~**Il Server App**, ancora.~~ `AttachToMenuModal` e `ServiceRunPicker` sono nati con lo stesso
  contratto della finestra del menu — props dentro, callback fuori, nessun client API — e il
  2026-09-15 il palmare rifatto li ha montati così come sono: vedi [palmare.md](palmare.md).

## Il menu a conteggio (2026-09-21)

**Il problema, visto in sala.** Il menu valeva una persona. Per un tavolo da otto il cameriere
apriva la finestra otto volte e chiedeva a ogni commensale tutto il suo menu, dall'antipasto al
dolce. Si può fare, ma non è come si lavora: al tavolo si chiede *quanti prendono il menu*, e poi
si segnano i piatti contandoli, portata per portata — tre lasagne, due carbonara, un risotto —
senza sapere chi mangia cosa. Allo stesso tavolo capita spesso che alcuni prendano il menu e altri
mangino alla carta.

**Il modello.** Una riga di menu dà da mangiare a N persone:

- **un gruppo solo**, con la riga del menu a quantità N che costa N volte il prezzo
  (`expandFixedMenuItems`);
- **i piatti restano una riga per porzione**, come prima. Stato in cucina, uscita, nota e annullo col
  PIN continuano a lavorare piatto per piatto, e il riempimento abbina ancora uno a uno. «Lasagne 3»
  è solo come si mostrano: la comanda le fondeva già (`compactKotItems`, dalla bba2981), il
  preconto le fonde ora (`compactBillRows`, e `printableBillRows` nel browser), e le schermate
  del tavolo pure (`compactOrderRows`). Dal 2026-09-24 le stesse funzioni sommano anche i piatti
  alla carta aggiunti in più volte (vedi [order-flow-and-navigation.md](order-flow-and-navigation.md));
- **una portata tiene al massimo `max_choices × N` piatti.** Mancare non ferma niente, il secondo si
  decide dopo; troppi sì, perché il nono primo su otto menu si ordina alla carta. «Prevista» vuol
  dire: segnala finché i piatti sono meno di N;
- **il coperto incluso vale N coperti**: `coveredGuestCount` sommava già la quantità;
- **nessuna migrazione.** Un gruppo scritto col modo di prima è un menu da uno, e continua a
  funzionare così com'è.

La scelta, discussa prima di scrivere: righe da una porzione e conteggio nella vista, invece di
righe con la quantità. Le righe con la quantità avrebbero chiesto di spezzare una riga in due ogni
volta che una lasagna su tre cambia uscita o prende una nota, e un riempimento che riduce una riga
già mandata. Con una riga per porzione tutto questo esisteva già.

**La finestra** (`FixedMenuPicker`):

- in testa **«Quanti menu?»**, un solo `−` numero `+` col numero anche battibile a tastiera (sul
  telefono si apre il tastierino). **Non parte da nessun numero**, e senza non si aggiunge: con i
  tavoli misti, partire dai coperti farebbe pagare menu non presi a chi si dimentica di abbassarlo.
  Sotto, per informazione, i coperti del tavolo. La fila di numeri da 1 ai coperti che c'era prima,
  con un `+` in fondo, al tavolo da uno si riduceva a un «1» fermo a sinistra e a un più: leggeva
  come uno stepper a cui manca il meno;
- **ogni numero su questa schermata conta piatti.** La portata dice «3 di 8» — tre degli otto piatti
  che quei menu si aspettano — in ambra finché ne mancano, in rosso se sono troppi, e la sua
  intestazione resta appiccicata in cima mentre i piatti scorrono. Un piatto dice quante porzioni,
  **quelle con la nota comprese**: la nota non fa un secondo piatto, segna una delle porzioni già
  contate;
- i piatti sono righe con `−` conteggio `+`, e un tocco sul nome vale uno in più, come la tacca sul
  foglio; quelli contati si tingono per tutta la riga, così da fuori si legge cosa è stato preso;
- **«Nota per una porzione»** prende una lasagna dal conteggio semplice e le dà una riga sua con la
  nota («senza besciamella»); la ✕ toglie la nota e la riporta nel conteggio, senza cambiare il
  totale del piatto;
- **l'uscita non si chiede dentro il menu**: un menu è già un ordine di uscite — antipasto, primo,
  secondo — e ogni piatto prende l'uscita della sua categoria. Chiederla porzione per porzione
  voleva dire un selettore sotto ogni piatto scelto, per una cosa che al locale non si fa;
- via **«Un altro uguale»**: il conteggio lo rende inutile;
- toccare di nuovo un menu che è già nel carrello riapre quella riga, invece di aprirne una seconda.

**Sul conto già inviato**, al PC e sul palmare:

- la riga del menu dice «8×», e le porzioni uguali di un piatto sono una riga «3× Lasagne». Ogni
  riga dice quante, **«1×» compreso**: una porzione sola mostrava un pallino al posto del numero, e
  una lista in cui certe righe contano e altre no si legge due volte. Le azioni su quella riga
  valgono per **una** porzione, e la scheda lo dice («una di 3»);
- **l'uscita di una riga di menu non si sposta**, né al PC né sul palmare, per la stessa ragione per
  cui la finestra non la chiede;
- i pulsanti delle portate con posto dicono quanto sono pieni («Secondo 0/8»), e aprono la finestra
  ristretta a quella portata, con i conteggi. Salvando si manda la nota di ogni porzione che c'era
  già — prima la finestra partiva dai soli piatti, e le perdeva — ma non l'uscita: una richiesta che
  non dice l'uscita si abbina a una riga qualunque, così le righe restano dove sono anche se
  qualcuno le aveva spostate, e una porzione davvero nuova prende l'uscita della sua categoria;
- **`PATCH /orders/:id/menu-groups/:groupId` `{ quantity }`** cambia quanti menu: l'amico che arriva
  dopo, o chi alla fine ordina alla carta. Sotto il numero di piatti già in una portata risponde 409
  `menu_course_overflow`, e dice quale portata: il piatto in più lo toglie la sala. Stessi ruoli e
  controlli del riempimento, ed è nell'allowlist del palmare. Al PC sta nella scheda della riga del
  menu, sul palmare sulla testata del menu. Togliere la riga del menu toglie tutti gli N menu, e la
  conferma dice quanti.
- **Lo sconto segue il numero.** Uno sconto concordato sulla riga vale per la riga com'era: cinque
  menu su otto se ne portano via cinque ottavi. Tenerlo intero avrebbe lasciato lo sconto di otto
  menu sull'unico rimasto — e il numero di menu lo cambia anche la sala, mentre concordare uno
  sconto vuole il responsabile col PIN. Lo sconto in euro sull'ordine, che non si riproporziona, si
  ferma a quello che resta sul conto, altrimenti la carta stampa «Sconto −50,00» sotto un imponibile
  di 30,00.

**Il riempimento abbina meglio.** Due difetti venuti fuori strada facendo, tutti e due sistemati in
`planCourseFill`:

- un id nudo, quello che la griglia manda per i piatti già presenti quando ne aggiunge uno, valeva
  «senza nota»: la zuppa «senza sale» veniva annullata e riscritta senza nota, e ripartiva per la
  cucina. Ora un id nudo tiene nota e uscita della riga;
- le richieste più precise si abbinano per prime (nota e uscita, poi solo la nota, poi gli id nudi),
  e le righe già in cucina prima di quelle in attesa. Togliere una lasagna su tre libera una di
  quelle in attesa, invece di fermarsi con 409 su quella nel forno.

**Trovato e sistemato perché stava in mezzo: il preconto stampava le righe annullate.** Una lasagna
tolta prima di andare in cucina usciva a 10,00 sopra un totale che non la contava. Col conteggio,
togliere un piatto da una portata diventa una correzione di tutte le sere. Ora le righe annullate
restano fuori dalla carta; quelle stornate col PIN restano, accanto alla riga negativa che le
compensa. Il preconto esce da tre parti — la stampante termica, l'encoder ESC/POS del browser e la
pagina HTML per la stampante di sistema, che è quella che si usa quando la cassa non ha stampanti —
e la regola delle righe da stampare sta in un posto per parte: `printableBillRows` in
`main/printers/thermal.ts` e `frontend/src/lib/printer/bill-rows.ts`, condiviso dalle due strade del
browser.

**Resta com'era:**

- la domanda **«compreso nel menu?»** battendo dalla griglia, con il posto contato su tutti i menu
  della riga. Una riga da otto si chiama «Menu completo ×8»;
- **chi arriva dopo**: da Ordina si apre un secondo gruppo dello stesso menu, oppure si alza «Quanti
  menu» sul tavolo. Tutte e due le strade funzionano;
- **il KDS** mostra ancora una riga per porzione: il locale usa le comande stampate.

## Ordine dei lavori

Tutti e quattro i passi sono fatti.

1. ~~**Coperto**~~ — impostazione, colonna, totale, voce sul preconto, correzione dei coperti a
   ordine aperto. Migrazioni v88-v90.
2. ~~**Struttura del menu fisso**~~ — migrazione v92, `services/fixed-menu.ts`,
   `routes/fixed-menus.ts`, scheda "Menu fissi" dentro Menu.
3. ~~**La scelta in Ordina**~~ — `components/pos/FixedMenuPicker.tsx` e l'espansione lato backend.
4. ~~**Stampa**~~ — comanda e KDS che saltano i pacchetti, preconto che rientra i piatti,
   esclusione dalla regola dell'*Offerto*. In più: gli annullamenti.

## Verifica

| Passo | Controlli minimi |
| --- | --- |
| 1 | `npm run lint`, `npm run build`, `npm run build:frontend`, `npm run i18n:check`, `test:schema-health`, `test:upgrade-path`, `test:integration-happy`, `test:receipt-printing` |
| 2-3 | suite focalizzata nuova sul menu fisso (composizione, supplementi, portate facoltative), `test:order-item-addons`, `test:issue-244-product-addon-links` |
| 4 | `npm run test:printer`, `test:kot-batch`, `test:receipt-printing`, più una prova a mano con la stampante vera: due menu completi allo stesso tavolo devono uscire in cucina come piatti in sezioni, e sul conto come due pacchetti con i piatti sotto |

`npm test` al termine, e un giro a mano in sala prima di usarlo di sera.

La suite del menu fisso è `npm run test:fixed-menu` (152 controlli), ed è dentro la catena di
`npm test`. Copre composizione, supplementi, portata facoltativa, prezzo forgiato dal client,
tre menu = una riga da tre coi piatti contati e il tetto per portata, coperto incluso che non va
sotto zero, riprezzamento su aggiunta e annullo, annullo di gruppo, comanda senza pacchetto,
preconto rientrato, riempimento di una riga da N, quanti menu (su, giù, rifiuti), e il riempimento
che tiene note e uscite. La parte interfaccia (conteggi, tetti, totali del carrello, righe
compattate) è `npm run test:fixed-menu-tally`; il preconto compattato e senza righe annullate sta
in `npm run test:printer`.

**Resta da fare a mano, con la stampante vera:** due menu completi allo stesso tavolo devono uscire
in cucina come piatti in sezioni e sul conto come due pacchetti coi piatti sotto.
