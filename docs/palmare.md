# Il palmare

**Stato:** CURRENT. Deciso e fatto il 2026-09-15 sul branch `palmare`.

Il Server App è la pagina che i camerieri aprono sul telefono, servita sulla porta `:3003` da
`main/server-app.ts` e raggiungibile in LAN come `buonapp.local:3003`. Fino alla 5.0.0 era rimasto
alle funzioni di FloCafe: una griglia di prodotti, una nota per riga, l'invio. Non sapeva fare
aggiuntivi, coperti, menu fisso, uscite, e non vedeva la sala. Tutto questo esisteva sul PC
centrale, e le finestre erano state scritte apposta con contratto props-dentro/callback-fuori per
essere montate qui senza toccarle (vedi [coperto-e-menu-fisso.md](coperto-e-menu-fisso.md)).

## Cosa fa

Due schermate, e nient'altro.

**Sala.** Le stanze come schede, i tavoli come riquadri: colore dello stato, coperti, minuti da
quando il tavolo è stato aperto, il pallino arancione se c'è un giro ancora da mandare in cucina,
l'icona della catena se il tavolo è unito a un altro, il nome della prenotazione se è libero e
prenotato. È un elenco e non la mappa: su uno schermo da sei pollici una stanza in scala si riduce
a metà e scorre di lato, e al cameriere che sta in piedi accanto al tavolo non serve sapere dove
sta.

**La scheda del tavolo**, che si apre dal basso toccando un riquadro:

- l'ordine aperto con le righe raggruppate sotto il menu che le ha generate, lo stato di cucina di
  ogni piatto e il pallino del giro da mandare;
- i coperti, correggibili con `−`/`+` (`PATCH /orders/:id/guests`): il coperto sul conto si riprezza
  da solo;
- l'uscita di ogni piatto, spostabile con un tocco prima e dopo l'invio
  (`PATCH /orders/:id/items/:itemId/service-run`);
- **Completa il menu** sulla portata lasciata vuota di un menu già mandato: apre la stessa finestra
  del PC ristretta a quella portata e scrive con
  `PUT /orders/:id/menu-groups/:groupId/courses/:courseId`. Un piatto che la cucina ha già preso
  in mano non si scavalca: 409 `course_in_progress`, e il messaggio lo dice;
- **Aggiungi piatti**, che porta in Ordina con il carrello agganciato a quel tavolo;
- **Invia in cucina (n)** se c'è un giro pendente.

**Ordina.** Ricerca, categorie a scorrimento, griglia a due colonne; il carrello sta in un cassetto
dietro un pulsante che dice quante righe contiene. Il tocco su un piatto fa le stesse tre cose che fa
sul PC: un menu fisso apre la finestra delle portate (con "Un altro uguale"), un piatto che entra in
una portata libera di un menu aperto — nel carrello o già sul conto — chiede "compreso nel menu?",
tutto il resto apre gli aggiuntivi. Nel carrello ogni piatto ha la sua uscita, un menu è una riga di
quantità uno coi piatti scelti sotto, e per un ordine nuovo ci sono i coperti (con la riga
informativa del coperto, se la casa lo fa pagare) e le note.

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
| `SalaView.tsx`, `TableTile.tsx` | l'elenco per stanza |
| `TableSheet.tsx` | la scheda del tavolo |
| `OrdinaView.tsx`, `HandheldProductGrid.tsx`, `HandheldCart.tsx` | la presa comanda |
| `order-attempt.ts` | il tentativo di ordine nuovo persistito per il replay |

Montati così come sono, senza modifiche: `components/pos/AddonModal`, `FixedMenuPicker`,
`AttachToMenuModal`, `ServiceRunPicker`, e le lib pure `cart-payload`, `cart-identity`,
`fixed-menu`, `service-runs`, `kot`, `append-attempt`, più `store/cart`.

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
del vincolo di proprietà; `npm run lint`, `npm run build`, `npm run build:frontend`,
`npm run i18n:check`, `npm run test:rtl-kds-server-whatsapp` per il frontend (i file del palmare
stanno nella lista dei file che devono usare solo utilità logiche). Lo spec Playwright
`frontend/e2e/i18n-batch-5d.spec.ts` percorre login, sala, scheda tavolo e finestra aggiuntivi in
inglese e in persiano.
