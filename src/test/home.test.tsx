import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("menu principale", () => {
  it("presenta il concept e tutte le destinazioni previste", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "5 Minuti" }),
    ).toBeDefined();
    expect(screen.getByText("23:55")).toBeDefined();
    expect(screen.getByText("Hai cinque minuti.")).toBeDefined();
    expect(screen.getByText("La città si resetta.")).toBeDefined();
    expect(screen.getByText("Tu ricordi.")).toBeDefined();

    const expectedLinks = [
      ["Nuova partita", "/gioca"],
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
