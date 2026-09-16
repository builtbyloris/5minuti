import type { ActivePersistence } from "@/game/engine/persistences";

type PersistenceListProps = {
  emptyMessage?: string;
  persistences: ActivePersistence[];
};

export function PersistenceList({
  emptyMessage = "Nessuna persistenza attiva.",
  persistences,
}: PersistenceListProps) {
  if (persistences.length === 0) {
    return <p className="persistence-list__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="persistence-list">
      {persistences.map(({ definition, state }) => (
        <li
          className={`persistence-list__item persistence-list__item--${definition.polarity}`}
          key={definition.id}
        >
          <div>
            <strong>{definition.title}</strong>
            <span>
              {definition.type === "physical" ? "Fisica" : "Relazionale"}
            </span>
          </div>
          <p>{definition.description}</p>
          {state.remainingLoops !== undefined ? (
            <small>
              {state.remainingLoops === 1
                ? "Ultimo loop attivo"
                : `${state.remainingLoops} loop residui, incluso quello corrente`}
            </small>
          ) : (
            <small>Stabile attraverso i reset</small>
          )}
        </li>
      ))}
    </ul>
  );
}
