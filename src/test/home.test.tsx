import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { localSave } from "@/game/persistence/local-save";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(async () => {
  await localSave.clear();
});

describe("menu principale", () => {
  it("presenta il concept e tutte le destinazioni previste", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "5 Minuti" }),
    ).toBeDefined();
    expect(screen.getByText("23:55")).toBeDefined();
    expect(screen.getByText("Hai cinque minuti.")).toBeDefined();
    expect(screen.getByText("La città si resetta.")).toBeDefined();
    expect(screen.getByText("Tu ricordi.")).toBeDefined();

    expect(
      await screen.findByRole("button", { name: "Nuova partita" }),
    ).toBeDefined();

    const expectedLinks = [
      ["La Storia", "/storia"],
      ["Archivio", "/archivio"],
      ["Accedi con Google", "/login"],
      ["Impostazioni", "/impostazioni"],
    ];

    for (const [name, href] of expectedLinks) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
        href,
      );
    }
  });
});
