import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
};

export function Panel({
  children,
  className = "",
  eyebrow,
  title,
}: PanelProps) {
  return (
    <section
      className={`relative border border-border-subtle bg-bg-panel shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-md ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -left-px -top-px h-5 w-5 border-l border-t border-accent-red/70"
      />
      {(eyebrow || title) && (
        <header className="border-b border-border-subtle px-5 py-4 sm:px-6">
          {eyebrow ? (
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-accent-red-strong">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-1 font-display text-xl uppercase tracking-[0.12em] text-text-main">
              {title}
            </h2>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
