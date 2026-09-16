import type { CloudSaveAdapter } from "@/game/cloud/cloud-save-adapter";
import { CloudSaveError, type CloudSaveRecord } from "@/game/cloud/types";
import type { LocalSaveListener } from "@/game/persistence/local-save";
import type { SaveAdapter } from "@/game/persistence/save-adapter";
import type { GameState } from "@/game/state/types";
import { mergeGameStates } from "@/game/sync/merge";
import type { ConflictResolution, SyncState } from "@/game/sync/types";

export interface SyncLocalSave extends SaveAdapter {
  subscribe(listener: LocalSaveListener): () => void;
}

type SyncCoordinatorOptions = {
  cloud: CloudSaveAdapter;
  coalesceMs?: number;
  local: SyncLocalSave;
  setTimer?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
  userId: string;
};

const INITIAL_STATE: SyncState = {
  conflict: null,
  lastSyncedAt: null,
  message: "Sincronizzazione…",
  status: "syncing",
};

export class SyncCoordinator {
  readonly #cloud: CloudSaveAdapter;
  readonly #coalesceMs: number;
  readonly #listeners = new Set<(state: SyncState) => void>();
  readonly #local: SyncLocalSave;
  readonly #setTimer: NonNullable<SyncCoordinatorOptions["setTimer"]>;
  readonly #unsubscribeLocal: () => void;
  readonly #userId: string;
  #cloudRecord: CloudSaveRecord | null = null;
  #disposed = false;
  #pendingState: GameState | null = null;
  #state = INITIAL_STATE;
  #suppressLocalEvent = false;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SyncCoordinatorOptions) {
    this.#cloud = options.cloud;
    this.#coalesceMs = options.coalesceMs ?? 30_000;
    this.#local = options.local;
    this.#setTimer = options.setTimer ?? setTimeout;
    this.#userId = options.userId;
    this.#unsubscribeLocal = this.#local.subscribe((state) => {
      if (!this.#suppressLocalEvent) {
        this.queue(state);
      }
    });
  }

  get state() {
    return this.#state;
  }

  subscribe(listener: (state: SyncState) => void) {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  async initialize() {
    this.#setState({ ...INITIAL_STATE });

    try {
      const [local, remote] = await Promise.all([
        this.#local.load(),
        this.#cloud.load(this.#userId),
      ]);
      this.#cloudRecord = remote;

      if (local && !remote) {
        this.#cloudRecord = await this.#cloud.create(this.#userId, local);
        this.#markSynced(this.#cloudRecord);
        return;
      }

      if (!local && remote) {
        await this.#saveLocalWithoutQueue(remote.gameState);
        this.#markSynced(remote);
        return;
      }

      if (!local && !remote) {
        this.#setState({
          conflict: null,
          lastSyncedAt: null,
          message: "Sincronizzato",
          status: "synced",
        });
        return;
      }

      if (
        local &&
        remote &&
        JSON.stringify(local) === JSON.stringify(remote.gameState)
      ) {
        this.#markSynced(remote);
        return;
      }

      if (local && remote && local.player.id === remote.gameState.player.id) {
        if (local.metadata.revision > remote.gameState.metadata.revision) {
          this.#cloudRecord = await this.#updateWithOneConflictRetry(
            local,
            remote,
          );
          this.#markSynced(this.#cloudRecord);
          return;
        }
        if (local.metadata.revision < remote.gameState.metadata.revision) {
          await this.#saveLocalWithoutQueue(remote.gameState);
          this.#markSynced(remote);
          return;
        }
      }

      if (local && remote) {
        this.#setState({
          conflict: { local, remote },
          lastSyncedAt: remote.updatedAt,
          message: "Scegli come riconciliare i progressi.",
          status: "conflict",
        });
      }
    } catch (error) {
      this.#setCloudError(error);
    }
  }

  queue(state: GameState) {
    if (this.#disposed || this.#state.status === "conflict") {
      return;
    }

    this.#pendingState = state;
    this.#setState({
      ...this.#state,
      conflict: null,
      message: "Salvato sul dispositivo — sincronizzazione in attesa",
      status: "pending",
    });
    if (!this.#timer) {
      this.#timer = this.#setTimer(() => {
        this.#timer = null;
        void this.flush();
      }, this.#coalesceMs);
    }
  }

  async flush() {
    const pending = this.#pendingState ?? (await this.#local.load());
    if (!pending || this.#disposed) {
      return;
    }

    this.#pendingState = pending;
    this.#setState({
      ...this.#state,
      message: "Sincronizzazione…",
      status: "syncing",
    });

    try {
      if (!this.#cloudRecord) {
        const existing = await this.#cloud.load(this.#userId);
        this.#cloudRecord = existing;
      }

      if (!this.#cloudRecord) {
        this.#cloudRecord = await this.#cloud.create(this.#userId, pending);
      } else {
        this.#cloudRecord = await this.#updateWithOneConflictRetry(
          pending,
          this.#cloudRecord,
        );
      }

      this.#pendingState = null;
      this.#markSynced(this.#cloudRecord);
    } catch (error) {
      this.#setCloudError(error);
    }
  }

  async resolveConflict(resolution: ConflictResolution) {
    const conflict = this.#state.conflict;
    if (!conflict) {
      return;
    }

    this.#setState({
      ...this.#state,
      message: "Sincronizzazione…",
      status: "syncing",
    });

    try {
      if (resolution === "cloud") {
        await this.#saveLocalWithoutQueue(conflict.remote.gameState);
        this.#cloudRecord = conflict.remote;
      } else {
        const state =
          resolution === "merge"
            ? mergeGameStates(conflict.local, conflict.remote.gameState).state
            : conflict.local;
        await this.#saveLocalWithoutQueue(state);
        this.#cloudRecord = await this.#cloud.update(
          this.#userId,
          state,
          conflict.remote.revision,
        );
      }

      this.#pendingState = null;
      this.#markSynced(this.#cloudRecord);
    } catch (error) {
      this.#setCloudError(error);
    }
  }

  async resetEverywhere(initialState: GameState) {
    await this.#saveLocalWithoutQueue(initialState);
    this.#pendingState = initialState;
    await this.flush();
  }

  dispose() {
    this.#disposed = true;
    this.#unsubscribeLocal();
    if (this.#timer) {
      clearTimeout(this.#timer);
    }
  }

  async #updateWithOneConflictRetry(
    state: GameState,
    expected: CloudSaveRecord,
  ) {
    try {
      return await this.#cloud.update(this.#userId, state, expected.revision);
    } catch (error) {
      if (!(error instanceof CloudSaveError) || error.code !== "conflict") {
        throw error;
      }

      const latest = await this.#cloud.load(this.#userId);
      if (!latest) {
        throw error;
      }
      const merged = mergeGameStates(state, latest.gameState).state;
      await this.#saveLocalWithoutQueue(merged);
      return this.#cloud.update(this.#userId, merged, latest.revision);
    }
  }

  async #saveLocalWithoutQueue(state: GameState) {
    this.#suppressLocalEvent = true;
    try {
      await this.#local.save(state);
    } finally {
      this.#suppressLocalEvent = false;
    }
  }

  #markSynced(record: CloudSaveRecord) {
    this.#setState({
      conflict: null,
      lastSyncedAt: record.updatedAt,
      message: "Sincronizzato",
      status: "synced",
    });
  }

  #setCloudError(error: unknown) {
    const futureSchema =
      error instanceof CloudSaveError && error.code === "future-schema";
    this.#setState({
      conflict: null,
      lastSyncedAt: this.#cloudRecord?.updatedAt ?? null,
      message: futureSchema
        ? "Salvato sul dispositivo — cloud creato con una versione più recente"
        : "Salvato sul dispositivo — cloud non disponibile",
      status: "error",
    });
  }

  #setState(state: SyncState) {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
