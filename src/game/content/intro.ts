export type IntroScene = {
  body: string[];
  caption?: string;
  id: string;
  label: string;
  location: string;
  time: string;
  title: string;
  tone: "city" | "pharmacy" | "station" | "tower" | "reset";
};

export const INTRO_SCENES: IntroScene[] = [
  {
    id: "city-before",
    time: "23:54",
    location: "Centro città",
    label: "Prima di mezzanotte",
    title: "La pioggia copre quasi ogni rumore.",
    body: [
      "Una farmacia ancora accesa. La stazione oltre i portici. La torre immobile sopra i tetti.",
      "Il telefono vibra: «Sei ancora lì? Devi uscire dalla città prima di mezzanotte.»",
    ],
    caption: "[Pioggia sulla città.]",
    tone: "city",
  },
  {
    id: "elena",
    time: "23:55",
    location: "Via della Farmacia",
    label: "Una figura nella pioggia",
    title: "Elena attraversa la piazza senza fermarsi.",
    body: [
      "Tiene il cappotto chiuso con una mano e guarda più volte verso l'insegna verde della farmacia.",
      "Per un istante sembra riconoscerti. Poi prosegue.",
    ],
    caption: "[Pioggia.]",
    tone: "pharmacy",
  },
  {
    id: "red-man",
    time: "23:56",
    location: "Stazione",
    label: "Binario due",
    title: "Un uomo in rosso scende dal treno vuoto.",
    body: [
      "Evita la luce delle telecamere e si dirige verso il sottopasso.",
      "L'orologio della stazione perde un secondo. Nessuno sembra accorgersene.",
    ],
    caption: "[Un treno rallenta sui binari bagnati.]",
    tone: "station",
  },
  {
    id: "blackout",
    time: "23:58",
    location: "Quartiere nord",
    label: "Blackout parziale",
    title: "Mezza città si spegne.",
    body: [
      "La farmacia resta illuminata. La torre no.",
      "Dal sottosuolo arriva un colpo sordo, troppo profondo per essere un tuono.",
    ],
    caption: "[Un colpo sordo dal sottosuolo.]",
    tone: "pharmacy",
  },
  {
    id: "sirens",
    time: "23:59",
    location: "Torre civica",
    label: "Sessanta secondi",
    title: "Le sirene iniziano tutte insieme.",
    body: [
      "Qualcuno corre verso di te dalla piazza e prova a gridare qualcosa.",
      "Le campane della torre si muovono, ma non producono alcun suono.",
    ],
    caption: "[Sirene in lontananza.]",
    tone: "tower",
  },
  {
    id: "midnight",
    time: "00:00",
    location: "—",
    label: "Mezzanotte",
    title: "Un lampo bianco. Poi niente.",
    body: ["Silenzio.", "Buio.", "Un ticchettio ricomincia da capo."],
    caption: "[Silenzio. Poi un ticchettio.]",
    tone: "reset",
  },
  {
    id: "return",
    time: "23:55",
    location: "Piazza",
    label: "Di nuovo",
    title: "La pioggia cade nello stesso modo.",
    body: [
      "Lo stesso passante ripete la stessa frase, con la stessa esitazione.",
      "Questa volta, però, tu ricordi.",
    ],
    caption: "[La pioggia ricomincia.]",
    tone: "city",
  },
  {
    id: "title",
    time: "23:55",
    location: "Finestra temporale attiva",
    label: "Qualcosa oggi è cambiato",
    title: "5 MINUTI",
    body: ["Hai cinque minuti. La città si resetta. Tu ricordi."],
    tone: "reset",
  },
];
