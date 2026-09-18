# 5 Minuti

**5 Minuti** è un mystery/thriller sci-fi web in italiano basato su loop temporali da cinque minuti.

> Hai cinque minuti. La città si resetta. Tu ricordi.

Il giocatore esplora una piccola città italiana tra le **23:55** e le **00:00**, osserva routine, raccoglie indizi e usa ciò che ha imparato nei loop precedenti per modificare gli eventi.

La V1 sarà un vertical slice giocabile con gli Atti 1–3, non la campagna completa.

## Stato del progetto

**Milestone 11 — Testing tecnico finale V1.**

Il vertical slice narrativo V1 è giocabile dall'Atto 1 all'Atto 3. Audio e motion sono presentazione opzionale: il gioco resta completo con entrambi i volumi a zero, autoplay bloccato o movimento ridotto. La modalità guest resta interamente locale e offline; un account Google opzionale può sincronizzare la stessa copia locale tramite Supabase. Il cloud opera in modalità best-effort e non è mai una dipendenza del gameplay.

La verifica tecnica M11 copre i flussi Atti 1–3, reset, migrazioni v1–v5, input rapido, accessibilità strutturale e una matrice responsive Chromium. Il gameplay V1 include inoltre tre Anomalie opzionali e data-driven. Il protocollo UX è pronto, ma i test con partecipanti reali non sono ancora stati eseguiti. La V1 non è dichiarata pronta al rilascio: OAuth, RLS e sync live richiedono configurazione esterna e restano le verifiche UX/manuali indicate nella checklist locale.

## Stack

- Next.js 16 con App Router (Webpack per la build di produzione)
- React 19
- TypeScript strict
- Tailwind CSS 4
- Biome per linting e formattazione
- Vitest e React Testing Library per i test
- Node.js 22 e npm 10

## Avvio locale

Requisiti: Node.js 22 e npm 10.

