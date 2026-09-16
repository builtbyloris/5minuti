# 5 Minuti

**5 Minuti** è un mystery/thriller sci-fi web in italiano basato su loop temporali da cinque minuti.

> Hai cinque minuti. La città si resetta. Tu ricordi.

Il giocatore esplora una piccola città italiana tra le **23:55** e le **00:00**, osserva routine, raccoglie indizi e usa ciò che ha imparato nei loop precedenti per modificare gli eventi.

La V1 sarà un vertical slice giocabile con gli Atti 1–3, non la campagna completa.

## Stato del progetto

**Milestone 5 — Interazioni, dialoghi e conoscenza.**

Il repository contiene lo scaffold tecnico, il design system, il menu principale responsive, l'introduzione narrativa, il game state guest e il core temporale realmente funzionante. La città V1 comprende Piazza, Farmacia, Stazione e Vicolo, con mappa accessibile, eventi temporali, blackout e routine deterministiche. Il giocatore può ora esplorare, osservare, parlare, seguire e usare elementi della scena; conoscenze e indizi persistono nel Diario e una conoscenza acquisita modifica un dialogo in un loop successivo.

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

La modalità guest non richiede variabili d'ambiente. Se in futuro saranno necessarie, copia `.env.example` in `.env.local` e valorizza soltanto le variabili documentate.

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
  app/                 routing e pagine Next.js
  components/
    archive/           UI dell'Archivio
    game/              menu, intro, timer, reset e shell gameplay
    ui/                AppShell, pulsanti, pannelli e icone
  game/
    engine/            clock, scheduler, interazioni, condizioni ed effetti
    content/           città, routine, dialoghi, knowledge e indizi data-driven
    state/             tipi, factory, selettori e transizioni pure
    persistence/       adapter locale, validazione e migrazioni
  lib/                 utility generiche
  styles/              design token globali
  test/                setup e test condivisi

public/
  images/
  audio/
```

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
