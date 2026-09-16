import type { GameState, LocationId } from "@/game/state/types";

export type LocationConnection = {
  destinationId: LocationId;
  travelSeconds: number;
};

export type LocationNode = {
  connections: LocationConnection[];
  id: LocationId;
  label: string;
};

export type NavigationResult =
  | {
      costSeconds: number;
      ok: true;
      state: GameState;
    }
  | {
      ok: false;
      reason: "destination-not-found" | "not-connected" | "origin-not-found";
      state: GameState;
    };

export function navigateToNode(
  state: GameState,
  nodes: LocationNode[],
  destinationId: LocationId,
): NavigationResult {
  const origin = nodes.find((node) => node.id === state.run.currentLocationId);

  if (!origin) {
    return { ok: false, reason: "origin-not-found", state };
  }

  if (!nodes.some((node) => node.id === destinationId)) {
    return { ok: false, reason: "destination-not-found", state };
  }

  const connection = origin.connections.find(
    (candidate) => candidate.destinationId === destinationId,
  );

  if (!connection) {
    return { ok: false, reason: "not-connected", state };
  }

  return {
    costSeconds: Math.max(0, Math.floor(connection.travelSeconds)),
    ok: true,
    state: {
      ...state,
      run: {
        ...state.run,
        currentLocationId: destinationId,
      },
    },
  };
}
