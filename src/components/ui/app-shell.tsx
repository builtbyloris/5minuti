import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  mode?: "menu" | "page";
};

export function AppShell({ children, mode = "page" }: AppShellProps) {
  return (
    <div className={`app-shell app-shell--${mode}`}>
      <a className="skip-link" href="#main-content">
        Vai al contenuto
      </a>

      <div aria-hidden="true" className="app-shell__scene" />
      <div aria-hidden="true" className="app-shell__atmosphere" />
      <div aria-hidden="true" className="app-shell__rain" />

      {mode === "page" ? (
        <header className="relative z-10 flex min-h-16 items-center border-b border-border-subtle px-5 sm:px-8">
          <Link
            className="font-display text-sm uppercase tracking-[0.24em] text-text-main transition-colors hover:text-accent-red-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-red-strong"
            href="/"
          >
            5 Minuti
          </Link>
          <time
            className="ml-auto font-mono text-xs tracking-[0.16em] text-accent-red-strong"
            dateTime="23:55"
          >
            23:55
          </time>
        </header>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
