import { useEffect, useRef } from "react";
import { useSceneStore } from "../../store/useSceneStore";

/** Renders the store-level confirm request, if any. */
export function ConfirmDialog() {
  const confirm = useSceneStore((s) => s.confirm);
  const closeConfirm = useSceneStore((s) => s.closeConfirm);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!confirm) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeConfirm();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previousFocus.current?.focus?.();
    };
  }, [confirm, closeConfirm]);

  if (!confirm) return null;

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closeConfirm()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="dialog-title">
          {confirm.title}
        </h2>
        <p className="dialog-body">{confirm.message}</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={closeConfirm}>
            Cancel
          </button>
          {confirm.altLabel && confirm.onAlt && (
            <button type="button" className="btn" onClick={confirm.onAlt}>
              {confirm.altLabel}
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            className={`btn ${confirm.danger ? "btn-danger" : "btn-accent"}`}
            onClick={confirm.onConfirm}
          >
            {confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
