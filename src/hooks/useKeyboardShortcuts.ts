import { useEffect } from "react";
import { useSceneStore } from "../store/useSceneStore";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const store = useSceneStore.getState();
      // Don't fire scene shortcuts while a dialog is open.
      if (store.confirm || store.aboutOpen) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        store.redo();
        return;
      }
      if (mod && key === "s") {
        event.preventDefault();
        store.saveProject();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        store.duplicateSelected();
        return;
      }
      if (mod && key === "g") {
        event.preventDefault();
        store.groupSelected();
        return;
      }
      if (mod) return;

      switch (key) {
        case "q":
          store.setTool("select");
          break;
        case "w":
          store.setTool("translate");
          break;
        case "e":
          store.setTool("rotate");
          break;
        case "r":
          store.setTool("scale");
          break;
        case "delete":
        case "backspace":
          event.preventDefault();
          store.requestDeleteSelected();
          break;
        case "escape":
          store.selectNode(null);
          break;
        case "f":
          store.focusSelected();
          break;
        case "1":
          store.applyCameraPreset("front");
          break;
        case "2":
          store.applyCameraPreset("side");
          break;
        case "3":
          store.applyCameraPreset("top");
          break;
        case "0":
          store.applyCameraPreset("isometric");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
