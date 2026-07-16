import type { CameraPose } from "../types/project";
import type { NodeMap, SceneGroupData, SceneObjectData } from "../types/scene";

export const SAMPLE_PROJECT_NAME = "Sample Scene";

export const SAMPLE_CAMERA: CameraPose = {
  position: [7.5, 5.5, 8.5],
  target: [0, 0.9, 0],
};

interface SampleScene {
  nodes: NodeMap;
  rootIds: string[];
  selectedIds: string[];
}

/**
 * The scene visitors see when the demo loads: three primitives and a
 * hierarchical three-sphere figure that demonstrates parent-child grouping.
 * Ids are stable so Reset Demo is deterministic.
 */
export function buildSampleScene(): SampleScene {
  const cube: SceneObjectData = {
    id: "sample-cube",
    name: "Cube 1",
    type: "cube",
    parentId: null,
    position: [2.4, 0.5, 1.6],
    rotation: [0, 0.5236, 0], // 30°
    scale: [1, 1, 1],
    color: "#8a9bb0",
    visible: true,
    wireframe: false,
  };

  const sphere: SceneObjectData = {
    id: "sample-sphere",
    name: "Sphere 1",
    type: "sphere",
    parentId: null,
    position: [-2.6, 0.55, 2.2],
    rotation: [0, 0, 0],
    scale: [1.1, 1.1, 1.1],
    color: "#b0876a",
    visible: true,
    wireframe: false,
  };

  const cone: SceneObjectData = {
    id: "sample-cone",
    name: "Cone 1",
    type: "cone",
    parentId: null,
    position: [1.1, 0.7, -2.4],
    rotation: [0, 0, 0],
    scale: [0.9, 1.4, 0.9],
    color: "#7d9c86",
    visible: true,
    wireframe: false,
  };

  const figure: SceneGroupData = {
    id: "sample-figure",
    name: "Snow Figure",
    type: "group",
    parentId: null,
    position: [-1.9, 0, -1.9],
    rotation: [0, 0.6, 0],
    scale: [1, 1, 1],
    visible: true,
    childrenIds: ["sample-figure-base", "sample-figure-body", "sample-figure-head"],
  };

  const base: SceneObjectData = {
    id: "sample-figure-base",
    name: "Base Sphere",
    type: "sphere",
    parentId: figure.id,
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#e4e6e9",
    visible: true,
    wireframe: false,
  };

  const body: SceneObjectData = {
    id: "sample-figure-body",
    name: "Body Sphere",
    type: "sphere",
    parentId: figure.id,
    position: [0, 1.2, 0],
    rotation: [0, 0, 0],
    scale: [0.72, 0.72, 0.72],
    color: "#e4e6e9",
    visible: true,
    wireframe: false,
  };

  const head: SceneObjectData = {
    id: "sample-figure-head",
    name: "Head Sphere",
    type: "sphere",
    parentId: figure.id,
    position: [0, 1.75, 0],
    rotation: [0, 0, 0],
    scale: [0.5, 0.5, 0.5],
    color: "#e4e6e9",
    visible: true,
    wireframe: false,
  };

  const nodes: NodeMap = {};
  for (const node of [cube, sphere, cone, figure, base, body, head]) {
    nodes[node.id] = node;
  }
  return {
    nodes,
    rootIds: [cube.id, sphere.id, cone.id, figure.id],
    selectedIds: [cube.id],
  };
}
