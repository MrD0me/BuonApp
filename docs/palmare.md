# Il palmare

**Stato:** CURRENT. Deciso e fatto il 2026-09-15 sul branch `palmare`; rifatto nella grafica il
2026-09-16 sul branch `rifacimento-grafica` (fase B del piano approvato quel giorno). Il 2026-09-24
Ordina è passata dalla griglia di riquadri a un elenco di righe con foto, matita e `−  n  +`, e la
ricerca ha preso la «x» per svuotarla. Lo stesso giorno il QR per entrare è arrivato nella barra
laterale del PC, alla voce «Palmari». Il 2026-10-08, sul branch `palmare-affidabile`, dopo due
segnalazioni dal servizio — il telefono che perde il Wi-Fi e non manda più niente, e una comanda
lunga per un tavolo da 20 che «faceva cose che non avevo premuto» fino a dover ricaricare e perderla
— sono arrivate la coda d'invio, la comanda salvata sul telefono, il tasto indietro dentro l'app e
la finestra del menu fisso che non si sposta sotto il dito (sezioni qui sotto).

Il Server App è la pagina che i camerieri aprono sul telefono, servita sulla porta `:3003` da
`main/server-app.ts` e raggiungibile in LAN come `buonapp.local:3003`. Fino alla 5.0.0 era rimasto
alle funzioni di FloCafe: una griglia di prodotti, una nota per riga, l'invio. Non sapeva fare
aggiuntivi, coperti, menu fisso, uscite, e non vedeva la sala. Tutto questo esisteva sul PC
centrale, e le finestre erano state scritte apposta con contratto props-dentro/callback-fuori per
essere montate qui senza toccarle (vedi [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md)).

## Come ci arriva il cameriere

Il telefono apre `http://<IP del PC>:3003`, o `http://buonapp.local:3003` dove la rete risolve i
nomi mDNS, e il cameriere entra con il suo nome utente e la sua password: il palmare accetta solo
il ruolo `server`. Gli indirizzi, con un QR per ogni rete su cui sta il PC, li mostra
`components/settings/ServerAppAccess.tsx`, che li chiede a `GET /api/server-app-info` appena
compare. Sta in due posti:

- **«Palmari»**, nella barra laterale del PC subito sopra Impostazioni. Non è una pagina: apre una
  finestra sopra la schermata in cui si è, così un ordine a metà in Ordina è ancora lì quando la
  si chiude. La vedono titolare, responsabile e cassiere: il QR è solo un indirizzo, e per entrare
  servono comunque le credenziali del cameriere. Sparisce quando il Server App è spento:
  `server_app_enabled` la barra lo legge all'avvio e a ogni accesso, e Impostazioni lo aggiorna
  quando si cambia.
- **Impostazioni → Ordinazione al Tavolo**, sotto l'interruttore che accende e spegne il Server
  App. Qui i codici comparivano solo dopo aver premuto «Carica Informazioni Server App»; ora
  subito.

Prima il QR stava solo in Impostazioni, a tre tocchi, e il cassiere, che le Impostazioni non le
vede, non poteva mostrarlo a un cameriere appena arrivato.

## Cosa fa

Tre schermate, una dopo l'altra: la sala, un tavolo, l'ordine su quel tavolo.

**Sala.** In testa il nome del cameriere e le stanze come selettore (con il conto dei tavoli); sotto,
i tavoli come riquadri in ordine naturale (Tav 2 prima di Tav 10). Ogni riquadro dice lo stato due
volte, con una banda colorata sul bordo e con una pillola scritta («Occupato», «Prenotato»), perché
il puntino di prima non si vedeva passando; poi coperti e minuti da quando il tavolo è stato aperto,
il badge arancione «N da inviare» se c'è un giro ancora da mandare in cucina, il nome della
prenotazione se è libero e prenotato. I colori sono
quelli di `lib/status-styles.ts`, gli stessi della mappa sul PC. È un elenco e non la mappa: su uno
schermo da sei pollici una stanza in scala si riduce a metà e scorre di lato, e al cameriere che sta
in piedi accanto al tavolo non serve sapere dove sta.

**La schermata del tavolo**, che si apre toccando un riquadro. È una pagina intera con la freccia
indietro, non più un cassetto: il cassetto non aveva un pulsante di chiusura e andava smontato ogni
volta che la finestra del menu si apriva sopra, perché stavano sullo stesso livello. Contiene:

