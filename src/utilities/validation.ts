import type { CameraPose, ProjectFile } from "../types/project";
import { PROJECT_APP_ID, PROJECT_VERSION } from "../types/project";
import type { NodeMap, SceneNodeData, Vec3 } from "../types/scene";
import { isGroup } from "../types/scene";

export interface ValidatedProject {
  projectName: string;
  nodes: NodeMap;
  rootIds: string[];
  camera: CameraPose;
}

export class ProjectValidationError extends Error {}

const PRIMITIVE_TYPES = new Set(["cube", "sphere", "cylinder", "cone", "plane"]);
const MAX_NODES = 2000;
const MAX_NAME_LENGTH = 80;

function fail(message: string): never {
  throw new ProjectValidationError(message);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function asVec3(v: unknown, label: string, fallback?: Vec3): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isFiniteNumber)) {
    if (fallback) return fallback;
    fail(`${label} must be an array of exactly 3 finite numbers.`);
  }
  return [v[0], v[1], v[2]];
}

function isValidColor(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return true;
  // Accept anything the browser can parse (named colors, rgb(), etc.).
  if (typeof document !== "undefined") {
    const probe = new Option();
    probe.style.color = "";
    probe.style.color = value;
    return probe.style.color !== "";
  }
  return false;
}

/**
 * Validate (and lightly repair) a parsed project object. Throws
 * ProjectValidationError with a specific message when the data is unsafe.
 */
export function validateProject(raw: unknown): ValidatedProject {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    fail("The file does not contain a project object.");
  }
  const data = raw as Partial<ProjectFile> & Record<string, unknown>;

  if (data.app !== undefined && data.app !== PROJECT_APP_ID) {
    fail(`This file was made by a different application ("${String(data.app)}").`);
  }
  if (!isFiniteNumber(data.version)) {
    fail("The project is missing a numeric version field.");
  }
  if (data.version > PROJECT_VERSION) {
    fail(
      `Unsupported project version ${data.version}. This build supports up to version ${PROJECT_VERSION}.`,
    );
  }
  if (!Array.isArray(data.nodes)) {
    fail("The project's scene nodes must be an array.");
  }
  if (data.nodes.length > MAX_NODES) {
    fail(`The project contains ${data.nodes.length} nodes; the maximum supported is ${MAX_NODES}.`);
  }

  const projectName =
    typeof data.projectName === "string" && data.projectName.trim().length > 0
      ? data.projectName.trim().slice(0, MAX_NAME_LENGTH)
      : "Untitled Project";

  const nodes: NodeMap = {};
  for (const [index, rawNode] of data.nodes.entries()) {
    const node = validateNode(rawNode, index);
    if (nodes[node.id]) fail(`Duplicate node id "${node.id}".`);
    nodes[node.id] = node;
  }

  // Parent/child consistency.
  const childToParent = new Map<string, string>();
  for (const node of Object.values(nodes)) {
    if (isGroup(node)) {
      for (const childId of node.childrenIds) {
        if (!nodes[childId]) {
          fail(`Group "${node.name}" references a missing child "${childId}".`);
        }
        if (childToParent.has(childId)) {
          fail(`Node "${childId}" is listed as a child of more than one group.`);
        }
        childToParent.set(childId, node.id);
      }
    }
  }
  for (const node of Object.values(nodes)) {
    const declared = node.parentId;
    const actual = childToParent.get(node.id) ?? null;
    if (declared !== actual) {
      // Repairable: trust the group children lists.
      node.parentId = actual;
    }
    if (declared && !nodes[declared] && !actual) {
      node.parentId = null;
    }
  }

  // Cycle detection.
  for (const node of Object.values(nodes)) {
    const seen = new Set<string>([node.id]);
    let current = node.parentId;
    while (current) {
      if (seen.has(current)) fail(`Cyclic group relationship involving "${node.name}".`);
      seen.add(current);
      current = nodes[current]?.parentId ?? null;
    }
  }

  // Root ids: validate provided order, repair by appending any missing roots.
  const trueRoots = Object.values(nodes)
    .filter((n) => n.parentId === null)
    .map((n) => n.id);
  const providedRoots = Array.isArray(data.rootIds)
    ? data.rootIds.filter((id): id is string => typeof id === "string" && trueRoots.includes(id))
    : [];
  const rootIds = [...new Set([...providedRoots, ...trueRoots])];

  const camera = validateCamera(data.camera);
  return { projectName, nodes, rootIds, camera };
}

function validateNode(raw: unknown, index: number): SceneNodeData {
  if (raw === null || typeof raw !== "object") fail(`Node ${index} is not an object.`);
  const n = raw as Record<string, unknown>;

  if (typeof n.id !== "string" || n.id.length === 0 || n.id.length > 120) {
    fail(`Node ${index} has an invalid id.`);
  }
  const name =
    typeof n.name === "string" && n.name.trim().length > 0
      ? n.name.slice(0, MAX_NAME_LENGTH)
      : `Node ${index + 1}`;
  const type = n.type;
  if (type !== "group" && !PRIMITIVE_TYPES.has(type as string)) {
    fail(`Node "${name}" has unknown type "${String(type)}".`);
  }

  const position = asVec3(n.position, `Node "${name}" position`);
  const rotation = asVec3(n.rotation, `Node "${name}" rotation`, [0, 0, 0]);
  const scaleRaw = asVec3(n.scale, `Node "${name}" scale`, [1, 1, 1]);
  const scale = scaleRaw.map((s) => (Math.abs(s) < 0.001 ? 0.001 : s)) as Vec3;
  const visible = typeof n.visible === "boolean" ? n.visible : true;
  const parentId = typeof n.parentId === "string" ? n.parentId : null;

  if (type === "group") {
    const childrenIds = Array.isArray(n.childrenIds)
      ? n.childrenIds.filter((c): c is string => typeof c === "string")
      : [];
    return {
      id: n.id,
      name,
      type: "group",
      parentId,
      position,
      rotation,
      scale,
      visible,
      childrenIds,
    };
  }

  const color = isValidColor(n.color) ? (n.color as string) : undefined;
  if (color === undefined) {
    fail(`Node "${name}" has an invalid color value.`);
  }
  return {
    id: n.id,
    name,
    type: type as SceneNodeData["type"] & string as Exclude<SceneNodeData["type"], "group">,
    parentId,
    position,
    rotation,
    scale,
    color,
    visible,
    wireframe: typeof n.wireframe === "boolean" ? n.wireframe : false,
  };
}

function validateCamera(raw: unknown): CameraPose {
  const fallback: CameraPose = { position: [8, 6, 8], target: [0, 0.75, 0] };
  if (raw === null || typeof raw !== "object") return fallback;
  const cam = raw as Record<string, unknown>;
  return {
    position: asVec3(cam.position, "Camera position", fallback.position),
    target: asVec3(cam.target, "Camera target", fallback.target),
  };
}
