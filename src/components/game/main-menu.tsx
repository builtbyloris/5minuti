import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";

type MainMenuProps = {
  onPrimaryAction?: () => void;
  primaryAction?: "continue" | "new";
  primaryDisabled?: boolean;
  primaryLabel?: string;
};

const secondaryItems = [
  { href: "/storia", icon: "book" as const, label: "La Storia" },
  { href: "/archivio", icon: "archive" as const, label: "Archivio" },
  { href: "/login", icon: "login" as const, label: "Accedi con Google" },
  {
    href: "/impostazioni",
    icon: "settings" as const,
    label: "Impostazioni",
  },
];

export function MainMenu({
  onPrimaryAction,
  primaryAction = "new",
  primaryDisabled = false,
  primaryLabel,
}: MainMenuProps) {
  const resolvedPrimaryLabel =
    primaryLabel ??
    (primaryAction === "continue" ? "Continua" : "Nuova partita");

  return (
    <Panel className="w-full max-w-md" eyebrow="Menu principale">
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
