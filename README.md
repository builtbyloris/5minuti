# 5 Minuti

**5 Minuti** è un mystery/thriller sci-fi web in italiano basato su loop temporali da cinque minuti.

> Hai cinque minuti. La città si resetta. Tu ricordi.

Il giocatore esplora una piccola città italiana tra le **23:55** e le **00:00**, osserva routine, raccoglie indizi e usa ciò che ha imparato nei loop precedenti per modificare gli eventi.

La V1 sarà un vertical slice giocabile con gli Atti 1–3, non la campagna completa.

## Stato del progetto

**Milestone 2 — Introduzione e game state.**

Il repository contiene lo scaffold tecnico, il design system, il menu principale responsive, l'introduzione narrativa e il primo modello dati centrale. Le partite guest vengono validate e salvate localmente nel browser; gameplay, timer e sistemi narrativi interattivi restano intenzionalmente fuori da questa milestone.

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

La modalità guest e la Milestone 2 non richiedono variabili d'ambiente. Se in futuro saranno necessarie, copia `.env.example` in `.env.local` e valorizza soltanto le variabili documentate.

Il salvataggio guest usa `localStorage`, non contiene dati sensibili ed è indipendente da autenticazione e servizi cloud. Le scritture avvengono soltanto durante transizioni esplicite — creazione della partita e completamento dell'introduzione — quindi non è necessario un ciclo di autosave o debounce in questa milestone.

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
    game/              menu, intro e UI del flusso guest
    ui/                AppShell, pulsanti, pannelli e icone
  game/
    engine/            clock, scheduler e reducer
    content/           Atti e contenuti data-driven
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
