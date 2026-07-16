import { X } from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";

export function Toast() {
  const toast = useSceneStore((s) => s.toast);
  const dismissToast = useSceneStore((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind === "error" ? "toast-error" : ""}`} role="status" aria-live="polite">
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={() => dismissToast(toast.id)}
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
