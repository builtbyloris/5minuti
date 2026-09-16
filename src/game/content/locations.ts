import type { LocationNode } from "@/game/engine/navigation";
import type { GameState, LocationId } from "@/game/state/types";

export type CityLocation = LocationNode & {
  atmosphere: string;
  description: string;
  eventIds: string[];
  scene: "alley" | "pharmacy" | "square" | "station";
};

export const CITY_LOCATIONS: CityLocation[] = [
  {
    atmosphere:
      "Pioggia sui sampietrini. L'orologio comunale domina i portici.",
    connections: [
      { destinationId: "farmacia", travelSeconds: 15 },
      { destinationId: "stazione", travelSeconds: 20 },
      { destinationId: "vicolo", travelSeconds: 12 },
    ],
    description:
      "La piazza è quasi vuota. Le facciate trattengono l'eco della pioggia.",
    eventIds: [],
    id: "piazza",
    label: "Piazza",
    scene: "square",
  },
  {
    atmosphere: "Neon verde, vetro appannato e odore di disinfettante.",
    connections: [{ destinationId: "piazza", travelSeconds: 15 }],
    description:
      "La farmacia è ancora aperta. Dietro la vetrina, il banco nasconde il retrobottega.",
    eventIds: ["pharmacy-sign-flicker"],
    id: "farmacia",
    label: "Farmacia",
    scene: "pharmacy",
  },
  {
    atmosphere: "Lampade fredde, rotaie bagnate e altoparlanti distorti.",
    connections: [{ destinationId: "piazza", travelSeconds: 20 }],
    description:
      "La piccola stazione costeggia la città. Il binario sparisce nella nebbia.",
    eventIds: ["station-announcement", "station-train-passes"],
    id: "stazione",
    label: "Stazione",
    scene: "station",
  },
  {
    atmosphere:
      "Grondaie, muri stretti e una luce che non arriva fino in fondo.",
    connections: [{ destinationId: "piazza", travelSeconds: 12 }],
    description:
      "Il vicolo taglia dietro i portici. Da qui la piazza sembra molto più lontana.",
    eventIds: ["alley-shutter-slams"],
    id: "vicolo",
    label: "Vicolo",
    scene: "alley",
  },
];

export function getLocation(locationId: LocationId) {
  return CITY_LOCATIONS.find((location) => location.id === locationId);
}

export function getObservableDetails(state: GameState, location: CityLocation) {
  const details: string[] = [];

  if (state.world.flags.blackout) {
    details.push(
      "La corrente è saltata. Restano soltanto pioggia e luci d'emergenza.",
    );
  }

  if (
    location.id === "farmacia" &&
    state.world.flags["pharmacy-sign-flicker"]
  ) {
    details.push("L'insegna verde pulsa a intervalli irregolari.");
  }

  if (location.id === "stazione" && state.world.flags["station-announcement"]) {
    details.push("Un annuncio incompleto riecheggia dagli altoparlanti.");
  }

  if (location.id === "stazione" && state.world.flags["station-train-passes"]) {
    details.push(
      "Sulle rotaie resta la vibrazione di un treno appena passato.",
    );
  }

  if (location.id === "vicolo" && state.world.flags["alley-shutter-slams"]) {
    details.push("Una serranda oscilla ancora in fondo al vicolo.");
  }

  return details;
}
