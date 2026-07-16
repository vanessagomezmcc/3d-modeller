/**
 * Functional tests for the non-rendering logic: store actions, history,
 * grouping math, and project validation. Run with: npx tsx scripts/logic-tests.ts
 */
import { useSceneStore } from "../src/store/useSceneStore";
import { validateProject, ProjectValidationError } from "../src/utilities/validation";
import { buildProjectFile, parseImportedJson } from "../src/utilities/serialization";
import { worldMatrixOf, decompose } from "../src/utilities/transforms";
import { isGroup } from "../src/types/scene";
import { Vector3 } from "three";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function approx(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) < eps;
}

const store = useSceneStore;
const initial = store.getState();

console.log("Sample scene");
test("sample scene has 7 nodes and 4 roots", () => {
  assert(Object.keys(initial.nodes).length === 7, "expected 7 nodes");
  assert(initial.rootIds.length === 4, "expected 4 roots");
});
test("snow figure is a group with 3 sphere children", () => {
  const figure = initial.nodes["sample-figure"];
  assert(figure && isGroup(figure), "figure missing");
  assert(figure.childrenIds.length === 3, "expected 3 children");
  assert(
    figure.childrenIds.every((id) => initial.nodes[id]?.type === "sphere"),
    "children must be spheres",
  );
});
test("one object selected by default", () => {
  assert(initial.selectedIds.length === 1, "expected default selection");
});

console.log("Add / undo / redo");
test("addPrimitive adds, selects, switches to move, marks unsaved", () => {
  store.getState().addPrimitive("cylinder");
  const s = store.getState();
  assert(Object.keys(s.nodes).length === 8, "node not added");
  assert(s.selectedIds.length === 1, "new node not selected");
  assert(s.nodes[s.selectedIds[0]].type === "cylinder", "wrong type selected");
  assert(s.activeTool === "translate", "move tool not active");
  assert(s.saveStatus === "unsaved", "not marked unsaved");
});
test("undo removes the added node, redo restores it", () => {
  store.getState().undo();
  assert(Object.keys(store.getState().nodes).length === 7, "undo failed");
  store.getState().redo();
  assert(Object.keys(store.getState().nodes).length === 8, "redo failed");
  store.getState().undo();
});
test("a new action clears redo history", () => {
  store.getState().addPrimitive("cone");
  store.getState().undo();
  assert(store.getState().future.length === 1, "future should have one entry");
  store.getState().addPrimitive("plane");
  assert(store.getState().future.length === 0, "future not cleared");
  store.getState().undo();
});

console.log("Selection behavior");
test("viewport click on a grouped child selects the top-level group", () => {
  store.getState().selectFromViewport("sample-figure-head", false);
  assert(store.getState().selectedIds[0] === "sample-figure", "did not select group");
});
test("shift-click toggles selection membership", () => {
  store.getState().selectNode("sample-cube", false);
  store.getState().selectNode("sample-sphere", true);
  assert(store.getState().selectedIds.length === 2, "additive select failed");
  store.getState().selectNode("sample-sphere", true);
  assert(store.getState().selectedIds.length === 1, "toggle-off failed");
});

