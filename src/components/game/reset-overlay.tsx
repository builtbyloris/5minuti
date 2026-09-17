type ResetOverlayProps = {
  loopNumber: number;
};

export function ResetOverlay({ loopNumber }: ResetOverlayProps) {
  return (
    <output
      aria-label={`Reset del loop ${loopNumber}. Preparazione loop ${loopNumber + 1}.`}
      aria-live="assertive"
      className="reset-overlay"
    >
      <div aria-hidden="true" className="reset-overlay__line" />
      <p className="font-mono text-sm uppercase tracking-[0.28em] text-text-muted">
        Fine finestra
      </p>
      <p className="mt-4 font-mono text-6xl font-semibold tracking-[-0.08em] text-accent-red-strong sm:text-8xl">
        00:00
      </p>
      <p className="mt-6 font-display text-xl uppercase tracking-[0.18em] text-text-main sm:text-2xl">
        Reset in corso
      </p>
      <p className="mt-3 text-sm text-text-muted">
        Preparazione loop {loopNumber + 1}
      </p>
    </output>
  );
}