- l'ordine aperto con le righe raggruppate sotto il menu che le ha generate, e per ogni piatto una
  pillola che dice «Da inviare» finché il giro non è partito e poi lo stato di cucina;
- i coperti, correggibili con `−`/`+` da 56 px (`PATCH /orders/:id/guests`): il coperto sul conto si
  riprezza da solo;
- l'uscita di ogni piatto alla carta, spostabile con un tocco prima e dopo l'invio
  (`PATCH /orders/:id/items/:itemId/service-run`). Dentro un menu no: lì l'ordine delle uscite lo
  fanno le portate, e un selettore sotto ogni piatto era una colonna di pulsanti che nessuno preme.
  I piatti alla carta uguali, anche se aggiunti in più volte, sono una riga sola («3× Coca-Cola»), e
  il selettore sotto la riga la sposta tutta;
- **«Secondo 0/8: da scegliere»**, un pulsante a tutta larghezza sulla portata di un menu già
  mandato che ha ancora posto, con il conteggio di quanti piatti ha su quanti ne tiene: apre la
  stessa finestra del PC ristretta a quella portata e scrive con
  `PUT /orders/:id/menu-groups/:groupId/courses/:courseId`. Un piatto che la cucina ha già preso
  in mano non si scavalca: 409 `course_in_progress`, e il messaggio lo dice;
- il menu come riga da N, «8× Menu completo», con `−`/`+` per quanti menu
  (`PATCH /orders/:id/menu-groups/:groupId`) e sotto i piatti contati, «3× Lasagne». Ogni riga dice
  quante, «1×» compreso (vedi il menu a conteggio in
  [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md));
- in fondo, fissi, **Invia in cucina (n)** se c'è un giro pendente e **Aggiungi piatti** (o **Prendi
  ordine** su un tavolo libero), che porta in Ordina con il carrello agganciato a quel tavolo.

**Ordina.** In testa il tavolo e i coperti. Poi la ricerca, con una «x» che la svuota e lascia la
tastiera aperta per cercare subito il piatto dopo; le categorie come selettore a scorrimento; e i
piatti in **elenco**, uno per riga (due colonne su un tablet). Ogni riga presenta il piatto come lo
cerca l'occhio — la foto, il nome, il prezzo — e finisce con quello che gli si può fare: la matita e
`−  n  +`. La foto arriva dal `:3003` (vedi il proxy più sotto). Un piatto senza foto mostra le sue
iniziali sul suo colore, lo stesso quadratino del PC. Prima era una griglia di riquadri a due
colonne, e l'occhio saltava da un nome all'altro: la riga è più alta, ma si legge in un colpo.

Il tocco sulla riga, e il `+`, fanno quello che fa il tocco sul PC:
- un menu fisso apre la finestra che chiede quanti menu e conta i piatti portata per portata (se
  quel menu è già nel carrello riapre la sua riga);
- un piatto che entra in una portata libera di un menu aperto — nel carrello o già sul conto —
  chiede "compreso nel menu?";
- un piatto con aggiuntivi o a prezzo da definire apre le sue opzioni.

**Tutto il resto va dritto in comanda**, senza finestra (`lib/product-options.ts`): un'acqua non ha
niente da decidere, e una finestra per ogni piatto era un tocco in più tutta la sera. La matita apre
comunque nota e quantità.

Il numero fra `−` e `+` conta i piatti ordinati da soli, come la griglia del PC. Un piatto scelto
dentro un menu fisso appartiene al menu, e si vede in comanda sotto di lui. Fino al 2026-09-24
contava anche lui: chiusa la finestra del menu, la riga di ogni suo piatto risultava selezionata,
con un `−` che non poteva toglierlo. La riga del menu conta i menu, e il suo `−` resta spento: un
menu si toglie dalla comanda. Il `−` serve a togliere un tocco sbagliato dalla riga stessa, senza
aprire la comanda e tornare indietro. Toglie un piatto dalla riga che il `+` riempie, quella
semplice senza note né aggiunte; se non c'è, dall'ultima riga di quel piatto. Quando non resta
niente che possa togliere, il `−` si spegne.

