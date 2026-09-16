import type { ReactNode } from "react";
import type { ArchiveCardEntry } from "@/game/archive/view-model";

type ArchiveCardProps = {
  entry: ArchiveCardEntry;
  metadata?: ReactNode;
  tone?: "blue" | "green" | "neutral" | "warm";
};

export function ArchiveCard({
  entry,
  metadata,
  tone = "neutral",
}: ArchiveCardProps) {
  return (
    <article className={`archive-card archive-card--${tone}`}>
      <header>
        <h3>{entry.title}</h3>
        {metadata ? <div className="archive-card__meta">{metadata}</div> : null}
      </header>
      <p>{entry.description}</p>
      {entry.facts.length > 0 ? (
        <ul aria-label={`Fatti registrati su ${entry.title}`}>
          {entry.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CharacterCard({ entry }: { entry: ArchiveCardEntry }) {
  return <ArchiveCard entry={entry} />;
}

export function LocationCard({ entry }: { entry: ArchiveCardEntry }) {
  return <ArchiveCard entry={entry} />;
}
