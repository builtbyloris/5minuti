import { SaveResetPanel } from "@/components/game/save-reset-panel";
import { AppShell } from "@/components/ui/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <main
        className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8"
        id="main-content"
      >
        <SaveResetPanel />
      </main>
    </AppShell>
  );
}
