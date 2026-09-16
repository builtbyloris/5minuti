import type { AuthSession, AuthStateListener } from "@/auth/types";

export interface AuthAdapter {
  readonly configured: boolean;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(listener: AuthStateListener): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

export class AuthUnavailableError extends Error {
  constructor() {
    super("La sincronizzazione cloud non è configurata.");
    this.name = "AuthUnavailableError";
  }
}
