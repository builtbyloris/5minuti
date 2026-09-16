"use client";

import { useRef, useState } from "react";
import type { ArchiveViewModel } from "@/game/archive/view-model";
import { ArchiveCard, CharacterCard, LocationCard } from "./archive-card";

const TABS = [
  { id: "acts", label: "Atti" },
  { id: "people", label: "Persone" },
  { id: "locations", label: "Luoghi" },
  { id: "clues", label: "Indizi" },
  { id: "persistences", label: "Persistenze" },
  { id: "secrets", label: "Segreti" },
  { id: "anomalies", label: "Anomalie" },
] as const;

type ArchiveTabId = (typeof TABS)[number]["id"];

const EMPTY_MESSAGES: Record<ArchiveTabId, string> = {
  acts: "Nessun Atto registrato.",
  anomalies: "Nessuna anomalia registrata.",
  clues: "Nessun indizio registrato.",
  locations: "Nessun luogo registrato.",
  people: "Nessuna persona registrata.",
  persistences: "Nessuna persistenza attiva.",
  secrets: "Nessun segreto registrato.",
};

type ArchiveTabsProps = {
  archive: ArchiveViewModel;
};

export function ArchiveTabs({ archive }: ArchiveTabsProps) {
  const [activeTab, setActiveTab] = useState<ArchiveTabId>("acts");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectByIndex(index: number) {
    const normalized = (index + TABS.length) % TABS.length;
    const tab = TABS[normalized];
    setActiveTab(tab.id);
    tabRefs.current[normalized]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectByIndex(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectByIndex(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectByIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectByIndex(TABS.length - 1);
    }
  }

  const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);

  return (
    <div className="archive-tabs">
      <div
        aria-label="Sezioni dell'Archivio"
        className="archive-tabs__list"
        role="tablist"
      >
        {TABS.map((tab, index) => (
          <button
            aria-controls={`archive-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className="archive-tabs__tab"
            id={`archive-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
          >
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {TABS.map((tab, index) => (
        <section
          aria-labelledby={`archive-tab-${tab.id}`}
          className="archive-tabs__panel"
          hidden={index !== activeIndex}
          id={`archive-panel-${tab.id}`}
          key={tab.id}
          role="tabpanel"
        >
          <ArchiveTabContent archive={archive} tab={tab.id} />
        </section>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: ArchiveTabId }) {
  return <p className="archive-empty">{EMPTY_MESSAGES[tab]}</p>;
}

function ArchiveTabContent({
  archive,
  tab,
}: {
  archive: ArchiveViewModel;
  tab: ArchiveTabId;
}) {
  if (tab === "acts") {
    return archive.acts.length > 0 ? (
      <div className="archive-card-list">
        {archive.acts.map((act) => (
          <article className="archive-act" key={act.id}>
            <header>
              <p>Atto {act.id}</p>
              <span>{act.status}</span>
            </header>
            <h3>{act.title}</h3>
            <blockquote>{act.question}</blockquote>
            {act.revelation ? (
              <div className="archive-act__resolution">
                <p>{act.revelation}</p>
                <small>{act.hook}</small>
              </div>
            ) : null}
          </article>
        ))}
        {archive.isV1Complete ? (
          <p className="archive-finale">Fine della V1</p>
        ) : null}
      </div>
    ) : (
      <EmptyState tab={tab} />
    );
  }

  if (tab === "people") {
    return archive.people.length > 0 ? (
      <div className="archive-card-list">
        {archive.people.map((entry) => (
          <CharacterCard entry={entry} key={entry.id} />
        ))}
      </div>
    ) : (
      <EmptyState tab={tab} />
    );
  }

  if (tab === "locations") {
    return archive.locations.length > 0 ? (
      <div className="archive-card-list">
        {archive.locations.map((entry) => (
          <LocationCard entry={entry} key={entry.id} />
        ))}
      </div>
    ) : (
      <EmptyState tab={tab} />
    );
  }

  if (tab === "clues") {
    const entries = archive.clues;
    return entries.length > 0 ? (
      <div className="archive-card-list">
        {entries.map((entry) => (
          <ArchiveCard entry={entry} key={entry.id} />
        ))}
      </div>
    ) : (
      <EmptyState tab={tab} />
    );
  }

  if (tab === "persistences") {
    return archive.persistences.length > 0 ? (
      <div className="archive-card-list">
        {archive.persistences.map((entry) => (
          <ArchiveCard
            entry={entry}
            key={entry.id}
            metadata={
              <>
                <span>{entry.type}</span>
                <span>Attiva · {entry.duration}</span>
              </>
            }
            tone="green"
          />
        ))}
      </div>
    ) : (
      <EmptyState tab={tab} />
    );
  }

  if (tab === "secrets") {
    return (
      <div className="archive-section-stack">
        <p className="archive-count">
          Segreti scoperti: {archive.secrets.length}
        </p>
        {archive.secrets.length > 0 ? (
          <div className="archive-card-list">
            {archive.secrets.map((entry) => (
              <ArchiveCard entry={entry} key={entry.id} tone="warm" />
            ))}
          </div>
        ) : (
          <EmptyState tab={tab} />
        )}
      </div>
    );
  }

  return archive.anomalies.length > 0 ? (
    <div className="archive-card-list">
      {archive.anomalies.map((entry) => (
        <ArchiveCard entry={entry} key={entry.id} tone="blue" />
      ))}
    </div>
  ) : (
    <EmptyState tab={tab} />
  );
}