console.log("Grouping");
test("grouping two roots preserves world position", () => {
  const before = store.getState();
  const cubeWorld = new Vector3(...(before.nodes["sample-cube"].position));
  store.getState().selectNode("sample-cube", false);
  store.getState().selectNode("sample-sphere", true);
  store.getState().groupSelected();
  const s = store.getState();
  const groupId = s.selectedIds[0];
  const group = s.nodes[groupId];
  assert(group && isGroup(group), "group not created/selected");
  assert(group.childrenIds.length === 2, "group should have 2 children");
  const world = decompose(worldMatrixOf(s.nodes, "sample-cube"));
  assert(
    approx(world.position[0], cubeWorld.x) &&
      approx(world.position[1], cubeWorld.y) &&
      approx(world.position[2], cubeWorld.z),
    `cube world position changed: ${world.position} vs ${cubeWorld.toArray()}`,
  );
  assert(!s.rootIds.includes("sample-cube"), "child still listed as root");
});
test("ungrouping a rotated group preserves world placement", () => {
  const s0 = store.getState();
  const groupId = s0.selectedIds[0];
  // Rotate and move the group, then ungroup.
  store.getState().updateNodePatch(groupId, {
    rotation: [0, Math.PI / 4, 0],
    position: [3, 1, -2],
    scale: [1.5, 1.5, 1.5],
  });
  const worldBefore = decompose(worldMatrixOf(store.getState().nodes, "sample-cube"));
  store.getState().ungroupNode(groupId);
  const s1 = store.getState();
  assert(!s1.nodes[groupId], "group not removed");
  assert(s1.nodes["sample-cube"].parentId === null, "child not reparented to root");
  const worldAfter = decompose(worldMatrixOf(s1.nodes, "sample-cube"));
  for (let i = 0; i < 3; i += 1) {
    assert(
      approx(worldBefore.position[i], worldAfter.position[i], 1e-3),
      `world position drifted on axis ${i}: ${worldBefore.position[i]} -> ${worldAfter.position[i]}`,
    );
    assert(
      approx(worldBefore.scale[i], worldAfter.scale[i], 1e-3),
      `world scale drifted on axis ${i}`,
    );
  }
});
test("undoing twice restores pre-grouping state", () => {
  store.getState().undo(); // ungroup
  store.getState().undo(); // transform patch
  store.getState().undo(); // group
  const s = store.getState();
  assert(s.nodes["sample-cube"].parentId === null, "cube should be root again");
  assert(s.rootIds.includes("sample-cube"), "cube missing from roots");
  assert(Object.keys(s.nodes).length === 7, "node count wrong after undo chain");
});
test("grouping nodes with different parents is rejected", () => {
  store.getState().selectNode("sample-cube", false);
  store.getState().selectNode("sample-figure-head", true);
  const before = Object.keys(store.getState().nodes).length;
  store.getState().groupSelected();
  assert(Object.keys(store.getState().nodes).length === before, "group should not be created");
  assert(store.getState().toast?.kind === "error", "expected error toast");
});

console.log("Duplicate / delete");
test("duplicating a group clones the whole subtree with fresh ids", () => {
  store.getState().selectNode("sample-figure", false);
  const before = Object.keys(store.getState().nodes).length;
  store.getState().duplicateSelected();
  const s = store.getState();
  assert(Object.keys(s.nodes).length === before + 4, "expected 4 new nodes");
  const newId = s.selectedIds[0];
  assert(newId !== "sample-figure", "selection should be the clone");
  const clone = s.nodes[newId];
  assert(clone && isGroup(clone) && clone.childrenIds.length === 3, "clone children missing");
  assert(clone.name === "Snow Figure copy", "clone name unexpected: " + clone.name);
  const ids = new Set(Object.keys(s.nodes));
  assert(ids.size === Object.keys(s.nodes).length, "duplicate ids present");
  store.getState().undo();
});
test("deleting a childless selection removes it and clears selection", () => {
  store.getState().addPrimitive("cube");
  const id = store.getState().selectedIds[0];
  store.getState().requestDeleteSelected();
  const s = store.getState();
  assert(!s.nodes[id], "node not deleted");
  assert(s.selectedIds.length === 0, "selection not cleared");
  assert(s.confirm === null, "no confirm expected for plain object");
  store.getState().undo();
  assert(store.getState().nodes[id], "undo of delete failed");
  store.getState().undo();
});
test("deleting a populated group asks for confirmation; confirm removes subtree", () => {
  store.getState().selectNode("sample-figure", false);
  store.getState().requestDeleteSelected();
  const s = store.getState();
  assert(s.confirm !== null, "confirm dialog expected");
  s.confirm?.onConfirm();
  const after = store.getState();
  assert(!after.nodes["sample-figure"], "group not deleted");
  assert(!after.nodes["sample-figure-head"], "children left orphaned");
  assert(after.confirm === null, "confirm not closed");
  store.getState().undo();
  assert(store.getState().nodes["sample-figure-head"], "undo delete failed");
});
test("deleting a populated group via the alt action ungroups instead", () => {
  store.getState().selectNode("sample-figure", false);
  store.getState().requestDeleteSelected();
  store.getState().confirm?.onAlt?.();
  const s = store.getState();
  assert(!s.nodes["sample-figure"], "group should be gone");
  assert(s.nodes["sample-figure-head"]?.parentId === null, "children should be roots");
  store.getState().undo();
});

