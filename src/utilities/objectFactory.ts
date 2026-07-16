import type {
  NodeMap,
  PrimitiveObjectType,
  SceneGroupData,
  SceneNodeData,
  SceneObjectData,
  Vec3,
} from "../types/scene";
import { isGroup } from "../types/scene";

let counter = 0;

export function generateId(): string {
  counter += 1;
  return `node-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const TYPE_LABEL: Record<PrimitiveObjectType, string> = {
  cube: "Cube",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  plane: "Plane",
};

const DEFAULT_COLOR: Record<PrimitiveObjectType, string> = {
  cube: "#8a9bb0",
  sphere: "#b0876a",
  cylinder: "#7d9c86",
  cone: "#a08bab",
  plane: "#9a9a94",
};

/** Next readable name like "Cube 3", based on what already exists. */
export function nextName(nodes: NodeMap, label: string): string {
  let max = 0;
  for (const node of Object.values(nodes)) {
    const match = node.name.match(new RegExp(`^${label} (\\d+)$`));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${label} ${max + 1}`;
}

/** Small deterministic-ish offset so stacked additions don't overlap perfectly. */
function spawnOffset(existingCount: number): Vec3 {
  const step = existingCount % 5;
  return [step * 0.6 - 1.2, 0, ((existingCount * 7) % 5) * 0.5 - 1];
}

export function createPrimitive(nodes: NodeMap, type: PrimitiveObjectType): SceneObjectData {
  const count = Object.keys(nodes).length;
  const [ox, , oz] = spawnOffset(count);
  const y = type === "plane" ? 0.01 : 0.5;
  return {
    id: generateId(),
    name: nextName(nodes, TYPE_LABEL[type]),
    type,
    parentId: null,
    position: [round3(ox), y, round3(oz)],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: DEFAULT_COLOR[type],
    visible: true,
    wireframe: false,
  };
}

export function createGroup(nodes: NodeMap, position: Vec3): SceneGroupData {
  return {
    id: generateId(),
    name: nextName(nodes, "Group"),
    type: "group",
    parentId: null,
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    childrenIds: [],
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Collect a node and all of its descendants (depth-first). */
export function collectSubtree(nodes: NodeMap, id: string): SceneNodeData[] {
  const node = nodes[id];
  if (!node) return [];
  const out: SceneNodeData[] = [node];
  if (isGroup(node)) {
    for (const childId of node.childrenIds) {
      out.push(...collectSubtree(nodes, childId));
    }
  }
  return out;
}

/**
 * Deep-clone a subtree with fresh ids. Returns the cloned nodes and the new
 * id of the subtree root. Names get a "copy"-style suffix on the root only.
 */
export function cloneSubtree(
  nodes: NodeMap,
  rootId: string,
): { cloned: SceneNodeData[]; newRootId: string } {
  const idMap = new Map<string, string>();
  const subtree = collectSubtree(nodes, rootId);
  for (const node of subtree) idMap.set(node.id, generateId());

  const cloned = subtree.map((node) => {
    const base = {
      ...node,
      id: idMap.get(node.id) as string,
      parentId: node.parentId && idMap.has(node.parentId) ? (idMap.get(node.parentId) as string) : null,
    };
    if (isGroup(node)) {
      return {
        ...base,
        childrenIds: node.childrenIds.map((c) => idMap.get(c) as string),
      } as SceneNodeData;
    }
    return base as SceneNodeData;
  });

  const newRootId = idMap.get(rootId) as string;
  const root = cloned.find((n) => n.id === newRootId);
  if (root) {
    root.name = `${nodes[rootId].name} copy`;
    root.position = [
      round3(root.position[0] + 0.75),
      root.position[1],
      round3(root.position[2] + 0.75),
    ];
  }
  return { cloned, newRootId };
}

/** Ancestor chain from a node up to its root (exclusive of the node itself). */
export function ancestorsOf(nodes: NodeMap, id: string): string[] {
  const out: string[] = [];
  let current = nodes[id]?.parentId ?? null;
  while (current) {
    out.push(current);
    current = nodes[current]?.parentId ?? null;
  }
  return out;
}

/** The top-most ancestor of a node (or the node itself when at root level). */
export function topLevelAncestor(nodes: NodeMap, id: string): string {
  const chain = ancestorsOf(nodes, id);
  return chain.length > 0 ? chain[chain.length - 1] : id;
}
