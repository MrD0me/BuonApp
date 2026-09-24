# Il palmare

**Stato:** CURRENT. Deciso e fatto il 2026-09-15 sul branch `palmare`; rifatto nella grafica il
2026-09-16 sul branch `rifacimento-grafica` (fase B del piano approvato quel giorno). Il 2026-09-24
Ordina è passata dalla griglia di riquadri a un elenco di righe con foto, matita e `−  n  +`, e la
ricerca ha preso la «x» per svuotarla. Lo stesso giorno il QR per entrare è arrivato nella barra
laterale del PC, alla voce «Palmari».

Il Server App è la pagina che i camerieri aprono sul telefono, servita sulla porta `:3003` da
`main/server-app.ts` e raggiungibile in LAN come `buonapp.local:3003`. Fino alla 5.0.0 era rimasto
alle funzioni di FloCafe: una griglia di prodotti, una nota per riga, l'invio. Non sapeva fare
aggiuntivi, coperti, menu fisso, uscite, e non vedeva la sala. Tutto questo esisteva sul PC
centrale, e le finestre erano state scritte apposta con contratto props-dentro/callback-fuori per
essere montate qui senza toccarle (vedi [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md)).

## Come ci arriva il cameriere

Il telefono apre `http://<IP del PC>:3003`, o `http://buonapp.local:3003` dove la rete risolve i
nomi mDNS, e il cameriere entra con la sua email e la sua password: il palmare accetta solo il
ruolo `server`. Gli indirizzi, con un QR per ogni rete su cui sta il PC, li mostra
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
il badge arancione «N da inviare» se c'è un giro ancora da mandare in cucina, l'icona della catena
se il tavolo è unito a un altro, il nome della prenotazione se è libero e prenotato. I colori sono
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

L'invio scrive l'ordine (`POST /orders`) o aggiunge le righe a quello aperto
(`POST /orders/:id/items`) e poi manda la comanda (`POST /printers/print-kot`), senza chiedere:
sul palmare mandare l'ordine *è* mandare la comanda. La stampante inceppata dà un avviso, non un
ordine fallito.

## Cosa non fa, per scelta

- **Niente cassa.** Preconto, incasso, storni, sconti e prezzi di riga si fanno dal PC centrale,
  dove sta il registratore di cassa. Le rotte relative non sono inoltrate dal proxy.
- **Niente scritture sui tavoli.** Stato, prenotazioni, unioni e mappa si toccano solo dal PC
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
| `server-api.ts` | il client axios del palmare, con il suo token e il suo 401 |
| `useServerSession.ts` | accoppiamento, login, logout, feature spenta |
| `useHandheldData.ts` | catalogo, impostazioni, stanze e ordini aperti; sondaggio ogni 15 s mentre la pagina è visibile |
| `tenant-format.ts` | semina valuta e paese nello store auth, così `useFormatCurrency` formatta in euro dentro le finestre condivise |
| `SalaView.tsx`, `TableTile.tsx` | l'elenco per stanza; `roomTabs()` ordina stanze e tavoli e lo usa anche la testata |
| `TableScreen.tsx` | la schermata del tavolo |
| `OrdinaView.tsx`, `HandheldProductList.tsx`, `HandheldCart.tsx` | la presa comanda: menu e comanda sono due schermate sotto la stessa testata |
| `order-attempt.ts` | il tentativo di ordine nuovo persistito per il replay |

Montati così come sono, senza modifiche: `components/pos/AddonModal`, `FixedMenuPicker`,
`AttachToMenuModal`, `ServiceRunPicker` (sono costruiti su `components/ui/modal`, che sotto i 768 px
è un foglio dal basso e sopra una carta centrata), e le lib pure `cart-payload`, `cart-identity`,
`fixed-menu`, `service-runs`, `kot`, `product-options`, `status-styles`, `append-attempt`,
`image-utils` (il colore delle iniziali), più `store/cart`. Le primitive di interfaccia (`Stepper`, `StatusBadge`, `SegmentedControl`,
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
- **Un invio interrotto si ripete.** Chiave e corpo della richiesta vengono scritti in
  `localStorage` prima che parta; al caricamento successivo si rimanda con la stessa
  `Idempotency-Key` e il backend risponde con quello che ha già fatto. Per l'aggiunta righe è
  `lib/append-attempt.ts`, quella del PC; per l'ordine nuovo `order-attempt.ts`. Un rifiuto
  definitivo (ordine chiuso) scarta il tentativo con un avviso; un rifiuto transitorio lo tiene.
- **Le righe arrivano da `GET /orders`**, non dai tavoli: il tavolo porta la testa dell'ordine ma
  non le righe, e sono le righe a dire se c'è un giro da mandare.

## Cosa resta fuori

- Il carrello non è persistito: chiudere il browser a metà comanda la perde. `persist` su
  `useCartStore` toccherebbe il PC; se serve, dopo.
- Due camerieri sullo stesso menu: il `PUT` è ultimo-che-scrive-vince, come già documentato.
- Il totale stimato nel carrello non include il coperto, come sul PC: lo calcola il backend dai
  coperti. La riga informativa sotto il contatore dice quanto costa a testa.

## Verifica

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
