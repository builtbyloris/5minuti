import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type AuthAdapter, AuthUnavailableError } from "@/auth/auth-adapter";
import type { AuthSession, AuthStateListener } from "@/auth/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function toAuthSession(user: User | null): AuthSession | null {
  if (!user) {
    return null;
  }

  const displayName = user.user_metadata.full_name;
  const avatarUrl = user.user_metadata.avatar_url;

  return {
    user: {
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
      displayName: typeof displayName === "string" ? displayName : null,
      email: user.email ?? null,
      id: user.id,
    },
  };
}

export class SupabaseAuthAdapter implements AuthAdapter {
  readonly configured: boolean;

  constructor(private readonly client: SupabaseClient | null) {
    this.configured = client !== null;
  }

  async getSession() {
    if (!this.client) {
      return null;
    }

    const { data, error } = await this.client.auth.getUser();
    if (error) {
      return null;
    }

    return toAuthSession(data.user);
  }

  onAuthStateChange(listener: AuthStateListener) {
    if (!this.client) {
      return () => undefined;
    }

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session?.user ?? null));
    });

    return () => data.subscription.unsubscribe();
  }

  async signInWithGoogle() {
    if (!this.client) {
      throw new AuthUnavailableError();
    }

    const { error } = await this.client.auth.signInWithOAuth({
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/login`,
      },
      provider: "google",
    });

    if (error) {
      throw new Error("Non è stato possibile avviare l'accesso Google.");
    }
  }

  async signOut() {
    if (!this.client) {
      return;
    }

    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error("Non è stato possibile terminare la sessione.");
    }
  }
}

export function createAuthAdapter() {
  return new SupabaseAuthAdapter(getSupabaseBrowserClient());
}
