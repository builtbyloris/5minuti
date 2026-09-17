import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountdownTimer } from "@/components/game/countdown-timer";
import { ResetOverlay } from "@/components/game/reset-overlay";
import { AppShell } from "@/components/ui/app-shell";

describe("M11 — semantica accessibile critica", () => {
  it("espone skip link, landmark principale e intestazione nominata", () => {
    render(
      <AppShell>
        <main id="main-content">
          <h1>Archivio</h1>
        </main>
      </AppShell>,
    );

    expect(
      screen
        .getByRole("link", { name: "Vai al contenuto" })
        .getAttribute("href"),
    ).toBe("#main-content");
    expect(screen.getByRole("main")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Archivio", level: 1 }),
    ).toBeDefined();
  });

  it("non annuncia il timer ogni secondo e comunica l'urgenza con testo", () => {
    const { container } = render(<CountdownTimer remainingSeconds={9} />);

    expect(screen.getByLabelText("Tempo del loop")).toBeDefined();
    expect(screen.getByText("Ultimi dieci secondi")).toBeDefined();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("annuncia assertivamente il reset senza affidarsi al solo flash", () => {
    render(<ResetOverlay loopNumber={3} />);

    const status = screen.getByLabelText(
      "Reset del loop 3. Preparazione loop 4.",
    );
    expect(status.getAttribute("aria-live")).toBe("assertive");
    expect(screen.getByText("Reset in corso")).toBeDefined();
    expect(screen.getByText("Preparazione loop 4")).toBeDefined();
  });
});
