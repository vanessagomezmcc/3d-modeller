import { useMemo } from "react";
import { TopBar } from "./components/layout/TopBar";
import { LeftToolbar } from "./components/layout/LeftToolbar";
import { SceneHierarchyPanel } from "./components/layout/SceneHierarchyPanel";
import { PropertiesPanel } from "./components/layout/PropertiesPanel";
import { StatusBar } from "./components/layout/StatusBar";
import { OnboardingPanel } from "./components/layout/OnboardingPanel";
import { AboutProjectDialog } from "./components/layout/AboutProjectDialog";
import { SceneCanvas } from "./components/scene/SceneCanvas";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { Toast } from "./components/common/Toast";
import { isWebGLAvailable, WebGLErrorState } from "./components/common/WebGLErrorState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

export default function App() {
  useKeyboardShortcuts();
  const webglOk = useMemo(() => isWebGLAvailable(), []);

  if (!webglOk) return <WebGLErrorState />;

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-main">
        <LeftToolbar />
        <SceneHierarchyPanel />
        <main className="viewport-area">
          <SceneCanvas />
          <OnboardingPanel />
        </main>
        <PropertiesPanel />
      </div>
      <StatusBar />

      <ConfirmDialog />
      <AboutProjectDialog />
      <Toast />

      <div className="small-screen-notice" role="note">
        <div className="fatal-card">
          <h1 className="fatal-title">Best viewed on a larger screen</h1>
          <p className="fatal-text">
            This 3D editor is designed for desktop and laptop displays. Open it on a screen at
            least ~900px wide to use the full toolset.
          </p>
        </div>
      </div>
    </div>
  );
}
