import { syncActAvailability } from "@/game/engine/acts";
import { getLocalDateKey } from "@/game/engine/calendar";
import { reconcilePersistences } from "@/game/engine/persistences";
import {
  getSaveSchemaVersion,
  migrateSave,
} from "@/game/persistence/migrations";
import type { SaveAdapter } from "@/game/persistence/save-adapter";
import { validateGameState } from "@/game/persistence/save-schema";
import type { GameState } from "@/game/state/types";
import { GAME_STATE_SCHEMA_VERSION } from "@/game/state/types";

export const LOCAL_SAVE_KEY = "5minuti:guest-save";

export type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export class LocalSaveAdapter implements SaveAdapter {
  readonly #storage?: StorageLike;

  constructor(storage?: StorageLike) {
    this.#storage = storage;
  }

  async clear() {
    this.getStorage()?.removeItem(LOCAL_SAVE_KEY);
  }

  async load(currentDateKey = getLocalDateKey()) {
    const storage = this.getStorage();

    if (!storage) {
      return null;
    }

    try {
      const serialized = storage.getItem(LOCAL_SAVE_KEY);

      if (!serialized) {
        return null;
      }

      const parsed: unknown = JSON.parse(serialized);
      const state = migrateSave(parsed);
      const parsedVersion = getSaveSchemaVersion(parsed);

      if (
        !state &&
        parsedVersion !== null &&
        parsedVersion > GAME_STATE_SCHEMA_VERSION
      ) {
        return null;
      }

      if (!state) {
        storage.removeItem(LOCAL_SAVE_KEY);
      }

      if (!state) {
        return null;
      }

      const reconciled = syncActAvailability(
        reconcilePersistences(state),
        currentDateKey,
      );
      if (reconciled !== state) {
        storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(reconciled));
      }

      return reconciled;
    } catch {
      storage.removeItem(LOCAL_SAVE_KEY);
      return null;
    }
  }

  async save(state: GameState) {
    const storage = this.getStorage();

    if (!storage) {
      throw new Error("Il salvataggio locale non è disponibile.");
    }

    if (!validateGameState(state)) {
      throw new Error("Impossibile salvare uno stato di gioco non valido.");
    }

    storage.setItem(LOCAL_SAVE_KEY, JSON.stringify(state));
  }

  private getStorage() {
    if (this.#storage) {
      return this.#storage;
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}

export const localSave = new LocalSaveAdapter();
