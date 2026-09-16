import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MainMenu } from "@/components/game/main-menu";
import { GameButton } from "@/components/ui/game-button";

describe("design system", () => {
  it("può mostrare Continua senza dipendere da uno stato salvato", () => {
    render(<MainMenu primaryAction="continue" />);

    expect(screen.getByRole("link", { name: "Continua" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Nuova partita" })).toBeNull();
  });

  it("espone lo stato disabled sui pulsanti nativi", () => {
    render(<GameButton disabled>Azione non disponibile</GameButton>);

    expect(
      (
        screen.getByRole("button", {
          name: "Azione non disponibile",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
