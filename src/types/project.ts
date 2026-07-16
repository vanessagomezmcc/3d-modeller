import type { SceneNodeData, Vec3 } from "./scene";

export const PROJECT_APP_ID = "3d-modeller";
export const PROJECT_VERSION = 1;

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export interface ProjectFile {
  app: typeof PROJECT_APP_ID;
  version: number;
  projectName: string;
  savedAt: string; // ISO timestamp
  nodes: SceneNodeData[];
  rootIds: string[];
  camera: CameraPose;
}

export type SaveStatus = "saved" | "unsaved" | "error";
