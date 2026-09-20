# Il palmare

**Stato:** CURRENT. Deciso e fatto il 2026-09-15 sul branch `palmare`; rifatto nella grafica il
2026-09-16 sul branch `rifacimento-grafica` (fase B del piano approvato quel giorno).

Il Server App è la pagina che i camerieri aprono sul telefono, servita sulla porta `:3003` da
`main/server-app.ts` e raggiungibile in LAN come `buonapp.local:3003`. Fino alla 5.0.0 era rimasto
alle funzioni di FloCafe: una griglia di prodotti, una nota per riga, l'invio. Non sapeva fare
aggiuntivi, coperti, menu fisso, uscite, e non vedeva la sala. Tutto questo esisteva sul PC
centrale, e le finestre erano state scritte apposta con contratto props-dentro/callback-fuori per
essere montate qui senza toccarle (vedi [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md)).

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
- l'uscita di ogni piatto, spostabile con un tocco prima e dopo l'invio
  (`PATCH /orders/:id/items/:itemId/service-run`);
- **«Secondo: da scegliere»**, un pulsante a tutta larghezza sulla portata lasciata vuota di un menu
  già mandato: apre la stessa finestra del PC ristretta a quella portata e scrive con
  `PUT /orders/:id/menu-groups/:groupId/courses/:courseId`. Un piatto che la cucina ha già preso
  in mano non si scavalca: 409 `course_in_progress`, e il messaggio lo dice;
- in fondo, fissi, **Invia in cucina (n)** se c'è un giro pendente e **Aggiungi piatti** (o **Prendi
  ordine** su un tavolo libero), che porta in Ordina con il carrello agganciato a quel tavolo.

