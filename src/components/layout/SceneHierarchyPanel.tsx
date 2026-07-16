import { useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Circle,
  Cone,
  Cylinder,
  Eye,
  EyeOff,
  Folder,
  Square,
} from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";
import type { SceneNodeData } from "../../types/scene";
import { isGroup } from "../../types/scene";

const TYPE_ICONS: Record<SceneNodeData["type"], JSX.Element> = {
  cube: <Box size={13} />,
  sphere: <Circle size={13} />,
  cylinder: <Cylinder size={13} />,
  cone: <Cone size={13} />,
  plane: <Square size={13} />,
  group: <Folder size={13} />,
};

export function SceneHierarchyPanel() {
  const rootIds = useSceneStore((s) => s.rootIds);
  return (
    <section className="hierarchy-panel" aria-label="Scene hierarchy">
      <header className="panel-header">
        <h2 className="panel-title">Scene</h2>
      </header>
      <div className="hierarchy-list" role="tree" aria-label="Scene objects">
        {rootIds.length === 0 && <p className="panel-hint">No objects yet.</p>}
        {rootIds.map((id) => (
          <HierarchyRow key={id} id={id} depth={0} />
        ))}
      </div>
    </section>
  );
}

function HierarchyRow({ id, depth }: { id: string; depth: number }) {
  const node = useSceneStore((s) => s.nodes[id]);
  const selected = useSceneStore((s) => s.selectedIds.includes(id));
  const selectNode = useSceneStore((s) => s.selectNode);
  const renameNode = useSceneStore((s) => s.renameNode);
  const updateNodePatch = useSceneStore((s) => s.updateNodePatch);

  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!node) return null;
  const group = isGroup(node) ? node : null;

  const commitRename = () => {
    setEditing(false);
    renameNode(id, draft);
  };

  return (
    <>
      <div
        role="treeitem"
        aria-selected={selected}
        aria-expanded={group ? expanded : undefined}
        className={`hierarchy-row${selected ? " is-selected" : ""}${node.visible ? "" : " is-hidden"}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {group ? (
          <button
            type="button"
            className="row-chevron"
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="row-chevron-spacer" aria-hidden="true" />
        )}

        <span className="row-type-icon" aria-hidden="true">
          {TYPE_ICONS[node.type]}
        </span>

        {editing ? (
          <input
            className="row-rename-input"
            value={draft}
            autoFocus
            aria-label={`Rename ${node.name}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="row-name"
            title={`${node.name} — double-click to rename`}
            onClick={(e) => selectNode(id, e.shiftKey)}
            onDoubleClick={() => {
              setDraft(node.name);
              setEditing(true);
            }}
          >
            {node.name}
          </button>
        )}

        <button
          type="button"
          className="row-visibility"
          aria-label={node.visible ? `Hide ${node.name}` : `Show ${node.name}`}
          aria-pressed={!node.visible}
          onClick={() => updateNodePatch(id, { visible: !node.visible })}
        >
          {node.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>

      {group && expanded && (
        <div role="group">
          {group.childrenIds.map((childId) => (
            <HierarchyRow key={childId} id={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}
