import { MainMenu } from "@/components/game/main-menu";
import { AppShell } from "@/components/ui/app-shell";
import { Icon } from "@/components/ui/icon";

export default function Home() {
  return (
    <AppShell mode="menu">
      <main
        className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16 lg:px-12"
        id="main-content"
      >
        <section className="max-w-3xl pt-4 lg:pt-0">
          <div className="flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.26em] text-text-muted">
            <Icon className="text-accent-red-strong" name="clock" size={17} />
            <span>Finestra temporale attiva</span>
          </div>

          <time
            className="mt-5 block font-mono text-[clamp(4.5rem,18vw,9.5rem)] font-semibold leading-[0.82] tracking-[-0.075em] text-accent-red-strong [text-shadow:0_0_40px_rgba(217,59,59,0.22)]"
            dateTime="23:55"
          >
            23:55
          </time>

          <div className="mt-7 flex items-center gap-4">
            <span aria-hidden="true" className="h-px w-10 bg-accent-red" />
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-text-main sm:text-sm">
              Qualcosa oggi è cambiato.
            </p>
          </div>

          <h1 className="mt-9 font-display text-[clamp(3rem,11vw,6.5rem)] font-semibold uppercase leading-[0.82] tracking-[0.08em] text-text-main">
            5 Minuti
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-7 text-text-muted sm:text-xl sm:leading-8">
            <span className="block text-text-main">Hai cinque minuti.</span>
            <span className="block">La città si resetta.</span>
            <span className="block">Tu ricordi.</span>
          </p>
        </section>

        <div className="w-full justify-self-end pb-4 lg:pb-0">
          <MainMenu primaryAction="new" />
          <p className="mt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.18em] text-text-muted/70">
            Ogni scelta consuma tempo
          </p>
        </div>
      </main>
    </AppShell>
  );
}
