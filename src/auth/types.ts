export type AuthUser = {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
};

export type AuthSession = {
  user: AuthUser;
};

export type AuthStateListener = (session: AuthSession | null) => void;