La comanda è una barra fissa in basso che dice quanti piatti e quanto, e un tocco la apre a schermo
intero: righe da 48 px con il cestino, lo stepper e un pulsante con l'uscita corrente («2ª uscita»)
che apre la griglia solo se va cambiata, perché il piatto la eredita già dalla categoria; un menu è una riga
«8× Menu completo» coi piatti contati sotto; per un ordine nuovo ci sono i coperti, che partono dalla
prenotazione o dai posti del tavolo (con la riga informativa del coperto, se la casa lo fa pagare;
vedi [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md)), e le note. Le tre finestre stanno un livello sopra la pagina,
quindi la comanda resta dov'è mentre si corregge una riga.

L'invio passa dalla **coda d'invio** (sezione sotto): la comanda viene scritta sul telefono, il
carrello si svuota, si torna al tavolo, e da lì la coda apre l'ordine (`POST /orders`) o aggiunge le
righe a quello aperto (`POST /orders/:id/items`) e poi manda la comanda (`POST /printers/print-kot`),
senza chiedere: sul palmare mandare l'ordine *è* mandare la comanda. La stampante inceppata dà un
avviso, non un ordine fallito.

## La coda d'invio

Il telefono al limite del Wi-Fi perde il PC per un minuto, o perde la risposta a una richiesta che
il PC ha ricevuto. Prima un invio così lasciava **un solo** tentativo in sospeso per cameriere
(`lib/append-attempt.ts`), e ogni invio dopo, su qualunque tavolo, falliva con «Impossibile inviare
l'ordine» finché non si ricaricava la pagina — che buttava la comanda. Ora «Invia» scrive la comanda
in una coda sul telefono (`send-queue.ts`, puro; `useSendQueue.ts`) e la coda la manda: subito se il
PC risponde, **da sola appena torna il collegamento**. Intanto il cameriere prende gli altri tavoli.

Tre regole impediscono che un piatto parta due volte:

- **Congelata al tocco.** Chiave d'idempotenza, indirizzo e corpo di una voce si fissano quando si
  preme Invia e ogni ripetizione li rimanda uguali. Il backend conserva ogni chiave a cui ha risposto
  (`order_idempotency`, senza scadenza) e a una ripetizione risponde con quello che ha già fatto,
  **prima** di qualunque altro controllo (anche per l'ordine nuovo, dal 2026-10-08: un piatto spento
  nel frattempo faceva rispondere 400 a un ordine che esisteva).
