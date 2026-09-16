import { GameplaySession } from "@/components/game/gameplay-session";
import { AppShell } from "@/components/ui/app-shell";

export default function PlayPage() {
  return (
    <AppShell mode="menu">
      <GameplaySession />
    </AppShell>
  );
}
