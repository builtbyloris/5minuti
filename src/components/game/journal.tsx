import { PersistenceList } from "@/components/game/persistence-list";
import type { ClueDefinition } from "@/game/content/clues";
import type { KnowledgeDefinition } from "@/game/content/knowledge";
import type { ActivePersistence } from "@/game/engine/persistences";

type JournalProps = {
  clues: ClueDefinition[];
  knowledge: KnowledgeDefinition[];
  persistences: ActivePersistence[];
};

export function Journal({ clues, knowledge, persistences }: JournalProps) {
  return (
    <details className="journal">
      <summary>
        <span>
          <small>Memoria investigativa</small>
          Diario
        </span>
        <span>
          <span aria-hidden="true">
            {knowledge.length + clues.length + persistences.length}
          </span>
          <span className="sr-only">
            {knowledge.length + clues.length + persistences.length} elementi
            scoperti
          </span>
        </span>
      </summary>
      <div className="journal__body">
        <section aria-labelledby="journal-knowledge">
          <h2 id="journal-knowledge">Conoscenze</h2>
          {knowledge.length > 0 ? (
            <ul>
              {knowledge.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.title}</strong>
                  <p>{entry.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="journal__empty">Nessuna conoscenza acquisita.</p>
          )}
        </section>
        <section aria-labelledby="journal-clues">
          <h2 id="journal-clues">Indizi</h2>
          {clues.length > 0 ? (
            <ul>
              {clues.map((clue) => (
                <li key={clue.id}>
                  <strong>{clue.title}</strong>
                  <p>{clue.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="journal__empty">Nessun indizio scoperto.</p>
          )}
        </section>
        <section aria-labelledby="journal-persistences">
          <h2 id="journal-persistences">Persistenze</h2>
          <PersistenceList
            emptyMessage="Nessuna traccia resiste ancora al reset."
            persistences={persistences}
          />
        </section>
      </div>
    </details>
  );
}
