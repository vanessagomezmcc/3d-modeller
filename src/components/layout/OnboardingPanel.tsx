import { X } from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";

export function OnboardingPanel() {
  const open = useSceneStore((s) => s.onboardingOpen);
  const setOnboardingOpen = useSceneStore((s) => s.setOnboardingOpen);
  if (!open) return null;

  return (
    <aside className="onboarding" aria-label="Getting started">
      <div className="onboarding-header">
        <h2 className="onboarding-title">Getting started</h2>
        <button
          type="button"
          className="onboarding-close"
          aria-label="Dismiss getting started panel"
          onClick={() => setOnboardingOpen(false)}
        >
          <X size={14} />
        </button>
      </div>
      <ul className="onboarding-list">
        <li><strong>Orbit</strong> with the right mouse button; scroll to zoom.</li>
        <li><strong>Select</strong> an object with a left click. Click empty space to deselect.</li>
        <li><strong>Add</strong> primitives from the left toolbar.</li>
        <li><strong>Transform</strong> with the gizmo — press W, E, or R to switch mode.</li>
        <li><strong>Reset demo</strong> in the top bar restores this sample scene.</li>
      </ul>
    </aside>
  );
}
