import { PlayReady } from "@/components/game/play-ready";
import { AppShell } from "@/components/ui/app-shell";

export default function PlayPage() {
  return (
    <AppShell>
      <main
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
        id="main-content"
      >
        <PlayReady />
      </main>
    </AppShell>
  );
}