- **Chi apre il tavolo lo decide il backend.** Un ordine nuovo parte con `only_if_table_free`: se il
  tavolo nel frattempo è stato aperto — un altro palmare, la cassa, una comanda precedente dello
  stesso telefono — il 409 `table_has_open_order` dice quale ordine è aperto e prova che sotto quella
  chiave non è stato scritto niente; gli stessi piatti vanno su quell'ordine come aggiunta, con la
  chiave `<chiave>:a`, senza coperti né note (resterebbero quelli dell'ordine aperto). Il cameriere
  lo legge in un avviso, se l'ordine non l'aveva aperto il suo telefono.
- **I piatti tornano nel carrello solo quando il PC di sicuro non li ha**: la voce non è mai partita,
  o il PC l'ha rifiutata con un 4xx. Dopo un timeout o un 5xx potrebbe essere già sul conto.

Le voci partono una alla volta e in ordine dentro ogni tavolo (prima si apre l'ordine, poi ci si
aggiunge; la cucina riceve i giri nell'ordine in cui sono stati presi), ma un tavolo in attesa non
ferma gli altri. Senza risposta, o con 408/425/429/502/503/504, la voce si riprova da sola; con un 401
dopo il nuovo accesso; con un 5xx dopo 10, 30 e 60 secondi e poi chiede al cameriere; con un altro
4xx chiede subito, col motivo (conto chiuso, tavolo sparito, piatto esaurito, rifiuto). **Oltre 30
minuti** dalla scrittura non parte più da sola (scelta del titolare: un antipasto che arriva in
cucina tre quarti d'ora dopo non lo aspetta nessuno): la decide il cameriere, con «Invia lo stesso»,
che usa la stessa chiave. Una voce si manda solo col gettone di chi l'ha scritta (il backend tiene le
chiavi per account): le comande di un altro cameriere rimaste sul telefono sono dette in Sala.

La comanda in cucina parte a fine giro, **una per ordine**, da una lista salvata con la coda: due
giri dello stesso tavolo rimasti in attesa escono su un foglio solo. Senza rete l'ordine resta in
lista per il giro dopo; una stampante in errore dà l'avviso di sempre, e la schermata del tavolo
offre «Invia in cucina (n)». Il timeout della comanda è 45 secondi: una stampante di rete spenta
costa 5 secondi per postazione, una USB su Windows fino a 20.

**Cosa vede il cameriere.** Niente banner: un riquadro che compare sposta la pagina di quanto è alto,
e il tocco seguente finisce sul piatto sopra. Lo dice la testata che c'è già: diventa ambra quando il
PC non risponde o una comanda chiede una decisione, e la sua seconda riga diventa «Senza
collegamento al PC · 2 comande in attesa»; un tocco apre l'elenco, con per ognuna «Riprova»,
«Rimetti in comanda» (quando si può) ed «Elimina» (che avvisa se potrebbe essere già arrivata).
Nella schermata del tavolo le comande in attesa stanno in grigio sotto «In attesa di invio», e il
riquadro in Sala porta «In attesa». Le azioni che cambiano il conto stesso — coperti, uscite, menu
sul conto, «Invia in cucina» — senza PC avvisano subito «Serve il collegamento al PC» invece di
bloccare la schermata dieci secondi.

**Il collegamento** (`connection.ts`) lo dice ogni richiesta: qualunque risposta, anche un rifiuto,
vuol dire che il PC c'è; nessuna risposta vuol dire di no. Quando manca, il telefono chiede
`GET /api/health` del `:3003` ogni 5 secondi a schermo acceso, e appena risponde svuota la coda e
rilegge la sala. All'avvio, con un accesso salvato e il PC muto, il palmare dice «Collegamento al
PC…» e riprova da solo, invece di mostrare il modulo d'accesso; e l'accesso distingue «il PC non
risponde» dalle credenziali sbagliate.

I tentativi lasciati dalla versione prima (`buonapp:server-app-order-attempt` e la chiave di
`append-attempt` del cameriere) entrano in coda al primo avvio, con la loro chiave.

## La comanda non si perde

La comanda in corso vive in memoria, e un telefono la perde più facilmente di una cassa: una
ricarica, una scheda buttata via dal browser mentre il cameriere risponde al tavolo, l'iPhone che
riapre l'app da zero. `handheld-draft.ts` (puro) e `useHandheldDraft.ts` salvano carrello e
finestra del menu aperta a ogni modifica (raggruppate in 300 ms) e subito quando la pagina va in
background, per cameriere. Al caricamento, in un carrello vuoto: **entro mezz'ora** si torna dritti
alla comanda — e alla finestra del menu, coi venti menu e i piatti contati —; più vecchia, fino a
12 ore, la Sala la offre con «Apri / Scarta». Un tavolo che non c'è più in sala non si riapre in
silenzio: la Sala lo dice, e la comanda segue il cameriere sul tavolo che apre. Rimettere una bozza
nel carrello non conta come scriverla: l'ora resta quella dell'ultima modifica. Una bozza già finita
in coda non torna mai come non inviata. Lo store del carrello non è toccato: il PC resta com'era.

**Il tasto indietro** (`handheld-history.ts`). Il gesto dal bordo di Android usciva dalla pagina. Ora
tavolo, Ordina e comanda aperta sono voci della cronologia: indietro chiude la comanda sul menu, il
menu sul tavolo, il tavolo sulla Sala, ed esce solo dalla Sala. Le voci si aggiungono solo da un
tocco (Chrome salta quelle aggiunte senza) e passando per il `pushState` di Next, che copia il suo
segno `__NA`: una voce senza fa ricaricare la pagina a Next. Le finestre sopra una schermata non sono
nella cronologia: un indietro con il menu aperto torna di una schermata, e la finestra riappare coi
suoi conteggi la volta dopo che si apre Ordina sullo stesso tavolo.

## Il telefono non si appesantisce

Una comanda lunga è fatta di centinaia di tocchi, e il telefono non deve fare altro nel frattempo.
Ogni sondaggio della sala (fino a centinaia di kilobyte di ordini aperti) e ogni rilettura del menu
ridisegnavano tutta la lista dei piatti anche quando non era cambiato niente, e ogni prezzo costruiva
il suo `Intl.NumberFormat`: su un telefono economico i tocchi si accodavano e venivano eseguiti su una
schermata già cambiata. Ora `useHandheldData` confronta il testo della risposta con quello prima e
non tocca lo stato se è uguale, e degli ordini cambiati tiene gli oggetti di quelli rimasti uguali;
le righe del menu sono `memo` e un tocco ridisegna solo la riga toccata; i formattatori sono in cache
(`main/countries.ts`); testate e barre in fondo sono piene invece che sfocate; un doppio tocco non fa
mai zoom. La striscia delle categorie riportava in vista la categoria scelta con `scrollIntoView`
a ogni rilettura del menu, e la lista tornava su da sola sotto il dito: ora scorre solo la striscia.
Ordina resta in piedi anche se un sondaggio non contiene più il tavolo (la mappa modificata sul PC
per un tavolo grande), e la finestra del menu tiene i piatti che aveva all'apertura.

La finestra del menu fisso è descritta in [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md): righe a
larghezza fissa, la nota per una porzione come icona nella riga, la portata al completo che lo dice.

## Se il telefono perde il Wi-Fi

Il palmare ora regge un buco di rete, ma la rete va comunque curata. Le cause più comuni, da
controllare in quest'ordine:

- **Il telefono passa da solo ai dati mobili.** Android e iPhone abbandonano un Wi-Fi che non porta a
  internet, o che giudicano debole: su Android va spento «Passa automaticamente ai dati mobili» /
  «Wi-Fi adattivo» (sui Samsung «Passa a dati mobili» nelle impostazioni avanzate del Wi-Fi), su
  iPhone «Assistenza Wi-Fi» nelle impostazioni dei dati cellulare. Quando il telefono chiede se
  restare su una rete senza internet, rispondere sì e ricordare la scelta.
- **Il Wi-Fi si spegne a schermo spento** per risparmio: il Wi-Fi va lasciato attivo durante la
  sospensione e il browser (o l'app aggiunta alla schermata iniziale) escluso dall'ottimizzazione
  della batteria.
- **Il PC cambia indirizzo.** Al PC va dato un indirizzo riservato nel router (DHCP statico): il QR
  dei palmari punta a quell'indirizzo, e `buonapp.local` non tutti i telefoni lo risolvono.
- **Il PC si sospende** o spegne la scheda di rete per risparmio energetico: in Windows va tolta la
  sospensione e, nelle proprietà della scheda di rete, «Consenti al computer di spegnere il
  dispositivo». La rete del locale deve essere «privata» in Windows, o il firewall può chiudere le
  porte 3001–3003.
- **Copertura.** Sale, dehors e cucina lontani dal router vogliono un ripetitore o un sistema mesh
  con lo stesso nome di rete.

Un palmare ricaricato mentre il PC non risponde mostra la pagina d'errore del browser: senza HTTPS
il browser non registra un service worker, quindi la pagina non è disponibile offline. Appena il
collegamento torna, la ricarica riporta la comanda e la coda.

## Cosa non fa, per scelta

- **Niente cassa.** Preconto, incasso, storni, sconti e prezzi di riga si fanno dal PC centrale,
  dove sta il registratore di cassa. Le rotte relative non sono inoltrate dal proxy.
- **Niente scritture sui tavoli.** Stato, prenotazioni e mappa si toccano solo dal PC
  (invariante di [table-management.md](table-management.md)); il palmare legge `GET /tables` e
  `GET /rooms`.
- **Niente clienti.** I campi nome e telefono sul biglietto sono spariti, con i tre inoltri
  clienti dal proxy: le prenotazioni hanno nome e persone propri, e il libro clienti non è una cosa
  che serve in sala.
- **Niente asporto o consegna.** Un telefono in sala prende ordini ai tavoli.

## Ogni cameriere su ogni tavolo

Fino a qui il ruolo `server` vedeva in lista solo i propri ordini, e aggiungere righe, cambiare
stato, riempire una portata, spostare un'uscita o stornare su un ordine aperto da un collega
rispondeva 403. In sala il palmare che prende il secondo non è quello che ha preso l'antipasto:
**il vincolo è caduto**, sul palmare e sul PC. Le sette guardie stavano in `main/routes/orders.ts` e
`main/routes/index.ts`; i `requireRole` per rotta restano, quindi un cameriere continua a non poter
scontare, riprezzare o incassare.

`orders.user_id` resta stampato dal token, mai dal body: dice chi ha preso l'ordine, che è l'unico
motivo per cui ogni cameriere ha un account suo. Aggiungere righe a un ordine altrui non lo
riscrive.

Tre suite lo asserivano come politica di sicurezza (`orders-authz`, `security-hardening`,
`issue-255-append-idempotency`) e ora asseriscono quella nuova; `fixed-menu` e `service-runs`
hanno un caso col token di un collega.

## Il proxy

`main/server-app.ts` inoltra al `:3001` solo questa lista, e per tutto il resto sotto `/api`
risponde 404 (prima una rotta sconosciuta cadeva nel fallback statico e tornava con l'HTML della
pagina e un 200):

```
GET   /categories  /products  /tables  /rooms  /settings  /orders  /orders/:id
POST  /orders  /orders/:id/items  /printers/print-kot
PATCH /orders/:id/guests  /orders/:id/items/:itemId/service-run  /orders/:id/menu-groups/:groupId
PUT   /orders/:id/menu-groups/:groupId/courses/:courseId
```

Il ruolo è controllato due volte: dal proxy, che ammette solo `server`, e dall'API principale
dietro ogni inoltro. `tests/server-app-server-role.test.ts` percorre tutta la lista, aperta e
chiusa.

**La foto di un piatto** è l'eccezione: `GET /products/:id/image` passa senza token, perché un
`<img>` non può portarlo. Non espone niente di nuovo: l'API principale lascia aperta la stessa rotta
per lo stesso motivo (`main/server.ts`), ed è in ascolto su tutte le interfacce, quindi quei byte
erano già raggiungibili in LAN dal `:3001`. L'inoltro serve solo a portarli sulla stessa origine
della pagina, l'unica da cui la sua CSP (`img-src 'self' data:`) accetta immagini. Solo lettura, e
404 quando il Server App è spento. Passa i byte come byte, non come il testo degli altri inoltri,
che li rovinerebbe, e rimanda l'`ETag`: una foto che il telefono ha già torna come 304. Cosa si può
servire (webp, png o jpeg, mai un SVG) lo decide l'API principale, una volta sola. Un id fatto di
punti (`.` o `..`) viene rifiutato: nell'indirizzo inoltrato sparirebbe, e porterebbe una
richiesta senza token su un'altra rotta. Il test la controlla contro una controfigura dell'API
principale: byte identici, 304, `POST` chiuso, id di punti rifiutati, Server App spento.

## Come è fatto

`frontend/src/app/server-standalone/page.tsx` è una pagina sottile che eredita la lingua da
`/api/server-app/info` e monta `components/server-app/ServerAppShell.tsx`. Attorno:

| File | Cosa fa |
| --- | --- |
| `server-api.ts` | il client axios del palmare, con il suo token, il suo 401 e il segnale di raggiungibilità |
| `useServerSession.ts` | accoppiamento, login, logout, feature spenta, «Collegamento al PC…» all'avvio |
| `useHandheldData.ts` | catalogo, impostazioni, stanze e ordini aperti; sondaggio ogni 15 s mentre la pagina è visibile, che non tocca niente se la risposta è uguale |
| `tenant-format.ts` | semina valuta e paese nello store auth, così `useFormatCurrency` formatta in euro dentro le finestre condivise |
| `SalaView.tsx`, `TableTile.tsx` | l'elenco per stanza; `roomTabs()` ordina stanze e tavoli e lo usa anche la testata |
| `TableScreen.tsx` | la schermata del tavolo, con le comande in attesa di invio |
| `OrdinaView.tsx`, `HandheldProductList.tsx`, `HandheldCart.tsx` | la presa comanda: menu e comanda sono due schermate sotto la stessa testata |
| `send-queue.ts`, `useSendQueue.ts` | la coda d'invio: le regole (puro) e il giro che la svuota |
| `connection.ts` | se il PC risponde, e la prova di `/api/health` quando no |
| `handheld-status.tsx`, `QueueSheet.tsx` | la testata che dice collegamento e coda, e l'elenco delle comande in attesa |
| `handheld-draft.ts`, `useHandheldDraft.ts` | la comanda salvata sul telefono, e il ripristino |
| `handheld-history.ts` | le schermate nella cronologia del browser, per il tasto indietro |

Montati così come sono, senza modifiche: `components/pos/AddonModal`, `FixedMenuPicker`,
`AttachToMenuModal`, `ServiceRunPicker` (sono costruiti su `components/ui/modal`, che sotto i 768 px
è un foglio dal basso e sopra una carta centrata), e le lib pure `cart-payload`, `cart-identity`,
`fixed-menu`, `service-runs`, `kot`, `product-options`, `status-styles`,
`image-utils` (il colore delle iniziali), più `store/cart`; `append-attempt` solo per leggere, al primo avvio, i tentativi lasciati dalla versione prima. Le primitive di interfaccia (`Stepper`, `StatusBadge`, `SegmentedControl`,
`ActionBar`, `EmptyState`) stanno in `components/ui/` e sono le stesse del PC.

Il layout della rotta dichiara `viewport-fit=cover` e un manifest suo
(`public/server-app.webmanifest`, che parte da `/server-standalone` invece che dalla cassa), così
aggiunto alla schermata iniziale del telefono si apre sulla sala; testata e barra delle azioni si
tengono lontane dal notch e dall'indicatore di casa con `env(safe-area-inset-*)`.

Il palmare **non importa mai `@/lib/api`** né gli store che lo usano: il suo interceptor 401
riporta al login del PC. Lo store auth del PC è già nel bundle per via del root layout e il palmare
gli scrive solo la valuta.

Tre scelte da sapere:

- **L'ordine a cui il carrello aggiunge è derivato**, non memorizzato: è l'ordine aperto sul
  tavolo del carrello, letto fresco a ogni render. Cambiare tavolo non può mandare un giro sul conto
  sbagliato — è la lezione del commit ffb52ad sul PC.
- **Un invio interrotto si ripete**, dalla coda d'invio: chiave e corpo sono scritti sul telefono
  prima che la richiesta parta, e ogni ripetizione li rimanda uguali; il backend risponde con quello
  che ha già fatto. L'ordine da aprire o a cui aggiungere si decide al tocco, e solo il backend lo
  cambia (il 409 di un tavolo già aperto).
- **Le righe arrivano da `GET /orders`**, non dai tavoli: il tavolo porta la testa dell'ordine ma
  non le righe, e sono le righe a dire se c'è un giro da mandare.

## Cosa resta fuori

- Due camerieri sullo stesso menu: il `PUT` è ultimo-che-scrive-vince, come già documentato.
- La cassa può ancora aprire un secondo ordine su un tavolo occupato: la guardia
  `only_if_table_free` la manda solo il palmare.
- Il gettone del palmare scade a ora fissa (10 giorni con «Ricordami», 24 ore senza) e non si
  rinnova: a metà servizio può tornare il modulo d'accesso. La comanda e la coda restano.
- Il PC ha la stessa trappola del tentativo unico in `append-attempt.ts` che il palmare aveva
  (meno probabile col cavo).
- Il totale stimato nel carrello non include il coperto, come sul PC: lo calcola il backend dai
  coperti. La riga informativa sotto il contatore dice quanto costa a testa.

## Verifica

`npm run test:server-app-queue` per la coda d'invio, `test:server-app-draft` per la comanda salvata,
`test:orders-replay-guard` per quello che la coda chiede al backend (ripetizioni prima dei controlli,
tavolo già aperto, codici dei rifiuti, limiti per account); lo spec Playwright
`frontend/e2e/server-app-resilience.spec.ts` percorre a misura di telefono la comanda ripresa dopo una
ricarica, il tasto indietro, la finestra del menu che non si sposta, la lista che non torna su, e la
coda senza rete con un solo ordine all'arrivo.
`npm run test:server-app-server-role` per il proxy; `test:orders-authz`, `test:security`,
`test:issue-255-append`, `test:authz-phase3`, `test:fixed-menu`, `test:service-runs` per la caduta
del vincolo di proprietà; `test:fixed-menu-tally` per i conteggi del menu che il palmare condivide
col PC; `npm run lint`, `npm run build`, `npm run build:frontend`,
`npm run i18n:check`, `npm run test:rtl-kds-server-whatsapp` per il frontend (i file del palmare
stanno nella lista dei file che devono usare solo utilità logiche). Lo spec Playwright
`frontend/e2e/i18n-batch-5d.spec.ts` percorre login, sala, scheda tavolo e finestra aggiuntivi in
inglese e in persiano, e in inglese anche il `−` che toglie il piatto appena messo e la «x» che
svuota la ricerca; il fixture `tests/e2e-server.cjs` semina un piatto con aggiuntivi («E2E
Tea») perché il tocco su un piatto senza opzioni non apre più nessuna finestra.
