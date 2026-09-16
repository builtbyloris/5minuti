import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileArchiveDiscoveries } from "@/game/archive/discoveries";
import type { CloudSaveAdapter } from "@/game/cloud/cloud-save-adapter";
import {
  CloudSaveError,
  type CloudSaveRecord,
  type CloudSaveRow,
} from "@/game/cloud/types";
import { syncActAvailability } from "@/game/engine/acts";
import { getLocalDateKey } from "@/game/engine/calendar";
import { reconcilePersistences } from "@/game/engine/persistences";
import {
  getSaveSchemaVersion,
  migrateSave,
} from "@/game/persistence/migrations";
import { GAME_STATE_SCHEMA_VERSION, type GameState } from "@/game/state/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CloudSaveRepository {
  insert(row: {
    game_state: GameState;
    revision: number;
    schema_version: number;
    user_id: string;
  }): Promise<CloudSaveRow>;
  load(userId: string): Promise<CloudSaveRow | null>;
  update(
    userId: string,
    expectedRevision: number,
    row: {
      game_state: GameState;
      revision: number;
      schema_version: number;
    },
  ): Promise<CloudSaveRow | null>;
}

function normalizeRemoteState(value: unknown, currentDateKey: string) {
  const version = getSaveSchemaVersion(value);
  if (version !== null && version > GAME_STATE_SCHEMA_VERSION) {
    throw new CloudSaveError(
      "future-schema",
      "Il salvataggio cloud usa una versione più recente.",
    );
  }

  const migrated = migrateSave(value);
  if (!migrated) {
    throw new CloudSaveError(
      "invalid-payload",
      "Il salvataggio cloud non è valido.",
    );
  }

  return syncActAvailability(
    reconcilePersistences(reconcileArchiveDiscoveries(migrated)),
    currentDateKey,
  );
}

export function parseCloudSaveRow(
  row: CloudSaveRow,
  currentDateKey = getLocalDateKey(),
): CloudSaveRecord {
  const payloadVersion = getSaveSchemaVersion(row.game_state);
  if (
    !Number.isInteger(row.revision) ||
    row.revision < 1 ||
    !Number.isInteger(row.schema_version) ||
    typeof row.updated_at !== "string" ||
    payloadVersion === null ||
    payloadVersion !== row.schema_version
  ) {
    throw new CloudSaveError(
      "invalid-payload",
      "Il record cloud non è valido.",
    );
  }

  const gameState = normalizeRemoteState(row.game_state, currentDateKey);
  return {
    gameState,
    revision: row.revision,
    schemaVersion: gameState.schemaVersion,
    updatedAt: row.updated_at,
  };
}

export class RepositoryCloudSaveAdapter implements CloudSaveAdapter {
  constructor(
    private readonly repository: CloudSaveRepository,
    private readonly currentDateKey = getLocalDateKey,
  ) {}

  async load(userId: string) {
    try {
      const row = await this.repository.load(userId);
      return row ? parseCloudSaveRow(row, this.currentDateKey()) : null;
    } catch (error) {
      if (error instanceof CloudSaveError) {
        throw error;
      }
      throw new CloudSaveError("network", "Cloud non disponibile.");
    }
  }

  async create(userId: string, state: GameState) {
    try {
      const row = await this.repository.insert({
        game_state: state,
        revision: 1,
        schema_version: state.schemaVersion,
        user_id: userId,
      });
      return parseCloudSaveRow(row, this.currentDateKey());
    } catch (error) {
      if (error instanceof CloudSaveError) {
        throw error;
      }
      throw new CloudSaveError("network", "Cloud non disponibile.");
    }
  }

  async update(userId: string, state: GameState, expectedRevision: number) {
    try {
      const row = await this.repository.update(userId, expectedRevision, {
        game_state: state,
        revision: expectedRevision + 1,
        schema_version: state.schemaVersion,
      });
      if (!row) {
        throw new CloudSaveError(
          "conflict",
          "Il salvataggio cloud è stato aggiornato altrove.",
        );
      }
      return parseCloudSaveRow(row, this.currentDateKey());
    } catch (error) {
      if (error instanceof CloudSaveError) {
        throw error;
      }
      throw new CloudSaveError("network", "Cloud non disponibile.");
    }
  }
}

class SupabaseCloudSaveRepository implements CloudSaveRepository {
  constructor(private readonly client: SupabaseClient) {}

  async load(userId: string) {
    const { data, error } = await this.client
      .from("game_saves")
      .select("user_id, game_state, schema_version, revision, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data as CloudSaveRow | null;
  }

  async insert(row: Parameters<CloudSaveRepository["insert"]>[0]) {
    const { data, error } = await this.client
      .from("game_saves")
      .insert(row)
      .select("user_id, game_state, schema_version, revision, updated_at")
      .single();
    if (error) {
      throw error;
    }
    return data as CloudSaveRow;
  }

  async update(
    userId: string,
    expectedRevision: number,
    row: Parameters<CloudSaveRepository["update"]>[2],
  ) {
    const { data, error } = await this.client
      .from("game_saves")
      .update(row)
      .eq("user_id", userId)
      .eq("revision", expectedRevision)
      .select("user_id, game_state, schema_version, revision, updated_at")
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data as CloudSaveRow | null;
  }
}

export function createCloudSaveAdapter() {
  const client = getSupabaseBrowserClient();
  return client
    ? new RepositoryCloudSaveAdapter(new SupabaseCloudSaveRepository(client))
    : null;
}