```bash
git clone https://github.com/codeloris/5minuti.git
cd 5minuti
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

La modalità guest non richiede variabili d'ambiente. Per abilitare account e cloud, copia `.env.example` in `.env.local` e configura soltanto le due variabili pubbliche documentate.

Il salvataggio guest usa `localStorage`, non contiene dati sensibili ed è indipendente da autenticazione e servizi cloud. Durante il gameplay vengono salvati snapshot coalescenti ogni cinque secondi e snapshot immediati per azioni, navigazione, reset e uscita dalla route; non viene effettuata una scrittura a ogni refresh della UI.

## Policy temporale

- Il loop dura esattamente 300 secondi: `23:55:00 → 00:00:00`.
- Un unico clock deriva il tempo da un anchor millisecondico e dal timestamp corrente. Il refresh React richiede soltanto una nuova lettura e non incrementa o decrementa il tempo.
- La tab in background non mette in pausa il gioco. Al ritorno vengono recuperati tempo ed eventi attraversati.
- Uscendo volontariamente da `/gioca`, il tempo corrente viene salvato e il clock viene sospeso.
- Al rientro o dopo un reload viene creato un nuovo anchor dallo snapshot salvato. Non viene simulata progressione offline fuori dalla route gameplay.
- Lo scheduler usa esclusivamente secondi trascorsi dall'inizio del loop: `0 = 23:55:00`, `300 = 00:00:00`. Gli eventi vengono processati nell'intervallo `(precedente, corrente]`.
- La topologia è centrata sulla Piazza: Farmacia 15 s, Stazione 20 s e Vicolo 12 s. Le route inverse hanno lo stesso costo; i nodi periferici non sono collegati direttamente.
- Il blackout avviene al secondo trascorso 180 (`23:58:00`) anche fuori scena o con la scheda in background. I world flag della città sono relativi al loop e vengono puliti dal reset.
- Le routine NPC sono dati dichiarativi risolti da selettori puri. Una perturbazione può scegliere una variante tramite run flag senza modificare clock o scheduler.
- I costi M5 sono dati di balancing: Esplora 7–8 s, Osserva 5 s, Parla 10 s, Segui 15 s e Usa 3 s. Ogni costo passa dal core loop autorevole.
- Knowledge e indizi sono progressioni distinte e persistenti. Lo schema save v2 aggiunge `discoveredClues`; i salvataggi v1 vengono migrati automaticamente.
- Le persistenze sono distinte dalla knowledge: descrivono alterazioni residue del mondo o delle relazioni, non ciò che il protagonista sa. Sono definite come contenuti data-driven e applicate al nuovo baseline dopo il reset.
- `remainingLoops` include il loop corrente. Una persistenza con valore `2` vive nel loop di creazione e nel successivo, poi viene rimossa al reset seguente. L'assenza del campo indica una persistenza senza scadenza.
- I save usano lo schema v5. La migrazione conserva la catena v1 → v2 → v3 → v4 → v5: v4 aggiunge persone e luoghi scoperti, mentre v5 introduce i volumi Atmosfera/Effetti con default moderati. Per i save precedenti la ricostruzione è conservativa: vengono inferiti soltanto incontri e visite dimostrati da dati persistenti, quindi alcuni elementi osservati in passato possono comparire soltanto dopo una nuova visita.

## Policy degli Atti V1

- Gli Atti 1–3 sono definiti in `game/content/acts` e valutati da funzioni pure. La UI mostra titolo, domanda e scoperte reali, mai condizioni mancanti o checklist-soluzione.
- Può essere completato un solo Atto principale per giorno reale. Dopo una completion, il giocatore può continuare a esplorare e cercare segreti; l'Atto successivo diventa disponibile dal giorno locale seguente.
- Il gate usa la data locale del dispositivo nel formato `YYYY-MM-DD`. Il giorno successivo viene calcolato come giorno di calendario, senza aggiungere 24 ore in millisecondi, così i cambi DST non alterano la regola.
- La V1 non possiede ancora un tempo autorevole cloud: il gate è quindi client-local. Una futura sincronizzazione account dovrà renderlo server-aware senza cambiare i contratti dell'Act engine.
- Se un Atto resta incompleto, rimane attivo senza streak o penalità anche dopo più giorni. Dopo l'Atto 3 non viene creato o attivato alcun Atto 4.
- Il seminterrato è una subscene resettabile della Farmacia: non modifica la topologia a quattro nodi.
- Sono presenti esattamente tre segreti ambientali opzionali, uno sbloccato dopo ciascun Atto. Non sono richiesti alla storia e il totale complessivo non viene mostrato.

## Anomalie V1

- Le Anomalie sono tre contenuti data-driven di tipo daily, provoked e rare, scopribili soltanto nell'esplorazione post-Atto tramite normali azioni di gioco.
- Sono osservazioni opzionali e prive di spiegazione: non completano Atti, non sbloccano la storia e restano separate da knowledge, indizi, segreti e persistenze.
- La discovery viene registrata in modo idempotente in `discoveredAnomalies`, sopravvive a reset e save/load ed è inclusa nel merge cloud monotonic già esistente.
- L'Archivio mostra soltanto titolo, descrizione e luogo delle Anomalie realmente osservate, senza categorie tecniche, placeholder o totale complessivo.
- L'Anomalia rara usa una condizione deterministica e testabile interna al motore; il trigger esatto non viene anticipato nell'interfaccia.

## Policy dell'Archivio

- L'Archivio è un view model derivato dal `GameState`, non una copia della progressione e non una wiki del contenuto.
- Un elemento non scoperto non compare: non vengono mostrati placeholder, percentuali o totali che possano anticipare contenuti futuri.
- Persone e luoghi vengono registrati in modo idempotente soltanto quando sono realmente osservati o raggiunti. Il seminterrato resta una sottoscena della Farmacia.
- Le schede progressive usano knowledge, indizi, Atti completati, persistenze e segreti già presenti come fonti autorevoli.
- Durante `/archivio` non viene creato alcun clock: il gameplay riprende dallo snapshot salvato all'uscita da `/gioca`.
- La sezione Anomalie deriva le definizioni realmente scoperte da `discoveredAnomalies`; gli ID ignoti non producono schede né anticipazioni.

## Account e sincronizzazione

- Il salvataggio è **local-first**: ogni scrittura completa prima `LocalSaveAdapter`. Errori di rete o sessioni scadute non bloccano il gameplay e non effettuano rollback.
- Il cloud è una copia best-effort. Le scritture locali vengono aggregate in finestre di 30 secondi; login, risoluzione conflitti, reset account e “Sincronizza ora” producono una sincronizzazione esplicita.
- Al primo login, un guest save con cloud vuoto viene copiato senza modificarlo. Se esiste solo il cloud, viene importato in locale.
- Se esistono progressi diversi in entrambe le copie, nessuna viene sovrascritta silenziosamente: il giocatore può unirle, mantenere il dispositivo o usare il cloud. Le ultime due opzioni richiedono conferma.
- Se locale e cloud condividono lo stesso identificatore di partita guest, il coordinator usa la revision interna della stessa linea per riprendere automaticamente la copia più recente. Revision uguali ma contenuti divergenti, o una partita locale distinta, richiedono il flusso di conflitto.
- Il merge unisce e deduplica soltanto la progressione monotona: Atti completati, knowledge, indizi, segreti, anomalie, persone e luoghi. `RunState`, world flags e persistenze provengono atomicamente dalla snapshot narrativamente più avanzata; a parità viene preferita quella più recente, con il dispositivo corrente come ultimo tie-break. Le impostazioni restano quelle locali.
- Gli Atti vengono normalizzati nell’intervallo 1–3 e riconciliati con il gate giornaliero. Non può essere creato un Atto 4.
- Ogni update cloud usa optimistic concurrency sulla `revision`. Un conflitto ricarica la versione corrente, esegue un solo merge/retry e, in caso di ulteriore errore, lascia intatto il save locale.
- Logout e scadenza sessione non cancellano il salvataggio locale. Un reset autenticato crea uno stato iniziale locale e tenta di sostituire anche il cloud; se il cloud fallisce, un login successivo genera un conflitto invece di ripristinare silenziosamente i vecchi progressi.
- Sessione, identità, revision cloud e stato sync restano fuori dal `GameState`, ora allo schema v5 per le sole preferenze audio. Token OAuth e provider token non vengono salvati dal gioco.

## Audio e accessibilità

- Il layer `src/audio` centralizza due loop ambientali e gli effetti one-shot. Il clock non importa né conosce l’audio.
- Il browser sblocca l’audio soltanto dopo la prima interazione valida. Un rifiuto di `play()`, un asset non disponibile o il volume zero non generano errori applicativi e non fermano il gioco.
- Pioggia e città sono attive soltanto in `/gioca` e vengono sospese quando la pagina è nascosta o quando si lascia la route.
- I cue del timer derivano dal clock autorevole: uno attraversando i 30 secondi e uno, più evidente, attraversando i 10. Un recupero dalla background tab produce al massimo il cue della soglia più urgente.
- Knowledge, indizi, persistenze, segreti e anomalie condividono un feedback sonoro discreto, attivato soltanto dall’evento di nuova scoperta. Il reset usa un cue separato e non aspetta che termini.
- `/impostazioni` salva Atmosfera, Effetti, sottotitoli e riduzione del movimento nel LocalSave. Durante il merge cloud le impostazioni restano quelle del dispositivo corrente.
- Il movimento effettivamente ridotto è l’OR tra `prefers-reduced-motion` e la preferenza interna. Flash, transizioni e feedback usano una variante minima; il contenuto non cambia.
- Le scene dell’intro includono caption testuali essenziali, indipendenti dai volumi. Il timer non usa `aria-live` ogni secondo e comunica l’urgenza anche con testo.

I cinque WAV in `public/audio` sono asset V1 originali e procedurali, senza materiale o licenze di terzi. Sono riproducibili con `node scripts/generate-audio-assets.mjs`; vengono generati a 22.05 kHz, mono, PCM 16-bit per mantenere dimensioni contenute e compatibilità browser.

## Supabase / Google Auth setup

La modalità guest funziona anche se questa configurazione non viene eseguita.

1. Crea o seleziona un progetto Supabase.
2. Dal pannello **Connect/API keys**, recupera Project URL e Publishable Key.
3. Copia `.env.example` in `.env.local` e imposta `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Applica `supabase/migrations/202609160001_create_game_saves.sql` tramite Supabase CLI o SQL Editor.
5. Verifica che la tabella `game_saves` abbia RLS attivo e policy separate SELECT/INSERT/UPDATE basate su `auth.uid() = user_id`.
6. In Google Auth Platform crea credenziali OAuth Web e configura audience, branding e gli scope `openid`, email e profilo.
7. Nel provider Google di Supabase inserisci Client ID e Client Secret. Il secret resta esclusivamente nell’infrastruttura Supabase e non in questo repository.
8. Nella allow list Supabase aggiungi `http://localhost:3000/auth/callback` per lo sviluppo.
9. Aggiungi anche `https://<dominio-produzione>/auth/callback` quando esisterà il dominio definitivo e imposta il Site URL corretto.
10. Avvia l’app e verifica login, callback, creazione della riga cloud, refresh sessione, sincronizzazione e logout.

