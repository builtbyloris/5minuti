export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-main px-5 py-12 text-text-main sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(88,166,255,0.12),transparent_42%),linear-gradient(180deg,transparent_45%,rgba(217,59,59,0.08))]"
      />

      <section className="relative w-full max-w-3xl border border-border-subtle bg-bg-panel px-6 py-10 text-center shadow-2xl shadow-black/50 backdrop-blur-md sm:px-12 sm:py-16">
        <p className="font-mono text-sm uppercase tracking-[0.32em] text-text-muted">
          Vertical slice in sviluppo
        </p>

        <time
          dateTime="23:55"
          className="mt-8 font-mono text-5xl font-semibold tabular-nums tracking-tight text-accent-red-strong sm:text-7xl"
        >
          23:55
        </time>

        <h1 className="mt-5 text-4xl font-semibold uppercase tracking-[0.16em] sm:text-6xl">
          5 Minuti
        </h1>

        <p className="mx-auto mt-8 max-w-xl text-base leading-7 text-text-muted sm:text-lg">
          Hai cinque minuti. La città si resetta. Tu ricordi.
        </p>

        <div className="mx-auto mt-10 h-px w-20 bg-accent-red" />

        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-accent-blue">
          Qualcosa oggi è cambiato.
        </p>
      </section>
    </main>
  );
}
