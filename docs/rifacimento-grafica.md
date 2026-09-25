# Rifacimento grafico

**Stato:** CURRENT. Deciso e fatto il 2026-09-16/17 sul branch `rifacimento-grafica`, dopo
l'approvazione dei mockup da parte dell'utente.

Il passo precedente, [order-flow-and-navigation.md](order-flow-and-navigation.md), aveva sistemato
*dove stanno le cose*: cinque voci di navigazione, un ordine si chiude da un posto solo, la giornata
di servizio al posto della lista ordini. Restava aperto il rifacimento vero e proprio, e il motivo
per cui era rimasto indietro era giusto: ridipingere sopra un'architettura confusa non toglie la
confusione.

Questo documento dice cosa è cambiato nel *come si presentano* le due interfacce — il PC di cassa e
il palmare dei camerieri — e perché.

## Il vincolo che decide tutto

Il PC centrale è un **vecchio monitor touch di cassa**, usato quasi sempre col dito e ogni tanto col
mouse. Il palmare è un telefono. Da qui:

- bersagli **minimo 44 px**, **48** per un'azione, **56** per l'azione principale di una schermata;
- niente affordance che esistono solo al passaggio del mouse;
- meno testo per schermata, e lo stato scritto a parole oltre che colorato.

La finestra Electron non scende sotto 1024×768 (`main/index.ts`), quindi il PC non ha un layout da
telefono: il telefono ha la sua app.

**La finestra si misura sullo schermo che trova.** Chiedeva 1400×900 comunque, e una finestra non
viene ristretta allo schermo su cui nasce: su un monitor 1024×768 il renderer disegnava per 1400 px
e la cassa ne vedeva l'angolo in alto a sinistra — è quello che si vedeva come «tutto ingrandito e
tagliato ai bordi». Adesso `createWindow()` legge `workAreaSize` e non chiede mai più di quello che
c'è; sotto i 1400×900 parte massimizzata. Anche il minimo in altezza era un danno: 768 è più alto
dell'area di lavoro di uno schermo da 768 una volta che la barra delle applicazioni si prende la sua
striscia, quindi il fondo della finestra — la barra di stato, e la riga «Esci» della barra laterale —
stava sotto la barra delle applicazioni senza modo di risalire.

## Le fondamenta

**Colori di stato in un posto solo.** Libero, occupato, prenotato, in sospeso, «da inviare», pagato
e non pagato sono token in `frontend/src/app/globals.css` e una mappa sola in
`frontend/src/lib/status-styles.ts`. La mappa della sala sul PC, la tessera del palmare e la
pillola del pannello ordine leggono lo stesso colore; prima erano cinque copie della stessa idea,
d'accordo per fortuna. «In sospeso» è viola e non blu, per non somigliare al colore del marchio.

I colori di stato **non sono il colore dell'interfaccia**: si può cambiare il blu del marchio senza
toccarli, ed è quello che è stato scelto di fare (variante A dei mockup: il blu resta).

**Misure touch** come spaziature (`--spacing-touch`, `-lg`, `-xl`), così esistono `h-touch`,
`min-h-touch-lg`, `size-touch`.

**Livelli dichiarati** (`z-panel` 50, `z-modal` 60, `z-confirm` 70). Prima stavano tutti a 50 e
vinceva chi era montato dopo nel DOM: è il motivo per cui il palmare smontava il cassetto del tavolo
per far vedere la finestra del menu.

**Primitive nuove** in `frontend/src/components/ui/`:

| File | Cosa fa |
| --- | --- |
| `modal.tsx` | La finestra: foglio dal basso sotto i 768 px, carta centrata sopra. Su radix Dialog, quindi focus trap, Esc, blocco scroll e titolo annunciato — cose che le finestre `fixed inset-0` scritte a mano non avevano |
| `side-panel.tsx` | Il pannello che entra dal lato e lascia vedere la pagina: la scheda del tavolo, l'ordine scelto dalla Giornata |
| `page-header.tsx` | L'`<h1>` di ogni pagina, con sottotitolo, slot iniziale e azioni |
| `stepper.tsx` | `−  4  +` per coperti e quantità, in tre misure |
| `status-badge.tsx` | Pillola e puntino sui toni di `status-styles` |
| `segmented-control.tsx` | Una scelta fra poche, tutte visibili: stanze, filtri, schede. `scrollable` per le liste lunghe, `stretch` per una riga che occupa tutta la larghezza |
| `action-bar.tsx` | La riga di azioni fissa in fondo, con la safe area del telefono |
| `empty-state.tsx` | «Non c'è niente» detto per bene |

`components/layout/PageToolbar.tsx` mette insieme `PageHeader` e il pulsante che apre la barra
laterale, ed è quello che usano tutte le pagine del PC.

## Il palmare

Vedi [palmare.md](palmare.md) per il dettaglio. In breve:

- i tavoli sono in **ordine naturale** (Tav 2 prima di Tav 10, non dopo Tav 13);
- lo stato è detto due volte, con una banda colorata e con una pillola scritta;
- il badge arancione dice **quanti piatti** ci sono da mandare, non che ce n'è qualcuno;
- il tavolo è una **pagina** con la freccia indietro, non un cassetto senza chiusura;
- i piatti sono **righe** con la foto (o le iniziali), la matita e `−  n  +`, e la ricerca ha una
  «x» che la svuota; un piatto **senza aggiuntivi va in comanda con un tocco**, e un tocco sbagliato
  si toglie col `−` dalla stessa riga;
