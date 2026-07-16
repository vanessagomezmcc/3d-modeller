import { countNodes, useSceneStore } from "../../store/useSceneStore";

const TOOL_LABEL = {
  select: "Select",
  translate: "Move",
  rotate: "Rotate",
  scale: "Scale",
} as const;

export function StatusBar() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const nodes = useSceneStore((s) => s.nodes);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const saveStatus = useSceneStore((s) => s.saveStatus);

  const { objects, groups } = countNodes(nodes);
  const selectionLabel =
    selectedIds.length === 0
      ? "Nothing selected"
      : selectedIds.length === 1
        ? nodes[selectedIds[0]]?.name ?? "Nothing selected"
        : `${selectedIds.length} selected`;

  return (
    <footer className="status-bar">
      <span className="status-item">
        Tool: <strong>{TOOL_LABEL[activeTool]}</strong>
      </span>
      <span className="status-sep" />
      <span className="status-item">
        {objects} object{objects === 1 ? "" : "s"} · {groups} group{groups === 1 ? "" : "s"}
      </span>
      <span className="status-sep" />
      <span className="status-item status-selection">{selectionLabel}</span>
      <span className="status-sep" />
      <span className="status-item">{saveStatus === "unsaved" ? "Unsaved changes" : saveStatus === "error" ? "Saving failed" : "Saved"}</span>
      <span className="status-spacer" />
      <span className="status-item status-hints">
        Left-click: Select · Right-drag: Orbit · Middle-drag: Pan · Scroll: Zoom · W/E/R: Transform · Del: Remove
      </span>
    </footer>
  );
}
