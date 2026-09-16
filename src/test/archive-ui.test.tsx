import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveTabs } from "@/components/archive/archive-tabs";
import { createArchiveViewModel } from "@/game/archive/view-model";
import { createInitialGameState } from "@/game/state/initial-state";

describe("ArchiveTabs", () => {
  it("espone sette tab ARIA navigabili da tastiera", () => {
    render(
      <ArchiveTabs
        archive={createArchiveViewModel(createInitialGameState())}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);

    fireEvent.keyDown(tabs[1], { key: "End" });
    expect(tabs[6]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[6]);
  });

  it("mostra empty state neutrali e nessun totale implicito", () => {
    render(
      <ArchiveTabs
        archive={createArchiveViewModel(createInitialGameState())}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Segreti/i }));
    expect(screen.getByText("Segreti scoperti: 0")).toBeTruthy();
    expect(screen.getByText("Nessun segreto registrato.")).toBeTruthy();
    expect(screen.queryByText(/\/3/)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Anomalie/i }));
    expect(screen.getByText("Nessuna anomalia registrata.")).toBeTruthy();
  });
});
