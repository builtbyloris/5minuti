"use client";

import { useAccount } from "@/auth/auth-context";

export function ProfileBadge() {
  const { authLoading, syncState, user } = useAccount();
  const label = authLoading
    ? "Profilo…"
    : user
      ? (user.displayName ?? user.email ?? "Account")
      : "Ospite";

  return (
    <div className="profile-badge" data-sync-status={syncState.status}>
      {user?.avatarUrl ? (
        // biome-ignore lint/performance/noImgElement: OAuth avatars are remote and have no configured image host.
        <img
          alt=""
          height="28"
          referrerPolicy="no-referrer"
          src={user.avatarUrl}
          width="28"
        />
      ) : (
        <span aria-hidden="true" className="profile-badge__mark" />
      )}
      <span>
        <strong>{label}</strong>
        <small>{syncState.message}</small>
      </span>
    </div>
  );
}
