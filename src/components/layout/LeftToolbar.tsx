import {
  Box,
  Circle,
  Cone,
  Copy,
  Cylinder,
  Group,
  Move3d,
  MousePointer2,
  Rotate3d,
  Scale3d,
  Square,
  Trash2,
} from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";
import { IconButton } from "../common/IconButton";
import type { ToolMode } from "../../types/scene";

const TOOLS: Array<{ id: ToolMode; label: string; shortcut?: string; icon: JSX.Element }> = [
  { id: "select", label: "Select", shortcut: "Q", icon: <MousePointer2 size={16} /> },
  { id: "translate", label: "Move", shortcut: "W", icon: <Move3d size={16} /> },
  { id: "rotate", label: "Rotate", shortcut: "E", icon: <Rotate3d size={16} /> },
  { id: "scale", label: "Scale", shortcut: "R", icon: <Scale3d size={16} /> },
];

export function LeftToolbar() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const setTool = useSceneStore((s) => s.setTool);
  const addPrimitive = useSceneStore((s) => s.addPrimitive);
  const selectedCount = useSceneStore((s) => s.selectedIds.length);
  const duplicateSelected = useSceneStore((s) => s.duplicateSelected);
  const requestDeleteSelected = useSceneStore((s) => s.requestDeleteSelected);
  const groupSelected = useSceneStore((s) => s.groupSelected);

  return (
    <nav className="left-toolbar" aria-label="Tools">
      <div className="toolbar-section" role="group" aria-label="Transform tools">
        {TOOLS.map((tool) => (
          <IconButton
            key={tool.id}
            label={tool.label}
            shortcut={tool.shortcut}
            active={activeTool === tool.id}
            onClick={() => setTool(tool.id)}
          >
            {tool.icon}
          </IconButton>
        ))}
      </div>

      <div className="toolbar-rule" role="presentation" />

      <div className="toolbar-section" role="group" aria-label="Add primitives">
        <IconButton label="Add cube" onClick={() => addPrimitive("cube")}>
          <Box size={16} />
        </IconButton>
        <IconButton label="Add sphere" onClick={() => addPrimitive("sphere")}>
          <Circle size={16} />
        </IconButton>
        <IconButton label="Add cylinder" onClick={() => addPrimitive("cylinder")}>
          <Cylinder size={16} />
        </IconButton>
        <IconButton label="Add cone" onClick={() => addPrimitive("cone")}>
          <Cone size={16} />
        </IconButton>
        <IconButton label="Add plane" onClick={() => addPrimitive("plane")}>
          <Square size={16} />
        </IconButton>
      </div>

      <div className="toolbar-rule" role="presentation" />

      <div className="toolbar-section" role="group" aria-label="Object actions">
        <IconButton
          label={selectedCount < 2 ? "Group (select 2+ objects)" : "Group selection"}
          shortcut="Ctrl+G"
          onClick={groupSelected}
          disabled={selectedCount < 2}
        >
          <Group size={16} />
        </IconButton>
        <IconButton
          label="Duplicate"
          shortcut="Ctrl+D"
          onClick={duplicateSelected}
          disabled={selectedCount === 0}
        >
          <Copy size={16} />
        </IconButton>
        <IconButton
          label="Delete"
          shortcut="Del"
          onClick={requestDeleteSelected}
          disabled={selectedCount === 0}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>
    </nav>
  );
}
