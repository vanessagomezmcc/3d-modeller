import { create } from "zustand";
import type { CameraPose, SaveStatus } from "../types/project";
import type {
  NodeMap,
  PrimitiveObjectType,
  SceneNodeData,
  ToolMode,
  Vec3,
} from "../types/scene";
import { isGroup } from "../types/scene";
import {
  cloneSubtree,
  collectSubtree,
  createGroup,
  createPrimitive,
  topLevelAncestor,
} from "../utilities/objectFactory";
import {
  buildProjectFile,
  loadProjectFromStorage,
  ONBOARDING_KEY,
  parseImportedJson,
  saveProjectToStorage,
} from "../utilities/serialization";
import { downloadJson, sanitizeFilename } from "../utilities/download";
import { buildSampleScene, SAMPLE_CAMERA, SAMPLE_PROJECT_NAME } from "../utilities/sampleScene";
import { relativeTo, worldMatrixOf } from "../utilities/transforms";
import { Matrix4 } from "three";

const HISTORY_LIMIT = 80;

interface Snapshot {
  nodes: NodeMap;
  rootIds: string[];
  selectedIds: string[];
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  /** Optional second affirmative choice (used for "ungroup instead"). */
  altLabel?: string;
  onConfirm: () => void;
  onAlt?: () => void;
}

interface ToastState {
  id: number;
  message: string;
  kind: "info" | "error";
}

interface SceneState {
  nodes: NodeMap;
  rootIds: string[];
  selectedIds: string[];
  activeTool: ToolMode;
  projectName: string;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  past: Snapshot[];
  future: Snapshot[];
  cameraPose: CameraPose;
  cameraNonce: number; // bump to ask the camera controller to fly to cameraPose
  focusNonce: number; // bump to ask the camera controller to frame the selection
  isTransforming: boolean;
  onboardingOpen: boolean;
  aboutOpen: boolean;
  confirm: ConfirmRequest | null;
  toast: ToastState | null;

  // Selection & tools
  selectNode: (id: string | null, additive?: boolean) => void;
  selectFromViewport: (id: string, additive: boolean) => void;
  setTool: (tool: ToolMode) => void;

  // Node editing
  addPrimitive: (type: PrimitiveObjectType) => void;
  updateNodePatch: (id: string, patch: Partial<SceneNodeData>, recordHistory?: boolean) => void;
  setNodeTransform: (
    id: string,
    transform: { position: Vec3; rotation: Vec3; scale: Vec3 },
  ) => void;
  beginTransformDrag: () => void;
  endTransformDrag: () => void;
  renameNode: (id: string, name: string) => void;
  resetNodeTransform: (id: string) => void;
  duplicateSelected: () => void;
  requestDeleteSelected: () => void;
  groupSelected: () => void;
  ungroupNode: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Project lifecycle
  setProjectName: (name: string) => void;
  saveProject: () => void;
  requestLoadProject: () => void;
  requestNewProject: () => void;
  requestResetDemo: () => void;
  exportProject: () => void;
  importProjectText: (text: string) => void;

  // Camera
  setCameraPoseFromControls: (pose: CameraPose) => void;
  applyCameraPreset: (preset: "front" | "top" | "side" | "isometric" | "reset") => void;
  focusSelected: () => void;

