"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AuthAdapter } from "@/auth/auth-adapter";
import { createAuthAdapter } from "@/auth/supabase-auth-adapter";
import type { AuthUser } from "@/auth/types";
import { createCloudSaveAdapter } from "@/game/cloud/supabase-cloud-save";
import { localSave } from "@/game/persistence/local-save";
import { createInitialGameState } from "@/game/state/initial-state";
import { SyncCoordinator } from "@/game/sync/sync-coordinator";
import type { ConflictResolution, SyncState } from "@/game/sync/types";

type AccountContextValue = {
  authConfigured: boolean;
  authError: string | null;
  authLoading: boolean;
  resolveConflict(resolution: ConflictResolution): Promise<void>;
  resetProgress(): Promise<boolean>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  syncNow(): Promise<void>;
  syncState: SyncState;
  user: AuthUser | null;
};

const GUEST_SYNC_STATE: SyncState = {
  conflict: null,
  lastSyncedAt: null,
  message: "Salvato su questo dispositivo",
  status: "guest",
};

const FALLBACK_ACCOUNT_CONTEXT: AccountContextValue = {
  authConfigured: false,
  authError: null,
  authLoading: false,
  resolveConflict: async () => undefined,
  resetProgress: async () => {
    await localSave.clear();
    return true;
  },
  signInWithGoogle: async () => undefined,
  signOut: async () => undefined,
  syncNow: async () => undefined,
  syncState: GUEST_SYNC_STATE,
  user: null,
};

const AccountContext = createContext<AccountContextValue>(
  FALLBACK_ACCOUNT_CONTEXT,
);

export function AccountProvider({
  adapter,
  children,
}: {
  adapter?: AuthAdapter;
  children: ReactNode;
}) {
  const authAdapter = useMemo(() => adapter ?? createAuthAdapter(), [adapter]);
  const coordinatorRef = useRef<SyncCoordinator | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(GUEST_SYNC_STATE);

  useEffect(() => {
    let active = true;
    authAdapter
      .getSession()
      .then((session) => {
        if (active) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAuthError("Sessione account non disponibile.");
          setAuthLoading(false);
        }
      });

    const unsubscribe = authAdapter.onAuthStateChange((session) => {
      if (active) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authAdapter]);

  useEffect(() => {
    coordinatorRef.current?.dispose();
    coordinatorRef.current = null;

    if (!user) {
      setSyncState(GUEST_SYNC_STATE);
      return;
    }

    const cloud = createCloudSaveAdapter();
    if (!cloud) {
      setSyncState({
        conflict: null,
        lastSyncedAt: null,
        message: "Salvato sul dispositivo — cloud non disponibile",
        status: "error",
      });
      return;
    }

    const coordinator = new SyncCoordinator({
      cloud,
      local: localSave,
      userId: user.id,
    });
    coordinatorRef.current = coordinator;
    const unsubscribe = coordinator.subscribe(setSyncState);
    void coordinator.initialize();

    return () => {
      unsubscribe();
      coordinator.dispose();
      if (coordinatorRef.current === coordinator) {
        coordinatorRef.current = null;
      }
    };
  }, [user]);

  async function signInWithGoogle() {
    setAuthError(null);
    try {
      await authAdapter.signInWithGoogle();
    } catch {
      setAuthError(
        authAdapter.configured
          ? "Non è stato possibile avviare l'accesso Google."
          : "La sincronizzazione cloud non è ancora configurata.",
      );
    }
  }

  async function signOut() {
    setAuthError(null);
    try {
      await authAdapter.signOut();
      setUser(null);
    } catch {
      setAuthError("Non è stato possibile uscire dall'account.");
    }
  }

  async function resetProgress() {
    if (!user || !coordinatorRef.current) {
      await localSave.clear();
      return true;
    }

    const initial = createInitialGameState();
    await coordinatorRef.current.resetEverywhere(initial);
    return coordinatorRef.current.state.status === "synced";
  }

  const value: AccountContextValue = {
    authConfigured: authAdapter.configured,
    authError,
    authLoading,
    resolveConflict: async (resolution) => {
      await coordinatorRef.current?.resolveConflict(resolution);
    },
    resetProgress,
    signInWithGoogle,
    signOut,
    syncNow: async () => {
      await coordinatorRef.current?.flush();
    },
    syncState,
    user,
  };

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
