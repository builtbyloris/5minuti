import { IntroSequence } from "@/components/game/intro-sequence";
import { AppShell } from "@/components/ui/app-shell";

type StoryPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function StoryPage({ searchParams }: StoryPageProps) {
  const { mode } = await searchParams;

  return (
    <AppShell>
      <IntroSequence mode={mode === "new" ? "first-run" : "replay"} />
    </AppShell>
  );
}