  // UI
  setTransforming: (value: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  showToast: (message: string, kind?: "info" | "error") => void;
  dismissToast: (id: number) => void;
  closeConfirm: () => void;
}

function snapshotOf(state: Pick<SceneState, "nodes" | "rootIds" | "selectedIds">): Snapshot {
  return {
    nodes: state.nodes,
    rootIds: state.rootIds,
    selectedIds: state.selectedIds,
  };
}

function pushPast(past: Snapshot[], snap: Snapshot): Snapshot[] {
  const next = [...past, snap];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

function onboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberOnboardingDismissed(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // Storage unavailable; the panel will simply reappear next visit.
  }
}

let toastCounter = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let dragSnapshot: Snapshot | null = null;

const sample = buildSampleScene();

export const useSceneStore = create<SceneState>()((set, get) => ({
  nodes: sample.nodes,
  rootIds: sample.rootIds,
  selectedIds: sample.selectedIds,
  activeTool: "translate",
  projectName: SAMPLE_PROJECT_NAME,
  // "saved" here means "no unsaved changes yet" — a fresh demo shouldn't nag.
  saveStatus: "saved",
  lastSavedAt: null,
  past: [],
  future: [],
  cameraPose: SAMPLE_CAMERA,
  cameraNonce: 0,
  focusNonce: 0,
  isTransforming: false,
  onboardingOpen: !onboardingDismissed(),
  aboutOpen: false,
  confirm: null,
  toast: null,

  selectNode: (id, additive = false) =>
    set((state) => {
      if (id === null) return { selectedIds: [] };
      if (!state.nodes[id]) return {};
      if (additive) {
        const has = state.selectedIds.includes(id);
        return {
          selectedIds: has
            ? state.selectedIds.filter((s) => s !== id)
            : [...state.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    }),

  selectFromViewport: (id, additive) => {
    const { nodes } = get();
    // Clicking any part of a grouped figure selects the whole top-level group,
    // matching how design tools treat grouped content.
    const target = topLevelAncestor(nodes, id);
    get().selectNode(target, additive);
  },

  setTool: (tool) => set({ activeTool: tool }),

  addPrimitive: (type) =>
    set((state) => {
      const node = createPrimitive(state.nodes, type);
      return {
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        nodes: { ...state.nodes, [node.id]: node },
        rootIds: [...state.rootIds, node.id],
        selectedIds: [node.id],
        activeTool: "translate",
        saveStatus: "unsaved",
      };
    }),

  updateNodePatch: (id, patch, recordHistory = true) =>
    set((state) => {
      const node = state.nodes[id];
      if (!node) return {};
      const nextNode = { ...node, ...patch } as SceneNodeData;
      return {
        ...(recordHistory ? { past: pushPast(state.past, snapshotOf(state)), future: [] } : {}),
        nodes: { ...state.nodes, [id]: nextNode },
        saveStatus: "unsaved",
      };
    }),

  setNodeTransform: (id, transform) =>
    set((state) => {
      const node = state.nodes[id];
      if (!node) return {};
      const safe = sanitizeTransform(transform);
      return {
        nodes: { ...state.nodes, [id]: { ...node, ...safe } },
        saveStatus: "unsaved",
      };
    }),

  beginTransformDrag: () => {
    dragSnapshot = snapshotOf(get());
    set({ isTransforming: true });
  },

  endTransformDrag: () => {
    const snap = dragSnapshot;
    dragSnapshot = null;
    set((state) => {
      if (!snap) return { isTransforming: false };
      const changed = snap.nodes !== state.nodes;
      return {
        isTransforming: false,
        ...(changed ? { past: pushPast(state.past, snap), future: [] } : {}),
      };
    });
  },

  renameNode: (id, name) => {
    const trimmed = name.trim().slice(0, 80);
    const node = get().nodes[id];
    if (!node || trimmed.length === 0 || trimmed === node.name) return;
    get().updateNodePatch(id, { name: trimmed });
  },

  resetNodeTransform: (id) => {
    const node = get().nodes[id];
    if (!node) return;
    const y = node.type === "plane" ? 0.01 : node.type === "group" ? 0 : 0.5;
    get().updateNodePatch(id, {
      position: [0, y, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  },

  duplicateSelected: () =>
    set((state) => {
      // Only duplicate top-level selections (a selected group brings its children).
      const roots = state.selectedIds.filter(
        (id) => state.nodes[id] && !state.selectedIds.includes(state.nodes[id].parentId ?? ""),
      );
      if (roots.length === 0) return {};
      const nodes: NodeMap = { ...state.nodes };
      const rootIds = [...state.rootIds];
      const newSelection: string[] = [];
      for (const id of roots) {
        const { cloned, newRootId } = cloneSubtree(state.nodes, id);
        for (const node of cloned) nodes[node.id] = node;
        const clonedRoot = nodes[newRootId];
        // Duplicates land as siblings of the original.
        clonedRoot.parentId = state.nodes[id].parentId;
        if (clonedRoot.parentId) {
          const parent = nodes[clonedRoot.parentId];
          if (isGroup(parent)) {
            nodes[parent.id] = { ...parent, childrenIds: [...parent.childrenIds, newRootId] };
          }
        } else {
          rootIds.push(newRootId);
        }
        newSelection.push(newRootId);
      }
      return {
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        nodes,
        rootIds,
        selectedIds: newSelection,
        saveStatus: "unsaved",
      };
    }),

  requestDeleteSelected: () => {
    const state = get();
    const ids = state.selectedIds.filter((id) => state.nodes[id]);
    if (ids.length === 0) return;
    const groupWithChildren = ids
      .map((id) => state.nodes[id])
      .find((n) => isGroup(n) && n.childrenIds.length > 0);
    if (groupWithChildren && isGroup(groupWithChildren)) {
      set({
        confirm: {
          title: `Delete "${groupWithChildren.name}"?`,
          message: `This group contains ${groupWithChildren.childrenIds.length} object${
            groupWithChildren.childrenIds.length === 1 ? "" : "s"
          }. Delete the group and its contents, or ungroup to keep the objects.`,
          confirmLabel: "Delete group and contents",
          danger: true,
          altLabel: "Ungroup and keep objects",
          onConfirm: () => {
            get().closeConfirm();
            deleteNodes(set, get, ids);
          },
          onAlt: () => {
            get().closeConfirm();
            get().ungroupNode(groupWithChildren.id);
          },
        },
      });
      return;
    }
    deleteNodes(set, get, ids);
  },

  groupSelected: () =>
    set((state) => {
      const ids = state.selectedIds.filter((id) => state.nodes[id]);
      if (ids.length < 2) return {};
      const parentId = state.nodes[ids[0]].parentId;
      if (!ids.every((id) => state.nodes[id].parentId === parentId)) {
        queueToast(set, "Objects must share the same parent to be grouped.", "error");
        return {};
      }
      // Prevent grouping a node with its own ancestor.
      for (const id of ids) {
        const node = state.nodes[id];
        if (isGroup(node)) {
          const subtree = collectSubtree(state.nodes, id).map((n) => n.id);
          if (ids.some((other) => other !== id && subtree.includes(other))) {
            queueToast(set, "Cannot group an object with its own group.", "error");
            return {};
          }
        }
      }

      const centroid: Vec3 = [0, 0, 0];
      for (const id of ids) {
        const p = state.nodes[id].position;
        centroid[0] += p[0] / ids.length;
        centroid[1] += p[1] / ids.length;
        centroid[2] += p[2] / ids.length;
      }
      const group = createGroup(state.nodes, centroid.map((v) => Math.round(v * 1000) / 1000) as Vec3);
      group.parentId = parentId;
      group.childrenIds = [...ids];

      const nodes: NodeMap = { ...state.nodes, [group.id]: group };
      for (const id of ids) {
        const node = nodes[id];
        // Group starts with identity rotation/scale, so children keep their
        // world placement by subtracting the group's position.
        nodes[id] = {
          ...node,
          parentId: group.id,
          position: [
            round5(node.position[0] - group.position[0]),
            round5(node.position[1] - group.position[1]),
            round5(node.position[2] - group.position[2]),
          ],
        };
      }

      let rootIds = state.rootIds;
      if (parentId === null) {
        rootIds = [...state.rootIds.filter((id) => !ids.includes(id)), group.id];
      } else {
        const parent = nodes[parentId];
        if (isGroup(parent)) {
          nodes[parentId] = {
            ...parent,
            childrenIds: [...parent.childrenIds.filter((id) => !ids.includes(id)), group.id],
          };
        }
      }

      return {
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        nodes,
        rootIds,
        selectedIds: [group.id],
        saveStatus: "unsaved",
      };
    }),

  ungroupNode: (id) =>
    set((state) => {
      const group = state.nodes[id];
      if (!group || !isGroup(group)) return {};
      const parentId = group.parentId;
      const parentWorld = parentId ? worldMatrixOf(state.nodes, parentId) : new Matrix4();
      const nodes: NodeMap = { ...state.nodes };

      // Re-express each child relative to the group's parent so world-space
      // placement is preserved even when the group is rotated or scaled.
      for (const childId of group.childrenIds) {
        const childWorld = worldMatrixOf(state.nodes, childId);
        const local = relativeTo(parentWorld, childWorld);
        nodes[childId] = { ...nodes[childId], parentId, ...local };
      }
      delete nodes[id];

      let rootIds = state.rootIds;
      if (parentId === null) {
        const index = state.rootIds.indexOf(id);
        rootIds = [...state.rootIds];
        rootIds.splice(index === -1 ? rootIds.length : index, 1, ...group.childrenIds);
      } else {
        const parent = nodes[parentId];
        if (isGroup(parent)) {
          const childrenIds = parent.childrenIds.flatMap((c) => (c === id ? group.childrenIds : [c]));
          nodes[parentId] = { ...parent, childrenIds };
        }
      }

      return {
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        nodes,
        rootIds,
        selectedIds: [...group.childrenIds],
        saveStatus: "unsaved",
      };
    }),

  undo: () =>
    set((state) => {
      const prev = state.past[state.past.length - 1];
      if (!prev) return {};
      return {
        past: state.past.slice(0, -1),
        future: [...state.future, snapshotOf(state)],
        nodes: prev.nodes,
        rootIds: prev.rootIds,
        selectedIds: prev.selectedIds.filter((id) => prev.nodes[id]),
        saveStatus: "unsaved",
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[state.future.length - 1];
      if (!next) return {};
      return {
        future: state.future.slice(0, -1),
        past: pushPast(state.past, snapshotOf(state)),
        nodes: next.nodes,
        rootIds: next.rootIds,
        selectedIds: next.selectedIds.filter((id) => next.nodes[id]),
        saveStatus: "unsaved",
      };
    }),

  setProjectName: (name) => {
    const trimmed = name.trim().slice(0, 80);
    if (trimmed.length === 0 || trimmed === get().projectName) return;
    set({ projectName: trimmed, saveStatus: "unsaved" });
  },

  saveProject: () => {
    const state = get();
    const file = buildProjectFile(state.projectName, state.nodes, state.rootIds, state.cameraPose);
    const result = saveProjectToStorage(file);
    if (result.ok) {
      set({ saveStatus: "saved", lastSavedAt: file.savedAt });
      queueToast(set, "Project saved to this browser.");
    } else {
      set({ saveStatus: "error" });
      queueToast(set, result.error, "error");
    }
  },

  requestLoadProject: () => {
    const apply = () => {
      const result = loadProjectFromStorage();
      if (!result.ok) {
        queueToast(set, result.error, result.empty ? "info" : "error");
        return;
      }
      const { project, savedAt } = result;
      set((state) => ({
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        nodes: project.nodes,
        rootIds: project.rootIds,
        selectedIds: [],
        projectName: project.projectName,
        cameraPose: project.camera,
        cameraNonce: state.cameraNonce + 1,
        saveStatus: "saved",
        lastSavedAt: savedAt,
      }));
      queueToast(set, `Loaded "${result.project.projectName}".`);
    };
    guardUnsaved(set, get, "Load saved project", "Loading will replace your unsaved changes.", apply);
  },

  requestNewProject: () => {
    const apply = () =>
      set((state) => ({
        past: [],
        future: [],
        nodes: {},
        rootIds: [],
        selectedIds: [],
        projectName: "Untitled Project",
        cameraPose: SAMPLE_CAMERA,
        cameraNonce: state.cameraNonce + 1,
        activeTool: "select",
        saveStatus: "unsaved",
      }));
    guardUnsaved(set, get, "Start a new project", "Starting a new project will discard unsaved changes.", apply);
  },

  requestResetDemo: () => {
    const apply = () => {
      const fresh = buildSampleScene();
      set((state) => ({
        past: [],
        future: [],
        nodes: fresh.nodes,
        rootIds: fresh.rootIds,
        selectedIds: fresh.selectedIds,
        projectName: SAMPLE_PROJECT_NAME,
        cameraPose: SAMPLE_CAMERA,
        cameraNonce: state.cameraNonce + 1,
        activeTool: "translate",
        saveStatus: "saved",
        onboardingOpen: true,
      }));
      queueToast(set, "Demo scene restored.");
    };
    guardUnsaved(set, get, "Reset the demo scene", "Resetting will discard unsaved changes.", apply);
  },

  exportProject: () => {
    const state = get();
    try {
      const file = buildProjectFile(state.projectName, state.nodes, state.rootIds, state.cameraPose);
      downloadJson(`${sanitizeFilename(state.projectName)}.json`, file);
    } catch {
      queueToast(set, "Export failed. Your browser blocked the download.", "error");
    }
  },

  importProjectText: (text) => {
    let project;
    try {
      project = parseImportedJson(text);
    } catch (err) {
      queueToast(set, err instanceof Error ? err.message : "Import failed.", "error");
      return;
    }
    set((state) => ({
      past: pushPast(state.past, snapshotOf(state)),
      future: [],
      nodes: project.nodes,
      rootIds: project.rootIds,
      selectedIds: [],
      projectName: project.projectName,
      cameraPose: project.camera,
      cameraNonce: state.cameraNonce + 1,
      saveStatus: "unsaved",
    }));
    queueToast(set, `Imported "${project.projectName}".`);
  },

  setCameraPoseFromControls: (pose) => set({ cameraPose: pose }),

  applyCameraPreset: (preset) =>
    set((state) => {
      const target: Vec3 = preset === "reset" ? [...SAMPLE_CAMERA.target] : [...state.cameraPose.target];
      const d = 10;
      const poses: Record<typeof preset, Vec3> = {
        front: [target[0], target[1] + 0.6, target[2] + d],
        side: [target[0] + d, target[1] + 0.6, target[2]],
        top: [target[0], target[1] + d, target[2] + 0.001],
        isometric: [target[0] + d * 0.66, target[1] + d * 0.55, target[2] + d * 0.66],
        reset: [...SAMPLE_CAMERA.position],
      };
      return {
        cameraPose: { position: poses[preset], target },
        cameraNonce: state.cameraNonce + 1,
      };
    }),

  focusSelected: () =>
    set((state) => (state.selectedIds.length > 0 ? { focusNonce: state.focusNonce + 1 } : {})),

  setTransforming: (value) => set({ isTransforming: value }),

  setOnboardingOpen: (open) => {
    if (!open) rememberOnboardingDismissed();
    set({ onboardingOpen: open });
  },

  setAboutOpen: (open) => set({ aboutOpen: open }),

  showToast: (message, kind = "info") => queueToast(set, message, kind),

  dismissToast: (id) => set((state) => (state.toast?.id === id ? { toast: null } : {})),

  closeConfirm: () => set({ confirm: null }),
}));

type Set = (
  partial:
    | Partial<SceneState>
    | ((state: SceneState) => Partial<SceneState>),
) => void;
type Get = () => SceneState;

function deleteNodes(set: Set, get: Get, ids: string[]): void {
  set((state) => {
    const toDelete = new Set<string>();
    for (const id of ids) {
      for (const node of collectSubtree(state.nodes, id)) toDelete.add(node.id);
    }
    if (toDelete.size === 0) return {};
    const nodes: NodeMap = {};
    for (const [id, node] of Object.entries(state.nodes)) {
      if (toDelete.has(id)) continue;
      if (isGroup(node)) {
        nodes[id] = { ...node, childrenIds: node.childrenIds.filter((c) => !toDelete.has(c)) };
      } else {
        nodes[id] = node;
      }
    }
    return {
      past: pushPast(state.past, snapshotOf(state)),
      future: [],
      nodes,
      rootIds: state.rootIds.filter((id) => !toDelete.has(id)),
      selectedIds: [],
      saveStatus: "unsaved",
    };
  });
  void get;
}

function guardUnsaved(set: Set, get: Get, title: string, message: string, apply: () => void): void {
  const state = get();
  const hasContent = Object.keys(state.nodes).length > 0;
  if (state.saveStatus === "unsaved" && hasContent) {
    set({
      confirm: {
        title,
        message,
        confirmLabel: "Continue",
        onConfirm: () => {
          get().closeConfirm();
          apply();
        },
      },
    });
  } else {
    apply();
  }
}

function queueToast(set: Set, message: string, kind: "info" | "error" = "info"): void {
  toastCounter += 1;
  const id = toastCounter;
  set({ toast: { id, message, kind } });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    set((state) => (state.toast?.id === id ? { toast: null } : {}));
  }, 4000);
}

function sanitizeTransform(t: { position: Vec3; rotation: Vec3; scale: Vec3 }): {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
} {
  const safeNum = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);
  const safeScale = (n: number) => {
    const v = Number.isFinite(n) ? n : 1;
    const magnitude = Math.max(Math.abs(v), 0.01);
    return v < 0 ? -magnitude : magnitude;
  };
  return {
    position: t.position.map((n) => safeNum(n, 0)) as Vec3,
    rotation: t.rotation.map((n) => safeNum(n, 0)) as Vec3,
    scale: t.scale.map(safeScale) as Vec3,
  };
}

function round5(n: number): number {
  const r = Math.round(n * 100000) / 100000;
  return Object.is(r, -0) ? 0 : r;
}

/** Derived counts for the status bar. */
export function countNodes(nodes: NodeMap): { objects: number; groups: number } {
  let objects = 0;
  let groups = 0;
  for (const node of Object.values(nodes)) {
    if (node.type === "group") groups += 1;
    else objects += 1;
  }
  return { objects, groups };
}
