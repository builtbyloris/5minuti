import { describe, expect, it } from "vitest";
import {
  type CloudSaveRepository,
  RepositoryCloudSaveAdapter,
} from "@/game/cloud/supabase-cloud-save";
import { CloudSaveError, type CloudSaveRow } from "@/game/cloud/types";
import { createInitialGameState } from "@/game/state/initial-state";

class FakeRepository implements CloudSaveRepository {
  row: CloudSaveRow | null = null;
  fail = false;
  expectedRevision: number | null = null;

  async load() {
    if (this.fail) {
      throw new Error("offline");
    }
    return this.row;
  }

  async insert(input: Parameters<CloudSaveRepository["insert"]>[0]) {
    if (this.fail) {
      throw new Error("offline");
    }
    this.row = {
      ...input,
      updated_at: "2026-09-16T12:00:00.000Z",
    };
    return this.row;
  }

  async update(
    userId: string,
    expectedRevision: number,
    input: Parameters<CloudSaveRepository["update"]>[2],
  ) {
    if (this.fail) {
      throw new Error("offline");
    }
    this.expectedRevision = expectedRevision;
    if (
      !this.row ||
      this.row.user_id !== userId ||
      this.row.revision !== expectedRevision
    ) {
      return null;
    }
    this.row = {
      ...this.row,
      ...input,
      updated_at: "2026-09-16T12:05:00.000Z",
    };
    return this.row;
  }
}

function rowWith(gameState: unknown, revision = 1): CloudSaveRow {
  return {
    game_state: gameState,
    revision,
    schema_version:
      typeof gameState === "object" &&
      gameState !== null &&
      "schemaVersion" in gameState &&
      typeof gameState.schemaVersion === "number"
        ? gameState.schemaVersion
        : 4,
    updated_at: "2026-09-16T12:00:00.000Z",
    user_id: "user-1",
  };
}

describe("CloudSaveAdapter", () => {
  it("gestisce cloud assente, creazione e caricamento valido", async () => {
    const repository = new FakeRepository();
    const adapter = new RepositoryCloudSaveAdapter(
      repository,
      () => "2026-09-16",
    );
    const state = createInitialGameState({ id: "guest-local" });

    expect(await adapter.load("user-1")).toBeNull();
    const created = await adapter.create("user-1", state);
    expect(created.gameState).toEqual(state);
    expect(created.revision).toBe(1);
    expect((await adapter.load("user-1"))?.gameState).toEqual(state);
  });

  it("aggiorna soltanto con expected revision e rileva conflitti", async () => {
    const repository = new FakeRepository();
    const adapter = new RepositoryCloudSaveAdapter(repository);
    const state = createInitialGameState({ id: "guest-local" });
    repository.row = rowWith(state, 4);

    const updated = await adapter.update("user-1", state, 4);
    expect(repository.expectedRevision).toBe(4);
    expect(updated.revision).toBe(5);

    await expect(adapter.update("user-1", state, 4)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("rifiuta payload invalidi e versioni future senza modificarli", async () => {
    const repository = new FakeRepository();
    const adapter = new RepositoryCloudSaveAdapter(repository);
    repository.row = rowWith({ schemaVersion: 4 });

    await expect(adapter.load("user-1")).rejects.toMatchObject({
      code: "invalid-payload",
    });

    repository.row = rowWith({ schemaVersion: 99 });
    await expect(adapter.load("user-1")).rejects.toMatchObject({
      code: "future-schema",
    });
    expect(repository.row.game_state).toEqual({ schemaVersion: 99 });
  });

  it("mappa un errore di rete senza coinvolgere il save locale", async () => {
    const repository = new FakeRepository();
    repository.fail = true;
    const adapter = new RepositoryCloudSaveAdapter(repository);

    await expect(adapter.load("user-1")).rejects.toEqual(
      new CloudSaveError("network", "Cloud non disponibile."),
    );
  });
});