Il codice applicativo è completo, ma OAuth, RLS e sincronizzazione live richiedono un progetto Supabase e credenziali Google configurati esternamente. Non usare mai secret key, `service_role` o Google Client Secret nel browser.

## Script

```bash
npm run dev           # server di sviluppo
npm run build         # build di produzione
npm run start         # avvio della build di produzione
npm run lint          # lint, formato e import con Biome
npm run format        # applica la formattazione
npm run format:check  # verifica la formattazione senza modifiche
npm run typecheck     # controllo TypeScript
npm run test          # test in modalità non interattiva
npm run test:watch    # test in modalità watch
```

## Struttura

```text
src/
  audio/               controller, cue e provider audio centralizzato
  app/                 routing e pagine Next.js
  components/
    archive/           UI dell'Archivio
    game/              menu, intro, timer, reset e shell gameplay
    ui/                AppShell, pulsanti, pannelli e icone
  game/
    archive/           metadata, discovery tracking e view model anti-spoiler
    cloud/             adapter cloud tipizzato e validazione record Supabase
    engine/            clock, scheduler, Atti, anomalie, interazioni, condizioni, effetti e persistenze
    sync/               merge puro, conflitti e coordinator local-first
    content/           Atti, anomalie, città, routine, dialoghi, knowledge, indizi, segreti e persistenze
    state/             tipi, factory, selettori e transizioni pure
    persistence/       adapter locale, validazione e migrazioni
  lib/                 utility generiche
    supabase/           client browser/server e configurazione centralizzata
  styles/              design token globali
  test/                setup e test condivisi

public/
  images/
  audio/

scripts/
  generate-audio-assets.mjs
```

La migration SQL versionata si trova in `supabase/migrations/`. Il callback OAuth è `src/app/auth/callback/route.ts`; `proxy.ts` aggiorna i cookie di sessione secondo il pattern SSR corrente.

I documenti interni di roadmap, specifica e canon narrativo contengono dettagli di produzione e spoiler. Restano disponibili nell'ambiente di sviluppo locale, ma sono intenzionalmente esclusi dal repository pubblico.

## Principi di sviluppo

1. Il timer avrà una sola fonte autorevole.
2. Gli NPC non aspetteranno il giocatore e gli eventi potranno avvenire off-screen.
3. Conoscenze e persistenze saranno sistemi separati.
4. Gli Atti saranno data-driven.
5. La storia principale non potrà essere bloccata irreversibilmente.
6. Mobile è una piattaforma primaria.
7. Ogni milestone deve essere verificabile.

## Licenza

Da definire.

Copyright © progetto **5 Minuti**.
