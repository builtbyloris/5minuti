"use client";

import { useAccount } from "@/auth/auth-context";
import { ProfileBadge } from "@/components/account/profile-badge";
import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";

type MainMenuProps = {
  onPrimaryAction?: () => void;
  primaryAction?: "continue" | "new";
  primaryDisabled?: boolean;
  primaryLabel?: string;
};

export function MainMenu({
  onPrimaryAction,
  primaryAction = "new",
  primaryDisabled = false,
  primaryLabel,
}: MainMenuProps) {
  const { user } = useAccount();
  const resolvedPrimaryLabel =
    primaryLabel ??
    (primaryAction === "continue" ? "Continua" : "Nuova partita");
  const secondaryItems = [
    { href: "/storia", icon: "book" as const, label: "La Storia" },
    { href: "/archivio", icon: "archive" as const, label: "Archivio" },
    {
      href: "/login",
      icon: "login" as const,
      label: user ? "Account" : "Accedi con Google",
    },
    {
      href: "/impostazioni",
      icon: "settings" as const,
      label: "Impostazioni",
    },
  ];

  return (
    <Panel className="w-full max-w-md" eyebrow="Menu principale">
      <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
        <ProfileBadge />
      </div>
      <nav aria-label="Menu principale" className="space-y-3 p-4 sm:p-5">
        {onPrimaryAction ? (
          <GameButton
            className="text-xs tracking-[0.1em] sm:text-sm sm:tracking-[0.12em]"
            disabled={primaryDisabled}
            icon="play"
            nowrap
            onClick={onPrimaryAction}
            variant="primary"
          >
            {resolvedPrimaryLabel}
          </GameButton>
        ) : (
          <GameButton
            className="text-xs tracking-[0.1em] sm:text-sm sm:tracking-[0.12em]"
            href="/gioca"
            icon="play"
            nowrap
            variant="primary"
          >
            {resolvedPrimaryLabel}
          </GameButton>
        )}

        <div className="space-y-2 border-t border-border-subtle pt-3">
          {secondaryItems.map((item) => (
            <GameButton href={item.href} icon={item.icon} key={item.href}>
              {item.label}
            </GameButton>
          ))}
        </div>
      </nav>
    </Panel>
  );
}
