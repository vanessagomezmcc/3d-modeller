import { useEffect, useState } from "react";

interface NumberInputProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  precision?: number;
  disabled?: boolean;
}

/**
 * Compact numeric field. Local text state while typing; commits a validated
 * number on blur or Enter so undo history isn't flooded per keystroke.
 */
export function NumberInput({
  label,
  value,
  onCommit,
  step = 0.1,
  min,
  precision = 3,
  disabled = false,
}: NumberInputProps) {
  const display = format(value, precision);
  const [text, setText] = useState(display);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(display);
  }, [display, focused]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setText(display);
      return;
    }
    const clamped = min !== undefined ? Math.max(parsed, min) : parsed;
    setText(format(clamped, precision));
    if (clamped !== value) onCommit(clamped);
  };

  const nudge = (direction: 1 | -1) => {
    const base = Number.isFinite(Number(text)) ? Number(text) : value;
    const next = base + direction * step;
    const clamped = min !== undefined ? Math.max(next, min) : next;
    setText(format(clamped, precision));
    onCommit(round(clamped, precision));
  };

  return (
    <label className="num-field">
      <span className="num-field-label">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        className="num-field-input"
        value={text}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setText(display);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            nudge(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            nudge(-1);
          }
        }}
      />
    </label>
  );
}

function round(n: number, precision: number): number {
  const p = 10 ** precision;
  return Math.round(n * p) / p;
}

function format(n: number, precision: number): string {
  return String(round(n, precision));
}
