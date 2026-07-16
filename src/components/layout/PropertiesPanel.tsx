import { useEffect, useState } from "react";
import { Copy, Group, Trash2, Ungroup } from "lucide-react";
import { useSceneStore } from "../../store/useSceneStore";
import type { SceneGroupData, SceneNodeData, SceneObjectData, Vec3 } from "../../types/scene";
import { isGroup } from "../../types/scene";
import { NumberInput } from "../common/NumberInput";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

const TYPE_LABEL: Record<SceneNodeData["type"], string> = {
  cube: "Cube",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  plane: "Plane",
  group: "Group",
};

export function PropertiesPanel() {
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const groupSelected = useSceneStore((s) => s.groupSelected);

  return (
    <aside className="properties-panel" aria-label="Properties">
      <header className="panel-header">
        <h2 className="panel-title">Properties</h2>
      </header>
      <div className="properties-body">
        {selectedIds.length === 0 && (
          <p className="panel-hint">Select an object to edit its properties.</p>
        )}
        {selectedIds.length === 1 && <SingleSelection id={selectedIds[0]} />}
        {selectedIds.length > 1 && (
          <div className="prop-section">
            <p className="panel-hint">{selectedIds.length} objects selected.</p>
            <button type="button" className="btn btn-block" onClick={groupSelected}>
              <Group size={13} aria-hidden="true" /> Group selection
            </button>
            <p className="panel-hint panel-hint-small">
              Shift-click adds to or removes from the selection.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function SingleSelection({ id }: { id: string }) {
  const node = useSceneStore((s) => s.nodes[id]);
  if (!node) return <p className="panel-hint">Select an object to edit its properties.</p>;
  return isGroup(node) ? <GroupProperties node={node} /> : <ObjectProperties node={node} />;
}

function NameField({ node }: { node: SceneNodeData }) {
  const renameNode = useSceneStore((s) => s.renameNode);
  const [draft, setDraft] = useState(node.name);
  useEffect(() => setDraft(node.name), [node.id, node.name]);
  return (
    <label className="prop-field">
      <span className="prop-label">Name</span>
      <input
        className="prop-input"
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => (draft.trim() ? renameNode(node.id, draft) : setDraft(node.name))}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(node.name);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

function TransformFields({ node }: { node: SceneNodeData }) {
  const updateNodePatch = useSceneStore((s) => s.updateNodePatch);

  const commit = (
    key: "position" | "rotation" | "scale",
    axis: 0 | 1 | 2,
    value: number,
  ) => {
    const current = node[key] as Vec3;
    const next = [...current] as Vec3;
    next[axis] = key === "rotation" ? value * DEG_TO_RAD : value;
    // One history entry per committed field edit.
    updateNodePatch(node.id, { [key]: sanitize(key, next) } as Partial<SceneNodeData>);
  };

  return (
    <>
      <VectorRow label="Position" value={node.position} step={0.1} onCommit={(a, v) => commit("position", a, v)} />
      <VectorRow
        label="Rotation°"
        value={node.rotation.map((r) => r * RAD_TO_DEG) as Vec3}
        step={5}
        precision={1}
        onCommit={(a, v) => commit("rotation", a, v)}
      />
      <VectorRow
        label="Scale"
        value={node.scale}
        step={0.1}
        min={0.01}
        onCommit={(a, v) => commit("scale", a, v)}
      />
    </>
  );
}

function sanitize(key: "position" | "rotation" | "scale", vec: Vec3): Vec3 {
  return vec.map((n) => {
    if (!Number.isFinite(n)) return key === "scale" ? 1 : 0;
    if (key === "scale") return Math.max(n, 0.01);
    return n;
  }) as Vec3;
}

function VectorRow({
  label,
  value,
  step,
  min,
  precision,
  onCommit,
}: {
  label: string;
  value: Vec3;
  step: number;
  min?: number;
  precision?: number;
  onCommit: (axis: 0 | 1 | 2, value: number) => void;
}) {
  return (
    <div className="prop-field">
      <span className="prop-label">{label}</span>
      <div className="vector-row">
        {(["X", "Y", "Z"] as const).map((axis, index) => (
          <NumberInput
            key={axis}
            label={axis}
            value={value[index]}
            step={step}
            min={min}
            precision={precision}
            onCommit={(v) => onCommit(index as 0 | 1 | 2, v)}
          />
        ))}
      </div>
    </div>
  );
}

function CommonActions({ node }: { node: SceneNodeData }) {
  const duplicateSelected = useSceneStore((s) => s.duplicateSelected);
  const requestDeleteSelected = useSceneStore((s) => s.requestDeleteSelected);
  const resetNodeTransform = useSceneStore((s) => s.resetNodeTransform);
  return (
    <div className="prop-section prop-actions">
      <button type="button" className="btn btn-block" onClick={() => resetNodeTransform(node.id)}>
        Reset transform
      </button>
      <div className="btn-row">
        <button type="button" className="btn" onClick={duplicateSelected}>
          <Copy size={13} aria-hidden="true" /> Duplicate
        </button>
        <button type="button" className="btn btn-danger-ghost" onClick={requestDeleteSelected}>
          <Trash2 size={13} aria-hidden="true" /> Delete
        </button>
      </div>
    </div>
  );
}

function MetaRows({ node }: { node: SceneNodeData }) {
  const parentName = useSceneStore((s) => (node.parentId ? s.nodes[node.parentId]?.name ?? "—" : "None"));
  return (
    <div className="prop-meta">
      <div className="meta-row">
        <span className="meta-key">Type</span>
        <span className="meta-value">{TYPE_LABEL[node.type]}</span>
      </div>
      <div className="meta-row">
        <span className="meta-key">Parent</span>
        <span className="meta-value">{parentName}</span>
      </div>
      <div className="meta-row">
        <span className="meta-key">ID</span>
        <span className="meta-value meta-id" title={node.id}>
          {node.id}
        </span>
      </div>
    </div>
  );
}

function ObjectProperties({ node }: { node: SceneObjectData }) {
  const updateNodePatch = useSceneStore((s) => s.updateNodePatch);
  return (
    <>
      <div className="prop-section">
        <NameField node={node} />
        <MetaRows node={node} />
      </div>

      <div className="prop-section">
        <h3 className="prop-section-title">Transform</h3>
        <TransformFields node={node} />
      </div>

      <div className="prop-section">
        <h3 className="prop-section-title">Appearance</h3>
        <ColorField node={node} />
        <CheckboxField
          label="Visible"
          checked={node.visible}
          onChange={(checked) => updateNodePatch(node.id, { visible: checked })}
        />
        <CheckboxField
          label="Wireframe"
          checked={node.wireframe}
          onChange={(checked) => updateNodePatch(node.id, { wireframe: checked })}
        />
      </div>

      <CommonActions node={node} />
    </>
  );
}

function GroupProperties({ node }: { node: SceneGroupData }) {
  const updateNodePatch = useSceneStore((s) => s.updateNodePatch);
  const ungroupNode = useSceneStore((s) => s.ungroupNode);
  return (
    <>
      <div className="prop-section">
        <NameField node={node} />
        <MetaRows node={node} />
        <div className="meta-row">
          <span className="meta-key">Children</span>
          <span className="meta-value">{node.childrenIds.length}</span>
        </div>
      </div>

      <div className="prop-section">
        <h3 className="prop-section-title">Transform</h3>
        <TransformFields node={node} />
      </div>

      <div className="prop-section">
        <CheckboxField
          label="Visible"
          checked={node.visible}
          onChange={(checked) => updateNodePatch(node.id, { visible: checked })}
        />
        <button type="button" className="btn btn-block" onClick={() => ungroupNode(node.id)}>
          <Ungroup size={13} aria-hidden="true" /> Ungroup
        </button>
      </div>

      <CommonActions node={node} />
    </>
  );
}

function ColorField({ node }: { node: SceneObjectData }) {
  const updateNodePatch = useSceneStore((s) => s.updateNodePatch);
  const beginTransformDrag = useSceneStore((s) => s.beginTransformDrag);
  const endTransformDrag = useSceneStore((s) => s.endTransformDrag);
  return (
    <div className="prop-field">
      <span className="prop-label">Color</span>
      <div className="color-row">
        <input
          type="color"
          className="color-swatch"
          value={normalizeHex(node.color)}
          aria-label="Object color"
          // The native picker fires change per mouse move; snapshot once on
          // focus and commit a single history entry on blur.
          onFocus={beginTransformDrag}
          onBlur={endTransformDrag}
          onChange={(e) => updateNodePatch(node.id, { color: e.target.value }, false)}
        />
        <span className="color-hex">{normalizeHex(node.color)}</span>
      </div>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  return "#8a9bb0";
}
