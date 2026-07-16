import { useEffect, useRef, useState } from "react";
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  Download,
  FilePlus2,
  FolderOpen,
  Info,
  Redo2,
  RotateCcw,
  Save,
  TriangleAlert,
  Undo2,
  Upload,
} from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";
import { IconButton } from "../common/IconButton";

export function TopBar() {
  const projectName = useSceneStore((s) => s.projectName);
  const setProjectName = useSceneStore((s) => s.setProjectName);
  const saveStatus = useSceneStore((s) => s.saveStatus);
  const canUndo = useSceneStore((s) => s.past.length > 0);
  const canRedo = useSceneStore((s) => s.future.length > 0);
  const undo = useSceneStore((s) => s.undo);
  const redo = useSceneStore((s) => s.redo);
  const saveProject = useSceneStore((s) => s.saveProject);
  const requestLoadProject = useSceneStore((s) => s.requestLoadProject);
  const requestNewProject = useSceneStore((s) => s.requestNewProject);
  const requestResetDemo = useSceneStore((s) => s.requestResetDemo);
  const exportProject = useSceneStore((s) => s.exportProject);
  const importProjectText = useSceneStore((s) => s.importProjectText);
  const applyCameraPreset = useSceneStore((s) => s.applyCameraPreset);
  const focusSelected = useSceneStore((s) => s.focusSelected);
  const hasSelection = useSceneStore((s) => s.selectedIds.length > 0);
  const setAboutOpen = useSceneStore((s) => s.setAboutOpen);
  const showToast = useSceneStore((s) => s.showToast);

  const [nameDraft, setNameDraft] = useState(projectName);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setNameDraft(projectName), [projectName]);

  useEffect(() => {
    if (!cameraMenuOpen) return;
    const close = (e: PointerEvent) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target as Node)) {
        setCameraMenuOpen(false);
      }
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCameraMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [cameraMenuOpen]);

  const handleImportFile = (file: File) => {
    if (file.size > 4_000_000) {
      showToast("That file is too large to import (4 MB limit).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast("Could not read the selected file.", "error");
    reader.onload = () => {
      if (typeof reader.result === "string") importProjectText(reader.result);
    };
    reader.readAsText(file);
  };

  const cameraActions: Array<{ label: string; run: () => void; disabled?: boolean }> = [
    { label: "Reset camera", run: () => applyCameraPreset("reset") },
    { label: "Focus selected — F", run: focusSelected, disabled: !hasSelection },
    { label: "Front view — 1", run: () => applyCameraPreset("front") },
    { label: "Side view — 2", run: () => applyCameraPreset("side") },
    { label: "Top view — 3", run: () => applyCameraPreset("top") },
    { label: "Isometric view — 0", run: () => applyCameraPreset("isometric") },
  ];

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Box size={17} strokeWidth={2.1} aria-hidden="true" />
        <span className="topbar-appname">3D Modeller</span>
      </div>

      <div className="topbar-divider" />

      <input
        className="project-name-input"
        value={nameDraft}
        aria-label="Project name"
        spellCheck={false}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => {
          if (nameDraft.trim().length === 0) setNameDraft(projectName);
          else setProjectName(nameDraft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setNameDraft(projectName);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      <SaveIndicator status={saveStatus} />

      <div className="topbar-spacer" />

      <div className="topbar-group">
        <IconButton label="New project" onClick={requestNewProject}>
          <FilePlus2 size={15} />
        </IconButton>
        <IconButton label="Save to browser" shortcut="Ctrl+S" onClick={saveProject}>
          <Save size={15} />
        </IconButton>
        <IconButton label="Load saved project" onClick={requestLoadProject}>
          <FolderOpen size={15} />
        </IconButton>
        <IconButton label="Import JSON" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} />
        </IconButton>
        <IconButton label="Export JSON" onClick={exportProject}>
          <Download size={15} />
        </IconButton>
      </div>

      <div className="topbar-divider" />

      <div className="topbar-group">
        <IconButton label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={!canUndo}>
          <Undo2 size={15} />
        </IconButton>
        <IconButton label="Redo" shortcut="Ctrl+Shift+Z" onClick={redo} disabled={!canRedo}>
          <Redo2 size={15} />
        </IconButton>
      </div>

      <div className="topbar-divider" />

      <div className="topbar-group">
        <div className="menu-anchor" ref={cameraMenuRef}>
          <button
            type="button"
            className={`text-btn${cameraMenuOpen ? " is-active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={cameraMenuOpen}
            onClick={() => setCameraMenuOpen((open) => !open)}
          >
            <Camera size={14} aria-hidden="true" />
            Camera
            <ChevronDown size={12} aria-hidden="true" />
          </button>
          {cameraMenuOpen && (
            <div className="menu" role="menu" aria-label="Camera options">
              {cameraActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className="menu-item"
                  disabled={action.disabled}
                  onClick={() => {
                    setCameraMenuOpen(false);
                    action.run();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="text-btn" onClick={requestResetDemo}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset demo
        </button>

        <IconButton label="About this project" onClick={() => setAboutOpen(true)}>
          <Info size={15} />
        </IconButton>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden-input"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = "";
        }}
      />
    </header>
  );
}

function SaveIndicator({ status }: { status: "saved" | "unsaved" | "error" }) {
  if (status === "saved") {
    return (
      <span className="save-indicator save-ok">
        <Check size={12} aria-hidden="true" /> Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="save-indicator save-error">
        <TriangleAlert size={12} aria-hidden="true" /> Saving failed
      </span>
    );
  }
  return <span className="save-indicator save-dirty">Unsaved changes</span>;
}
