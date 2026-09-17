import { formatCountdown, formatNarrativeTime } from "@/game/engine/clock";

type CountdownTimerProps = {
  remainingSeconds: number;
};

export function CountdownTimer({ remainingSeconds }: CountdownTimerProps) {
  const countdown = formatCountdown(remainingSeconds);
  const narrativeTime = formatNarrativeTime(remainingSeconds);
  const urgency =
    remainingSeconds <= 10
      ? "critical"
      : remainingSeconds <= 30
        ? "warning"
        : "normal";

  return (
    <section
      aria-label="Tempo del loop"
      className="gameplay-timer"
      data-urgency={urgency}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-text-muted">
        Tempo restante
      </p>
      <time
        className="mt-2 block font-mono text-[clamp(3.25rem,16vw,6.5rem)] font-semibold leading-none tracking-[-0.08em] text-accent-red-strong [text-shadow:0_0_32px_rgba(217,59,59,0.22)]"
        dateTime={`PT${remainingSeconds}S`}
      >
        {countdown}
      </time>
      {urgency !== "normal" ? (
        <p className="gameplay-timer__urgency">
          {urgency === "critical"
            ? "Ultimi dieci secondi"
            : "Ultimi trenta secondi"}
        </p>
      ) : null}
      <p className="mt-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-text-main">
        <span aria-hidden="true" className="h-px w-8 bg-accent-red" />
        Ora narrativa {narrativeTime}
      </p>
    </section>
  );
}
