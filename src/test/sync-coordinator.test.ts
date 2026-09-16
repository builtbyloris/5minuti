import { describe, expect, it } from "vitest";
import type { CloudSaveAdapter } from "@/game/cloud/cloud-save-adapter";
import { CloudSaveError, type CloudSaveRecord } from "@/game/cloud/types";
import type { LocalSaveListener } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";
import type { GameState } from "@/game/state/types";
import { SyncCoordinator } from "@/game/sync/sync-coordinator";

class FakeLocalSave {
  listeners = new Set<LocalSaveListener>();
  state: GameState | null;

  constructor(state: GameState | null) {
    this.state = state;
  }

  async clear() {
    this.state = null;
  }

  async load() {
    return this.state;
  }

  async save(state: GameState) {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  subscribe(listener: LocalSaveListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class FakeCloudSave implements CloudSaveAdapter {
  record: CloudSaveRecord | null;
  fail = false;
  conflictWith: GameState | null = null;

  constructor(record: CloudSaveRecord | null) {
    this.record = record;
  }

  async load() {
    if (this.fail) {
      throw new CloudSaveError("network", "offline");
    }
    return this.record;
  }

  async create(_userId: string, state: GameState) {
    if (this.fail) {
      throw new CloudSaveError("network", "offline");
    }
    this.record = record(state, 1);
    return this.record;
  }

  async update(_userId: string, state: GameState, expectedRevision: number) {
    if (this.fail) {
      throw new CloudSaveError("network", "offline");
    }
    if (this.conflictWith) {
      this.record = record(this.conflictWith, expectedRevision + 1);
      this.conflictWith = null;
      throw new CloudSaveError("conflict", "changed elsewhere");
    }
    if (!this.record || this.record.revision !== expectedRevision) {
      throw new CloudSaveError("conflict", "revision mismatch");
    }
    this.record = record(state, expectedRevision + 1);
    return this.record;
  }
}

function record(gameState: GameState, revision: number): CloudSaveRecord {
  return {
    gameState,
    revision,
    schemaVersion: gameState.schemaVersion,
    updatedAt: `2026-09-16T12:${String(revision).padStart(2, "0")}:00.000Z`,
  };
}

function progressed(id = "guest") {
  const state = createInitialGameState({
    id,
    now: "2026-09-16T10:00:00.000Z",
  });
  return {
    ...state,
    progression: {
      ...state.progression,
      discoveredClues: ["pharmacy_wet_footprints"],
      knowledge: ["elena_enters_pharmacy_2357"],
    },
    run: { ...state.run, currentActId: 2, loopNumber: 4 },
  };
}

function coordinator(local: FakeLocalSave, cloud: FakeCloudSave) {
  return new SyncCoordinator({
    cloud,
    coalesceMs: 60_000,
    local,
    setTimer: () => undefined as unknown as ReturnType<typeof setTimeout>,
    userId: "user-1",
  });
}

describe("SyncCoordinator", () => {
  it("carica un guest save invariato nel cloud al primo login", async () => {
    const guest = progressed();
    const local = new FakeLocalSave(guest);
    const cloud = new FakeCloudSave(null);
    const sync = coordinator(local, cloud);

    await sync.initialize();

    expect(local.state).toEqual(guest);
    expect(cloud.record?.gameState).toEqual(guest);
    expect(sync.state.status).toBe("synced");
    sync.dispose();
  });

  it("importa il solo cloud in locale senza creare una nuova partita", async () => {
    const remote = progressed("remote-device");
    const local = new FakeLocalSave(null);
    const cloud = new FakeCloudSave(record(remote, 7));
    const sync = coordinator(local, cloud);

    await sync.initialize();

    expect(local.state).toEqual(remote);
    expect(sync.state.status).toBe("synced");
    sync.dispose();
  });

  it("espone conflitto e non sovrascrive silenziosamente local o cloud", async () => {
    const localState = progressed("local");
    const remoteState = {
      ...progressed("remote"),
      run: { ...progressed("remote").run, loopNumber: 8 },
    };
    const local = new FakeLocalSave(localState);
    const cloud = new FakeCloudSave(record(remoteState, 3));
    const sync = coordinator(local, cloud);

    await sync.initialize();

    expect(sync.state.status).toBe("conflict");
    expect(local.state).toEqual(localState);
    expect(cloud.record?.gameState).toEqual(remoteState);

    await sync.resolveConflict("merge");
    expect(sync.state.status).toBe("synced");
    expect(local.state?.progression.knowledge).toContain(
      "elena_enters_pharmacy_2357",
    );
    sync.dispose();
  });

  it("riprende automaticamente una linea di save già associata allo stesso dispositivo", async () => {
    const remote = progressed("same-lineage");
    const local = {
      ...remote,
      metadata: { ...remote.metadata, revision: remote.metadata.revision + 1 },
      progression: {
        ...remote.progression,
        knowledge: [...remote.progression.knowledge, "pharmacy_has_basement"],
      },
    };
    const localSave = new FakeLocalSave(local);
    const cloud = new FakeCloudSave(record(remote, 4));
    const sync = coordinator(localSave, cloud);

    await sync.initialize();

    expect(sync.state.status).toBe("synced");
    expect(cloud.record?.revision).toBe(5);
    expect(cloud.record?.gameState.progression.knowledge).toContain(
      "pharmacy_has_basement",
    );
    sync.dispose();
  });

  it("mantiene il progresso locale se il cloud fallisce", async () => {
    const initial = progressed();
    const local = new FakeLocalSave(initial);
    const cloud = new FakeCloudSave(record(initial, 2));
    const sync = coordinator(local, cloud);
    await sync.initialize();
    cloud.fail = true;
    const advanced = {
      ...initial,
      progression: {
        ...initial.progression,
        knowledge: [...initial.progression.knowledge, "pharmacy_has_basement"],
      },
    };

    await local.save(advanced);
    await sync.flush();

    expect(sync.state.status).toBe("error");
    expect(local.state?.progression.knowledge).toContain(
      "pharmacy_has_basement",
    );
    expect((await local.load())?.progression.knowledge).toContain(
      "pharmacy_has_basement",
    );
    sync.dispose();
  });

  it("ricarica, unisce e ritenta una sola volta dopo revision conflict", async () => {
    const initial = progressed();
    const local = new FakeLocalSave(initial);
    const cloud = new FakeCloudSave(record(initial, 10));
    const sync = coordinator(local, cloud);
    await sync.initialize();
    const localAdvanced = {
      ...initial,
      progression: {
        ...initial.progression,
        knowledge: [...initial.progression.knowledge, "pharmacy_has_basement"],
      },
    };
    const remoteAdvanced = {
      ...initial,
      progression: {
        ...initial.progression,
        discoveredSecrets: ["pharmacy_blank_receipt"],
      },
    };
    cloud.conflictWith = remoteAdvanced;

    await local.save(localAdvanced);
    await sync.flush();

    expect(sync.state.status).toBe("synced");
    expect(cloud.record?.revision).toBe(12);
    expect(local.state?.progression.knowledge).toContain(
      "pharmacy_has_basement",
    );
    expect(local.state?.progression.discoveredSecrets).toContain(
      "pharmacy_blank_receipt",
    );
    sync.dispose();
  });

  it("sincronizza il reset iniziale e non permette al vecchio cloud di riapparire", async () => {
    const old = progressed();
    const fresh = createInitialGameState({ id: "fresh" });
    const local = new FakeLocalSave(old);
    const cloud = new FakeCloudSave(record(old, 5));
    const sync = coordinator(local, cloud);
    await sync.initialize();

    await sync.resetEverywhere(fresh);

    expect(local.state).toEqual(fresh);
    expect(cloud.record?.gameState).toEqual(fresh);
    expect(cloud.record?.revision).toBe(6);
    sync.dispose();
  });
});
