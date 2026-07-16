import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";

export function AboutProjectDialog() {
  const open = useSceneStore((s) => s.aboutOpen);
  const setAboutOpen = useSceneStore((s) => s.setAboutOpen);
  const setOnboardingOpen = useSceneStore((s) => s.setOnboardingOpen);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previousFocus.current?.focus?.();
    };
  }, [open, setAboutOpen]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => e.target === e.currentTarget && setAboutOpen(false)}
    >
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="dialog-header">
          <h2 id="about-title" className="dialog-title">
            About this project
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="dialog-close"
            aria-label="Close dialog"
            onClick={() => setAboutOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="dialog-body">
          <p>
            3D Modeller is a small browser-based modeling tool, inspired by the "3D Modeller"
            chapter from <em>500 Lines or Less</em> and rebuilt on a modern web stack. Everything
            runs client-side; projects persist through localStorage and JSON import/export.
          </p>
          <p>It was built to demonstrate a specific set of techniques:</p>
          <ul className="about-list">
            <li>React and TypeScript application architecture</li>
            <li>Three.js rendering through React Three Fiber</li>
            <li>Raycast-based object selection in the viewport</li>
            <li>A scene graph with parent-child group transforms</li>
            <li>Fully serializable application state (Zustand)</li>
            <li>Snapshot-based undo and redo history</li>
            <li>Browser persistence plus validated JSON import and export</li>
            <li>A desktop-style, keyboard-driven interface</li>
          </ul>
          <p className="about-footnote">
            Need the quick controls again?{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setAboutOpen(false);
                setOnboardingOpen(true);
              }}
            >
              Reopen the getting-started panel
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
