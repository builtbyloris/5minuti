import { AppShell } from "./app-shell";
import { GameButton } from "./game-button";
import { Icon, type IconName } from "./icon";
import { Panel } from "./panel";

type PlaceholderPageProps = {
  description: string;
  eyebrow: string;
  icon: IconName;
  title: string;
};

export function PlaceholderPage({
  description,
  eyebrow,
  icon,
  title,
}: PlaceholderPageProps) {
  return (
    <AppShell>
      <main
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
        id="main-content"
      >
        <Panel className="w-full max-w-xl">
          <div className="px-6 py-8 sm:px-10 sm:py-12">
            <Icon className="text-accent-red-strong" name={icon} size={28} />
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-text-muted">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.1em] text-text-main sm:text-4xl">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
              {description}
            </p>
            <GameButton
              className="mt-8 sm:w-auto"
              href="/"
              icon="arrow-left"
              variant="quiet"
            >
              Torna al menu
            </GameButton>
          </div>
        </Panel>
      </main>
    </AppShell>
  );
}
