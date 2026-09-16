import type { LocationNode } from "@/game/engine/navigation";

// Minimal infrastructure fixture for M3. The V1 city graph belongs to M4.
export const CORE_LOCATION_FIXTURE: LocationNode[] = [
  {
    id: "piazza",
    label: "Punto iniziale",
    connections: [
      {
        destinationId: "nodo-tecnico",
        travelSeconds: 12,
      },
    ],
  },
  {
    id: "nodo-tecnico",
    label: "Nodo adiacente",
    connections: [
      {
        destinationId: "piazza",
        travelSeconds: 12,
      },
    ],
  },
];
