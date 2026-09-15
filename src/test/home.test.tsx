import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home placeholder", () => {
  it("presenta il concept fondamentale del gioco", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "5 Minuti" }),
    ).toBeDefined();
    expect(screen.getByText("23:55")).toBeDefined();
    expect(
      screen.getByText("Hai cinque minuti. La città si resetta. Tu ricordi."),
    ).toBeDefined();
  });
});
