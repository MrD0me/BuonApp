# Flusso ordini e navigazione

**Stato:** CURRENT. Decisioni approvate il 2026-08-28, tutti e sette i passi implementati il
2026-08-29 sul branch `riorganizzazione-interfaccia`. Restano fuori le cose elencate in
[Fuori ambito](#fuori-ambito), che non sono state fatte per scelta.

Questo documento fissa la riorganizzazione dell'interfaccia decisa con l'utente, da fare **prima**
del rifacimento grafico vero e proprio. Il problema dichiarato è che l'interfaccia è confusionaria;
l'analisi del codice dice che la causa è l'architettura dell'informazione — dove stanno le cose —
non l'estetica. Ridipingere sopra una struttura confusa non toglie la confusione, e costringerebbe a
ridipingere due volte.

## Problema

1. **Lo stesso ordine si gestisce da tre posti diversi.** Il POS lo crea, la scheda Ordini lo
   modifica e lo incassa, la mappa dei tavoli lo mostra e basta.
2. **Esistono due schede tavolo diverse.** `components/tables/TableDetailModal.tsx` (dalla mappa) è
   in sola lettura; `components/pos/TableCheckoutModal.tsx` è operativa ma si apre **solo dal POS**.
3. **La scheda tavolo segnala un problema che non permette di risolvere:** mostra il badge arancione
   sulle righe non ancora mandate in cucina e non ha il pulsante per mandarle. `sendKot` esiste solo
   in `/pos` e in `TableCheckoutModal`.
4. **La lista ordini non ha nozione di giornata:** carica `per_page: 50` senza filtro, quindi mostra
   gli ultimi 50 ordini di qualunque serata mescolati.
5. **La sidebar ha undici voci** che mescolano lavoro e configurazione. La voce "KDS" porta a una
   scheda delle impostazioni, non al KDS; lo schermo cucina (`/kds`) non è linkato da nessuna parte.
6. **L'archivio per giornata esiste ma mostra meno di quello che ha:** `GET /service-days/:id`
   restituisce gli ordini **con le loro righe**, la pagina stampa solo numero e importo.
7. **Non esiste modo di correggere il prezzo di una riga.** Lo sconto per riga è implementato per
   intero nel backend e non lo chiama nessuno.

## Baseline — cosa fa il codice oggi

| Fatto | Dove |
| --- | --- |
| Scheda tavolo dalla mappa, sola lettura | `frontend/src/components/tables/TableDetailModal.tsx` |
| Scheda tavolo operativa, raggiungibile solo dal POS | `frontend/src/components/pos/TableCheckoutModal.tsx` |
| Pagina ordini monolitica, 1804 righe | `frontend/src/app/(dashboard)/orders/page.tsx` |
| `GET /orders` filtra per `today` (giorno UTC), `start_date`, `end_date` — **non** per giornata di servizio | `main/routes/orders.ts:195` |
| `GET /service-days/:id` restituisce gli ordini con le righe | `main/routes/service-days.ts:93`, `main/services/service-day.ts:442` |
| La pagina giornate stampa solo numero e importo | `frontend/src/app/(dashboard)/service-days/page.tsx:349` |
| Selettore tipo ordine, nasconde "al tavolo" per i non-ristoranti | `frontend/src/components/pos/CartPanel.tsx:76` |
| `PATCH /orders/:id/items/:itemId/discount` esiste e non è chiamato da nessun frontend | `main/routes/orders.ts:1186` |
| `unit_price` viene scritto solo all'inserimento, non esiste alcuna modifica | `main/routes/orders.ts:473`, `main/routes/orders.ts:656` |
| Le note di riga vengono stampate su entrambi i modelli di conto, etichetta `Nota: ` | `main/printers/thermal.ts:860`, `main/printers/thermal.ts:941` |
| L'importo di ogni riga passa da una sola funzione (`itemRows`) | `main/printers/thermal.ts:1042` |
| `is_active` si cambia solo aprendo il modulo di modifica; la pastiglia in lista non è cliccabile | `frontend/src/app/(dashboard)/products/page.tsx:554` |
| Segnale arancione "comanda in sospeso" già disegnato sul tavolo in mappa | `frontend/src/components/tables/RoomMap.tsx:114` |
| Nessun registro di chi applica sconti o modifiche: esiste solo `print_logs` | `main/db.ts:2316` |

## Decisioni

### 1. Navigazione a cinque voci

| Voce | Contenuto |
| --- | --- |
| **Sala** | mappa delle stanze e prenotazioni |
| **Ordina** | composizione e invio degli ordini (l'ex POS); non incassa |
| **Giornata** | ordini della giornata di servizio in corso, incasso e chiusura |
| **Menu** | prodotti, categorie, gruppi extra |
| **Archivio** | le giornate passate |

In fondo alla barra, sopra Esci: **Impostazioni**, che assorbe Personale, KDS e WhatsApp.

Ogni voce risponde a una domanda diversa: dove sono seduti / sto prendendo un ordine / cosa c'è
aperto adesso / cosa vendo / cosa ho incassato.

Da decidere durante il lavoro: se lo schermo cucina (`/kds`) merita un punto d'ingresso o se resta
raggiungibile solo per indirizzo dal monitor in cucina. Quello che non può restare è una voce che si
chiama KDS e apre un'altra cosa.

### 2. Pannello ordine condiviso

Il blocco per-ordine che oggi vive dentro `orders/page.tsx` — righe, stati, storni, sconti, preconto,
incasso — viene **estratto** in un componente unico e usato da tre posti: la scheda del tavolo, la
scheda Giornata e il checkout della Cassa.

Vincolo esplicito: **non duplicare**. Tre copie della stessa logica di storno divergono al primo
bugfix.

Nella scheda del tavolo il pannello si apre come **pannello laterale**, non come il modale attuale
(`max-w-md`, troppo stretto per lavorarci), così la sala resta visibile accanto.

Gerarchia delle azioni, dal servizio in giù:

- **Prima fila:** aggiungi righe (apre Ordina con l'ordine già agganciato), invia in cucina, stampa
  preconto, incassa e libera.
- **Dietro un "altro":** storno con PIN, sconto, modifica prezzo, converti in asporto, annulla
  ordine. Sono azioni da responsabile, non da servizio.

### 3. Giornata

Sostituisce l'attuale scheda Ordini e mostra **solo la giornata di servizio in corso**, ordini chiusi
e pagati compresi: una ristampa, uno storno o un conto sbagliato si scoprono mezz'ora dopo.

"Oggi" significa **giornata di servizio, mai giorno di calendario**: all'una di notte gli ordini
della serata devono restare qui, non sparire nell'archivio mentre la sala è ancora piena.

In cima alla pagina: incasso della giornata e il rito di chiusura, che si sposta qui da
`/service-days`. La chiusura vive dove la giornata finisce.

### 4. Archivio

Resta la pagina delle giornate, meno il rito di chiusura. L'unica aggiunta è che **l'ordine si
espande** e mostra le sue righe: i dati arrivano già dall'API, è solo la pagina che non li disegna.

### 5. Asporto e delivery opzionali

Una **sola** voce di impostazione con le spunte dei tipi ordine attivi, non due interruttori
separati. Quando un tipo è spento sparisce del tutto: dal selettore di Ordina e dal filtro della
Giornata.

Se resta il solo servizio al tavolo, il selettore **non deve restare con un bottone solo**: sparisce.
Tre bottoni di cui uno è sempre la risposta sono rumore.

Se in futuro vengono riaccesi, gli ordini di asporto e delivery compaiono nella Giornata evidenziati
con un colore diverso.

### 6. Prezzo di riga modificabile

Nuovo `PATCH /orders/:id/items/:itemId/price`, con **le stesse guardie dello sconto per riga**:
titolare o responsabile, PIN se `discount_requires_approval` è acceso, rifiutato su ordini completati
o annullati e dopo un conto diviso.

Vale su **qualsiasi riga**, non solo sui prodotti fuori menu. Limitarlo avrebbe richiesto un campo in
più per *ridurre* una funzione, e il caso "non so quanto costa" non riguarda solo il Generico.

In interfaccia il prezzo di listino resta visibile accanto a quello nuovo, così una battuta sbagliata
si vede prima di stampare.

Il grosso del lavoro è già fatto: l'endpoint dello sconto per riga ricalcola la riga, ricalcola il
totale ordine, riscala proporzionalmente lo sconto generale e aggiorna il conto aperto. Il nuovo
endpoint riusa quello stesso percorso cambiando `unit_price` invece di `discount_amount`.

Nella stessa occasione si collega finalmente lo **sconto per riga**, che è scritto e inutilizzato.

Il prezzo non compare sulla comanda, quindi nessuna di queste modifiche disturba la cucina.

### 7. Fuori menu: prodotto Generico

Niente riga senza prodotto, niente prezzo chiesto al cameriere — al momento dell'ordine il prezzo
spesso non si sa. Il giro è:

1. Il cameriere aggiunge il prodotto **Generico** e scrive il piatto nella nota.
2. La nota esce **sia sulla comanda** (in grassetto con `>>`) **sia sul preconto** (`Nota: `).
3. Chi sa il prezzo lo mette sulla riga al momento del conto.

Il prodotto Generico porta una spunta nuova, **"prezzo da definire"**. Finché una riga di quel
prodotto non ha un prezzo:

- pastiglia arancione sulla riga nel pannello ordine;
- pallino sul tavolo in mappa, riusando il segnale già disegnato per le comande in sospeso;
- alla stampa del preconto, una **conferma** — non un blocco.

Il segnale sta sul prodotto e **non sul prezzo a zero**: in questo locale amari e caffè sono quasi
sempre offerti, quindi le righe a zero sono la normalità e un avviso legato al valore si accenderebbe
sempre, cioè smetterebbe di essere un avviso.

Limiti noti, accettati: la nota viene troncata a circa 40 caratteri su una riga sola, e le note escono
sul preconto per **tutti** i piatti, non solo per il Generico — comportamento già esistente.

### 8. "Offerto" sul preconto

Una riga il cui totale è zero e il cui prodotto **non** è marcato "prezzo da definire" è un omaggio:
sul conto stampa `Offerto` al posto di `0,00`. Distingue a colpo d'occhio il regalo dalla
dimenticanza e fa una figura migliore col cliente.

Non serve nessuna colonna: lo stato si deduce. L'importo di riga passa da un'unica funzione
(`itemRows`), quindi la modifica è una condizione più l'etichetta tradotta en/it.

Conseguenza da valutare col tempo, non ora: tenendo i prodotti offerti a prezzo pieno in menu e
azzerandoli caso per caso, il conto mostrerebbe al cliente **quanto** gli è stato offerto. Oggi quei
prodotti stanno a zero fisso in menu e quel valore non lo vede nessuno, nemmeno a fine serata. È un
cambio di prezzo in menu, non di codice: si prova e si torna indietro quando si vuole.

### 9. Interruttore rapido nel Menu

La pastiglia Attivo/Non attivo nella lista prodotti diventa cliccabile. Oggi per togliere un piatto
finito bisogna aprire il modulo di modifica e togliere una spunta in fondo.

Un piatto disattivato sparisce dalla Cassa ma **non rompe gli ordini aperti**: la riga si porta
dietro nome e prezzo suoi.

### 10. Spostamenti

- **Personale** entra nelle Impostazioni (pagina da 324 righe; la barra laterale delle impostazioni
  la accoglie senza modifiche strutturali).
- **WhatsApp** entra nelle Impostazioni: è l'accoppiamento col telefono e lo stato della connessione,
  non un posto dove si lavora.
- **KDS** era già una scheda delle impostazioni travestita da sezione: sparisce dalla sidebar.
- **Impostazioni** scende in fondo alla barra, sopra Esci.

## Impatto su database e API

**Una sola migrazione:** una colonna su `products` per la spunta "prezzo da definire"
(`INTEGER DEFAULT 0`, nome nello stile delle 82 esistenti, per esempio `add_product_price_required`).

Non servono altre colonne: i tipi ordine attivi sono una voce nella tabella impostazioni
chiave/valore, "Offerto" si deduce, e `unit_price` esiste già.

| Modifica API | Tipo |
| --- | --- |
| `GET /orders` accetta un filtro sulla giornata di servizio in corso | nuovo parametro |
| `PATCH /orders/:id/items/:itemId/price` | nuovo endpoint, guardie dello sconto |
| `PATCH /orders/:id/items/:itemId/discount` | esiste, va solo collegato al frontend |
| `PUT /products/:id` | esiste, riusato dall'interruttore rapido |
| Tipi ordine attivi | nuova voce in `/settings` |

Il calcolo dei prezzi resta autoritativo lato backend: il nuovo endpoint valida ruolo, PIN e stato
dell'ordine prima di scrivere, e ricalcola i totali da sé.

## Ordine dei lavori

1. Impostazione dei tipi ordine attivi. Piccola, indipendente, e definisce cosa contiene la Giornata.
2. Filtro sulla giornata di servizio in `GET /orders` e nuova scheda **Giornata**, chiusura inclusa.
3. **Archivio** con ordini espandibili (solo frontend).
4. Estrazione del pannello ordine condiviso e innesto nella scheda del tavolo. È il pezzo grosso.
5. Modifica prezzo di riga, sconto di riga collegato, prodotto Generico con "prezzo da definire",
   `Offerto` sul preconto.
6. Riordino della sidebar e spostamenti nelle impostazioni.
7. Interruttore rapido Attivo/Non attivo nel Menu.

Il riordino della sidebar sta in fondo apposta: spostare le pagine mentre le si riscrive è lavoro
fatto due volte.

## Emendamenti raccolti durante il lavoro

Cose decise mentre si implementava, che il piano non prevedeva:

- **La voce Clienti resta nella barra**, deciso dall'utente il 2026-08-29: il piano elencava cinque
  voci e non diceva nulla di Clienti. Continua a sparire quando il libro clienti è spento.
- **Il preconto ha un pulsante suo.** Il piano lo dava per scontato nella prima fila di azioni, ma
  non esisteva: la stampante compariva solo dopo che un conto esisteva, e un conto nasceva solo
  premendo Incassa, che apre la finestra di pagamento. Ora "Stampa preconto" genera il conto se
  serve e va dritto alla stampa.
- **Lo sconto sull'intero conto è stato collegato, non cancellato.** La finestra esisteva già
  scritta per intero e nessun pulsante l'apriva, da prima di questo lavoro. Serve perché lo sconto
  alla comitiva deve comparire sul preconto, che si stampa prima della cassa: sta nel menu "Altro".
- **La fila di azioni si è divisa in due**, come prevedeva il punto 2: davanti le quattro cose che
  fa la sala, dietro "Altro" quelle da responsabile.
- **La Cassa si chiama Ordina, e non incassa.** Deciso il 2026-08-29, dopo che l'utente ha trovato
  in quella schermata un percorso di incasso che non aveva mai notato in mesi d'uso. Il motivo non è
  di interfaccia: in questo locale il registratore di cassa è una macchina fisica separata, il
  programma stampa il preconto e registra come è stato saldato. Chiamare "Cassa" la schermata che
  compone gli ordini era una bugia sul mondo fisico. Ordina compone e invia, e basta.
- **"Aggiungi righe" porta in Ordina** (`/pos?append=<orderId>`) invece di aprire un selettore
  dentro il pannello. Quel selettore non sapeva gestire gli aggiuntivi: una pizza con le acciughe
  extra da lì non si poteva ordinare. Ora c'è un solo posto dove si compone un ordine, ed è quello
  che servirà anche per il menu fisso.
- **Dopo l'invio di un ordine al tavolo si torna in Sala.** Un ordine su un tavolo continua a
  lavorarsi dove il tavolo sta; restare in Ordina lascerebbe la schermata su un carrello vuoto.
  Vale per gli ordini al tavolo, non per asporto e delivery, che vivono in Giornata.
- **"Prendi ordine" chiude il giro dalla parte opposta** (`/pos?table=<id>`): dal tavolo libero si
  apre il primo ordine senza passare dal selettore di Ordina. Prima di aprirlo controlla che nessun
  altro sia arrivato per primo — un palmare può averlo fatto nei secondi in cui il pannello era
  aperto — e in quel caso aggiunge a quell'ordine invece di aprirne un secondo sullo stesso tavolo.
- **Le prenotazioni si raggiungono dalla Sala** con un pulsante, invece di fondere le due pagine:
  la fusione è lavoro di interfaccia che il rifacimento grafico farà meglio.
- **Lo schermo della cucina ha un link** dalla scheda KDS delle impostazioni. Era la domanda
  lasciata aperta al punto 1: la risposta è che un punto d'ingresso serve, perché prima non ne
  aveva nessuno.
- **`/staff` sopravvive come rotta** e mostra la stessa schermata della scheda impostazioni, così
  un collegamento salvato non finisce nel vuoto.
- **L'invio in cucina è diventato un hook condiviso** (`useSendKot`) invece di essere copiato dal
  POS al pannello ordine.
- **Il ricalcolo dei totali dopo una modifica di riga** è ora condiviso fra sconto e prezzo, per lo
  stesso motivo.
- **Dalla Cassa non si incassa più un tavolo.** Il piano voleva il pannello anche dentro
  `components/pos/TableCheckoutModal`; guardandola in uso, l'utente ha deciso meglio: quella
  finestra serve ad attaccare a un tavolo aperto quello che si è battuto al banco, e basta. Il
  conto e l'incasso si fanno dalla Sala o dalla Giornata — un ordine si chiude da un posto solo —
  e per asporto e delivery dalla sola Giornata. I due pulsanti di incasso sono spariti da lì.
  Ordina non ha più nessuna azione di cassa.
- **La divisione del conto è stata poi tolta del tutto** (migrazione v91). Era arrivata nel
  pannello il 2026-08-29 dietro `split_checks_enabled`, e da lì ha continuato a costare: un ordine
  smetteva di essere un conto solo, ogni importo andava ripartito fra le quote, il coperto diviso
  per testa invece che per piatto, e sei rotte dell'ordine portavano una guardia per non farsi
  modificare dopo la divisione. Quello che va al tavolo è un preconto: chi paga cosa si sistema
  alla cassa, che è una macchina a parte. Via l'impostazione, la finestra, le rotte
  `/bills/:id/split-check` e `/bills/:id/unsplit`, le colonne `split_group_id`/`split_label` e la
  tabella `bill_items`; i gruppi già divisi sono stati ricompattati in un conto solo.
- **La finestra di pagamento ha perso lo sconto e ha guadagnato i pulsanti.** Lo sconto si fa prima,
  sull'ordine o sulla riga, così compare sul preconto che va al tavolo: scontarlo dopo la stampa
  vorrebbe dire che la carta in mano al cliente non dice quello che paga. E il metodo di pagamento
  era già un pulsante che riempiva l'importo da solo, solo che sembrava un'etichetta incollata a una
  casella — l'utente ha scritto a mano importi che gli venivano riempiti da un tocco. Ora si vede
  che è un pulsante; la casella resta per il resto in contanti e per i pagamenti misti.

## Fuori ambito

- **Rifacimento della scheda prodotti.** Il modulo chiede ancora SKU, codice a barre, prezzo di
  costo, percentuale di cashback, giacenza e scorta minima: campi da supermercato in un menu da
  ristorante. Sessione a parte.
- **Menu fisso a prezzo unico** (antipasto, primo, secondo, dolce o frutta). Da valutare sui gruppi
  extra, che hanno già obbligatorietà, minimo, massimo e voci a prezzo zero. Il pezzo mancante è che
  le voci dei gruppi sono un catalogo separato dai prodotti. Sessione a parte.
- **Nome di riga modificabile.** Tecnicamente banale (`product_name` è già una copia), scartato per
  ora: rinominare la riga rende il fuori menu indistinguibile da un piatto di menu nell'archivio.
- **Registro delle modifiche.** L'app non traccia chi applica sconti; una tracciatura dei cambi
  prezzo andrebbe costruita da zero. Non richiesta.
- **Statistiche fra giornate.** Fuori ambito per scelta di prodotto, già registrata.
- **Codice morto:** `/order-history-demo` e `components/orders/OrderHistoryGrid.tsx` sono un
  prototipo con dati finti raggiungibile per indirizzo. Da cancellare o riusare come base
  dell'Archivio.

## Verifica

| Passo | Controlli minimi |
| --- | --- |
| 1 | `npm run lint`, `npm run build`, `npm run build:frontend`, `npm run i18n:check`, `npm run test:order-types`, più `test:schema-health` e `test:upgrade-path` per la voce di impostazione |
| 3, 6, 7 | `npm run lint`, `npm run build:frontend`, `npm run i18n:check` |
| 2 | `npm run lint`, `npm run build`, `npm run test:service-days` |
| 4 | le sei suite di sala: `test:table-crud`, `test:rooms-map`, `test:reservations`, `test:reservation-sheet`, `test:table-merge-layouts`, `test:service-days` — non fanno parte di `npm test` |
| 5 | `npm run test:printer`, `npm run test:receipt-printing`, `npm run test:kot-batch`, più test su database nuovo e su percorso di aggiornamento per la migrazione |

`npm test` al termine del passo 4 e prima di qualunque rilascio.