**Ordina.** In testa il tavolo e i coperti; poi ricerca, categorie come selettore a scorrimento,
griglia a due colonne. Il tocco su un piatto fa quello che fa sul PC: un menu fisso apre la finestra
delle portate (con "Un altro uguale"), un piatto che entra in una portata libera di un menu aperto —
nel carrello o già sul conto — chiede "compreso nel menu?", un piatto con aggiuntivi o a prezzo da
definire apre le sue opzioni. **Tutto il resto va dritto in comanda**, senza finestra
(`lib/product-options.ts`): un'acqua non ha niente da decidere, e una finestra per ogni piatto era
un tocco in più tutta la sera. La matita sul riquadro apre comunque nota e quantità. La comanda è
una barra fissa in basso che dice quanti piatti e quanto, e un tocco la apre a schermo intero: righe
da 48 px con il cestino, lo stepper e un pulsante con l'uscita corrente («2ª uscita») che apre la
griglia solo se va cambiata, perché il piatto la eredita già dalla categoria; un menu è una riga di
quantità uno coi piatti scelti sotto; per un ordine nuovo ci sono i coperti, che partono dalla
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
PATCH /orders/:id/guests  /orders/:id/items/:itemId/service-run
PUT   /orders/:id/menu-groups/:groupId/courses/:courseId
```

Il ruolo è controllato due volte: dal proxy, che ammette solo `server`, e dall'API principale
dietro ogni inoltro. `tests/server-app-server-role.test.ts` percorre tutta la lista, aperta e
chiusa.

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
| `OrdinaView.tsx`, `HandheldProductGrid.tsx`, `HandheldCart.tsx` | la presa comanda: menu e comanda sono due schermate sotto la stessa testata |
| `order-attempt.ts` | il tentativo di ordine nuovo persistito per il replay |

Montati così come sono, senza modifiche: `components/pos/AddonModal`, `FixedMenuPicker`,
`AttachToMenuModal`, `ServiceRunPicker` (sono costruiti su `components/ui/modal`, che sotto i 768 px
è un foglio dal basso e sopra una carta centrata), e le lib pure `cart-payload`, `cart-identity`,
`fixed-menu`, `service-runs`, `kot`, `product-options`, `status-styles`, `append-attempt`, più
`store/cart`. Le primitive di interfaccia (`Stepper`, `StatusBadge`, `SegmentedControl`,
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

## Che telefono ci vuole

Il palmare deve avere **Chrome o WebView Android 111 o più recente** (marzo 2023), cioè in pratica
un Android 8 o superiore con Chrome aggiornato; su iPhone Safari 16.4, su Firefox la 128. Non è una
scelta: è il pavimento di quello con cui la pagina è costruita, e sotto quella soglia non si degrada,
smette.

- **Il CSS.** Tailwind v4 avvolge tutto il foglio in `@layer` (Chrome 99) e scrive i colori in
  `oklch()` e `color-mix()` (Chrome 111); ci sono anche le unità `dvh` (Chrome 108). Un motore che
  non conosce `@layer` butta via l'intero foglio, non la singola regola.
- **Il bundle.** L'export di Next 16 esce con `?.`, `??` e soprattutto `??=` (Chrome 85). Non è
  transpilato più in basso e non lo si può chiedere: senza il CSS non si va comunque da nessuna parte.

Un palmare troppo vecchio — tipicamente quelli lasciati dagli installatori di altri gestionali anni
fa — apriva una pagina **bianca e muta**: il bundle muore sulla sintassi che non sa leggere, e
l'unica cosa che l'export disegna da fermo, la rotella di caricamento, resta senza stile e quindi
invisibile. Ora la pagina lo dice: `server-standalone/layout.tsx` porta in testa al `<body>` uno
script in ES5 puro che sonda i due motori e, se uno dei due non regge, sostituisce il corpo con un
avviso leggibile e il rimando alla pagina di verifica. Le sonde guardano
`String.prototype.replaceAll` (uscito con `??=`, Chrome 85) e `CSS.supports('color', 'oklch(...)')`,
non provano la sintassi con `new Function`: la CSP del `:3003` non ha `'unsafe-eval'`, la prova
fallirebbe su *tutti* i browser e l'avviso coprirebbe un'app che funziona.

**La verifica sul campo** sta in `frontend/public/browser-check.html`, servita così com'è (niente
build, niente transpilazione) su `http://<ip-del-pc>:3003/browser-check.html`. Dice versione di
Chrome e di Android, se il server risponde (`/api/health` via `XMLHttpRequest`), e riga per riga cosa
manca fra JavaScript e CSS. La sintassi la prova con uno `<script type="module">` inline: un motore
troppo vecchio non lo parsa e la bandiera resta giù, il che sotto CSP è l'unica prova onesta che
resta. Sopra `http://` verso un IP il contesto non è sicuro: `crypto.randomUUID` non esiste e il
service worker non si registra: è normale, l'app ha i suoi ripieghi e la pagina lo scrive.

## Cosa resta fuori

- Il carrello non è persistito: chiudere il browser a metà comanda la perde. `persist` su
  `useCartStore` toccherebbe il PC; se serve, dopo.
- Due camerieri sullo stesso menu: il `PUT` è ultimo-che-scrive-vince, come già documentato.
- Il totale stimato nel carrello non include il coperto, come sul PC: lo calcola il backend dai
  coperti. La riga informativa sotto il contatore dice quanto costa a testa.

## Verifica

`npm run test:server-app-server-role` per il proxy; `test:orders-authz`, `test:security`,
`test:issue-255-append`, `test:authz-phase3`, `test:fixed-menu`, `test:service-runs` per la caduta
del vincolo di proprietà; `npm run lint`, `npm run build`, `npm run build:frontend`,
`npm run i18n:check`, `npm run test:rtl-kds-server-whatsapp` per il frontend (i file del palmare
stanno nella lista dei file che devono usare solo utilità logiche). Lo spec Playwright
`frontend/e2e/i18n-batch-5d.spec.ts` percorre login, sala, scheda tavolo e finestra aggiuntivi in
inglese e in persiano; il fixture `tests/e2e-server.cjs` semina un piatto con aggiuntivi («E2E
Tea») perché il tocco su un piatto senza opzioni non apre più nessuna finestra.