console.log("Transforms sanitization");
test("setNodeTransform rejects NaN and clamps zero scale", () => {
  store.getState().selectNode("sample-cube", false);
  store.getState().setNodeTransform("sample-cube", {
    position: [Number.NaN, 2, Number.POSITIVE_INFINITY],
    rotation: [0, Number.NaN, 0],
    scale: [0, -0.5, Number.NaN],
  });
  const node = store.getState().nodes["sample-cube"];
  assert(node.position.every(Number.isFinite), "position not sanitized");
  assert(node.rotation.every(Number.isFinite), "rotation not sanitized");
  assert(node.scale[0] >= 0.01, "zero scale not clamped");
  assert(node.scale[1] <= -0.01, "negative scale magnitude not preserved/clamped");
  assert(Number.isFinite(node.scale[2]), "NaN scale not replaced");
});
test("drag begin/end produces exactly one history entry", () => {
  const depth = store.getState().past.length;
  store.getState().beginTransformDrag();
  store.getState().setNodeTransform("sample-cube", {
    position: [1, 0.5, 1],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  store.getState().setNodeTransform("sample-cube", {
    position: [2, 0.5, 2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  store.getState().endTransformDrag();
  assert(store.getState().past.length === depth + 1, "expected exactly one history entry");
  store.getState().undo();
});
test("no history entry when a drag changes nothing", () => {
  const depth = store.getState().past.length;
  store.getState().beginTransformDrag();
  store.getState().endTransformDrag();
  assert(store.getState().past.length === depth, "empty drag recorded history");
});

console.log("Serialization round-trip");
test("export -> import preserves the scene", () => {
  const s = store.getState();
  const file = buildProjectFile(s.projectName, s.nodes, s.rootIds, s.cameraPose);
  const text = JSON.stringify(file);
  const imported = parseImportedJson(text);
  assert(Object.keys(imported.nodes).length === Object.keys(s.nodes).length, "node count changed");
  assert(imported.rootIds.length === s.rootIds.length, "root count changed");
  assert(imported.projectName === s.projectName, "name changed");
});

console.log("Validation");
const baseNode = {
  id: "a",
  name: "Cube 1",
  type: "cube",
  parentId: null,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  color: "#ff0000",
  visible: true,
  wireframe: false,
};
function expectReject(name: string, payload: unknown, fragment: string): void {
  test(name, () => {
    try {
      validateProject(payload);
    } catch (err) {
      assert(err instanceof ProjectValidationError, "wrong error type");
      assert(
        err.message.toLowerCase().includes(fragment.toLowerCase()),
        `message "${err.message}" missing "${fragment}"`,
      );
      return;
    }
    throw new Error("expected rejection");
  });
}

expectReject("rejects non-object", 42, "project object");
expectReject("rejects missing version", { nodes: [] }, "version");
expectReject("rejects future version", { version: 99, nodes: [] }, "unsupported");
expectReject("rejects non-array nodes", { version: 1, nodes: {} }, "array");
expectReject(
  "rejects duplicate ids",
  { version: 1, nodes: [baseNode, { ...baseNode }] },
  "duplicate",
);
expectReject(
  "rejects unknown node type",
  { version: 1, nodes: [{ ...baseNode, type: "torus" }] },
  "unknown type",
);
expectReject(
  "rejects bad vector length",
  { version: 1, nodes: [{ ...baseNode, position: [1, 2] }] },
  "3 finite numbers",
);
expectReject(
  "rejects NaN in vectors",
  { version: 1, nodes: [{ ...baseNode, position: [1, null, 3] }] },
  "finite",
);
expectReject(
  "rejects invalid color",
  { version: 1, nodes: [{ ...baseNode, color: 123 }] },
  "color",
);
expectReject(
  "rejects missing group child reference",
  {
    version: 1,
    nodes: [
      {
        id: "g",
        name: "Group 1",
        type: "group",
        parentId: null,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        childrenIds: ["ghost"],
      },
    ],
  },
  "missing child",
);
expectReject(
  "rejects a child with two parents",
  {
    version: 1,
    nodes: [
      { ...baseNode, id: "child", parentId: "g1" },
      {
        id: "g1", name: "G1", type: "group", parentId: null,
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        visible: true, childrenIds: ["child"],
      },
      {
        id: "g2", name: "G2", type: "group", parentId: null,
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        visible: true, childrenIds: ["child"],
      },
    ],
  },
  "more than one group",
);
expectReject(
  "rejects cyclic groups",
  {
    version: 1,
    nodes: [
      {
        id: "g1", name: "G1", type: "group", parentId: "g2",
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        visible: true, childrenIds: ["g2"],
      },
      {
        id: "g2", name: "G2", type: "group", parentId: "g1",
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        visible: true, childrenIds: ["g1"],
      },
    ],
  },
  "cyclic",
);
test("rejects invalid JSON text with a clear message", () => {
  try {
    parseImportedJson("{not json");
  } catch (err) {
    assert(err instanceof Error && err.message.includes("not valid JSON"), "wrong message");
    return;
  }
  throw new Error("expected rejection");
});
test("repairs a stale parentId when group lists disagree", () => {
  const result = validateProject({
    version: 1,
    nodes: [{ ...baseNode, parentId: "nonexistent" }],
    rootIds: [],
  });
  assert(result.nodes["a"].parentId === null, "parentId not repaired");
  assert(result.rootIds.includes("a"), "root not recovered");
});
test("clamps near-zero scale on import", () => {
  const result = validateProject({
    version: 1,
    nodes: [{ ...baseNode, scale: [0, 1, 1] }],
  });
  assert(result.nodes["a"].scale[0] >= 0.001, "scale not clamped");
});

console.log("Project lifecycle");
test("new project clears the scene and history without confirm when clean", () => {
  store.getState().requestResetDemo();
  if (store.getState().confirm) store.getState().confirm?.onConfirm();
  assert(store.getState().saveStatus === "saved", "reset demo should be clean");
  store.getState().requestNewProject();
  assert(store.getState().confirm === null, "clean state should not prompt");
  const s = store.getState();
  assert(Object.keys(s.nodes).length === 0, "scene not cleared");
  assert(s.past.length === 0 && s.future.length === 0, "history not cleared");
  assert(s.projectName === "Untitled Project", "name not reset");
});
test("reset demo restores the exact sample scene", () => {
  store.getState().requestResetDemo();
  if (store.getState().confirm) store.getState().confirm?.onConfirm();
  const s = store.getState();
  assert(Object.keys(s.nodes).length === 7, "sample not restored");
  assert(s.nodes["sample-figure"] !== undefined, "figure missing");
  assert(s.projectName === "Sample Scene", "name not restored");
});
test("dirty state triggers a confirm before destructive load", () => {
  store.getState().addPrimitive("cube");
  store.getState().requestNewProject();
  assert(store.getState().confirm !== null, "expected confirmation");
  store.getState().closeConfirm();
  // Scene unchanged after cancel:
  assert(Object.keys(store.getState().nodes).length === 8, "cancel should keep scene");
});

console.log("History limits");
test("history is capped", () => {
  store.getState().requestResetDemo();
  store.getState().confirm?.onConfirm();
  for (let i = 0; i < 120; i += 1) {
    store.getState().updateNodePatch("sample-cube", { position: [i * 0.01, 0.5, 0] });
  }
  assert(store.getState().past.length <= 80, `history overflow: ${store.getState().past.length}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
