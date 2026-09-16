import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

type CommonProps = {
  children: ReactNode;
  className?: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "quiet";
};

type GameButtonProps = CommonProps &
  (
    | {
        disabled?: boolean;
        href: string;
        type?: never;
      }
    | ({ href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

const variantClasses = {
  primary:
    "border-accent-red bg-accent-red text-white shadow-[0_12px_36px_rgba(217,59,59,0.2)] hover:border-accent-red-strong hover:bg-accent-red-strong active:translate-y-px disabled:border-accent-red/40 disabled:bg-accent-red/30 disabled:text-white/45 disabled:shadow-none",
  secondary:
    "border-border-subtle bg-bg-panel text-text-main hover:border-text-muted/60 hover:bg-bg-panel-strong active:translate-y-px disabled:text-text-muted/40",
  quiet:
    "border-transparent bg-transparent text-text-muted hover:border-border-subtle hover:bg-white/[0.04] hover:text-text-main active:translate-y-px disabled:text-text-muted/35",
};

export function GameButton({
  children,
  className = "",
  icon,
  variant = "secondary",
  ...props
}: GameButtonProps) {
  const classes = [
    "group inline-flex min-h-12 w-full items-center gap-3 border px-4 py-3 text-left text-sm font-medium uppercase tracking-[0.12em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-red-strong disabled:cursor-not-allowed disabled:border-border-subtle",
    variantClasses[variant],
    className,
  ].join(" ");

  const content = (
    <>
      {icon ? (
        <Icon
          className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          name={icon}
        />
      ) : null}
      <span className="flex-1">{children}</span>
      <span aria-hidden="true" className="font-mono text-xs opacity-45">
        / /
      </span>
    </>
  );

  if ("href" in props && props.href) {
    if (props.disabled) {
      return (
        <span aria-disabled="true" className={`${classes} cursor-not-allowed`}>
          {content}
        </span>
      );
    }

    return (
      <Link className={classes} href={props.href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} type="button" {...props}>
      {content}
    </button>
  );
}
