import { GameButton } from "@/components/ui/game-button";
import { Panel } from "@/components/ui/panel";

type MainMenuProps = {
  primaryAction?: "continue" | "new";
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

export function MainMenu({ primaryAction = "new" }: MainMenuProps) {
  const primaryLabel =
    primaryAction === "continue" ? "Continua" : "Nuova partita";

  return (
    <Panel className="w-full max-w-md" eyebrow="Menu principale">
      <nav aria-label="Menu principale" className="space-y-3 p-4 sm:p-5">
        <GameButton href="/gioca" icon="play" variant="primary">
          {primaryLabel}
        </GameButton>

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
