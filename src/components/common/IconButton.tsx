import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  children: ReactNode;
}

/**
 * Icon button with an accessible name and a CSS tooltip. The tooltip
 * supplements — never replaces — the aria-label.
 */
export function IconButton({ label, shortcut, active = false, children, ...rest }: IconButtonProps) {
  const tooltip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      className={`icon-btn${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={active || undefined}
      data-tooltip={tooltip}
      {...rest}
    >
      {children}
    </button>
  );
}