- la comanda è una **barra fissa in basso** che dice quanti piatti e quanto, e si apre a schermo
  intero;
- ha un manifest suo che parte dalla sala, e rispetta notch e indicatore di casa.

## Il PC

**La barra laterale** ha righe da 48 px e non contiene più «Comprimi»: quel pulsante era una voce di
menu che non portava da nessuna parte. Il toggle sta nell'intestazione di ogni pagina, dove dice
cosa fa. Stretta alle sole icone, ogni voce è la sua icona al centro, e il nome lo dice il tooltip.
Fino al 2026-09-24 l'icona stava di lato, e accanto spuntava metà della prima lettera del nome.

**L'intestazione è la stessa ovunque** (`PageToolbar`): toggle, titolo, azioni. Il titolo è la
stessa parola della voce di menu — la pagina della sala si intitolava «Tavoli» mentre la barra
diceva «Sala».

**Il chip della giornata** (`components/service-days/ServiceDayChip.tsx`, su
`hooks/useCurrentServiceDay.ts`) sta nell'intestazione: in Giornata con le cifre e il pulsante che
la chiude, in Sala in sola lettura. Ha preso il posto della scheda che occupava un quinto della
pagina Giornata.

**Sala.** Stanze come selettore, una legenda dei colori, tessere con banda di stato, etichetta
scritta e badge «N da inviare». Il pannello del tavolo è un `SidePanel` largo 672 px (`max-w-2xl`):
su uno schermo largo la sala resta visibile accanto, a 1024 px ne resta una striscia sotto
l'ombra — lì è una finestra, e vale la pena saperlo invece di prometterlo.

**Il pannello ordine** (`components/orders/OrderPanel.tsx`) tiene la sua logica e affida il disegno
a cinque pezzi: `OrderHeader`, `OrderLines`, `LineActionSheet`, `OrderTotals`, `OrderActionBar`.
Non è una divisione per il gusto di dividere: le tre iconcine da 16 px su ogni riga (cestino,
matita, storno) erano imprendibili col dito e indistinguibili a colpo d'occhio. Adesso **la riga si
tocca** e si apre un foglio con tutto quello che le si può fare — uscita, prezzo, elimina, storna.
Le quattro azioni della sala stanno fisse in fondo, e «Altro» tiene sconto, coperti, converti e
annulla, più quello che la scheda del tavolo aggiunge (modifica tavolo, separa).

**Ordina.** Il tavolo è la testata della comanda, con «Cambia» accanto: non è più un pulsante
arancione in cima alla pagina lontano da quello che descrive. Le tessere sono compatte (miniatura
piccola invece del quadrato con la foto), tre o quattro per riga secondo la larghezza — contate
sullo spazio che la griglia ha davvero, non sulla finestra, perché la comanda ne prende 320-384 px
e una colonna di troppo abbrevia ogni nome. Un piatto senza aggiuntivi va in comanda con un tocco,
come sul palmare.

**Giornata.** Le cifre del giorno nell'intestazione, i filtri come selettore, e gli ordini in
**elenco**: una riga dice tavolo, ora, stato, piatti da inviare, se è pagato e quanto. La riga apre
lo stesso pannello che apre la mappa della sala. Prima ogni ordine era un pannello intero con tutte
le sue azioni, in griglia: un muro.

**Menu, Archivio, Impostazioni** hanno preso l'intestazione comune e i bersagli più grandi; i corpi
delle schede impostazioni non sono stati toccati.

## Cosa resta fuori

- **La scheda prodotti**: chiede ancora SKU, codice a barre, prezzo di costo, giacenza. Campi da
  supermercato in un menu da ristorante, già segnalati come sessione a parte.
- **Il tema scuro**: i token `.dark` esistono in `globals.css` e nessuno li accende. È un lavoro a
  sé, non un ritocco.
- **Il KDS e la schermata cliente**: non toccati.
- **Le tessere della mappa restano legate alla scala della stanza.** `MIN_SCALE` era 0.45 e non
  manteneva la promessa scritta sopra di sé: una stanza media su un monitor da 1024 disegnava il
  tavolo da quattro a 74,8 px contro i 76 richiesti dalla seconda riga, e per 1,2 px spariva il
  conto in euro da ogni tavolo della sala. Ora è 0.7 e la mappa scorre dentro il suo riquadro
  (`overflow-auto`) invece di rimpicciolirsi o spingere il fondo della sala sotto la piega; un
  tavolo tondo chiede 96 px invece di 76, perché gli angoli del suo riquadro stanno fuori dal
  cerchio. Se un giorno servisse la garanzia di tessere grandi anche su una stanza enorme, la
  risposta onesta resta un elenco come quello del palmare, non un ritocco alla scala.

## Verifica

`npm run lint`, `npm run build:frontend`, `npm run i18n:check`, i quattro controlli RTL
(`test:rtl-foundation`, `test:rtl-dashboard-pos-common`, `test:rtl-kds-server-whatsapp`,
`test:rtl-setup-auth-settings`), `test:order-numbering-settings`, e l'insieme Playwright da
`frontend/` (`npx playwright test`). I file nuovi sono stati aggiunti alle liste dei controlli RTL,
che sono liste scritte a mano: un file di interfaccia nuovo va aggiunto lì o non viene controllato.
