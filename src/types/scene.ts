export type Vec3 = [number, number, number];

export type PrimitiveObjectType = "cube" | "sphere" | "cylinder" | "cone" | "plane";

export type SceneNodeType = PrimitiveObjectType | "group";

export interface SceneObjectData {
  id: string;
  name: string;
  type: PrimitiveObjectType;
  parentId: string | null;
  position: Vec3;
  rotation: Vec3; // Euler XYZ, radians
  scale: Vec3;
  color: string; // hex, e.g. "#8a9bb0"
  visible: boolean;
  wireframe: boolean;
}

export interface SceneGroupData {
  id: string;
  name: string;
  type: "group";
  parentId: string | null;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  childrenIds: string[];
}

export type SceneNodeData = SceneObjectData | SceneGroupData;

export type NodeMap = Record<string, SceneNodeData>;

export type ToolMode = "select" | "translate" | "rotate" | "scale";

export function isGroup(node: SceneNodeData): node is SceneGroupData {
  return node.type === "group";
}

export function isObject(node: SceneNodeData): node is SceneObjectData {
  return node.type !== "group";
}
