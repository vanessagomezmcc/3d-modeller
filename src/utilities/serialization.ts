import type { CameraPose, ProjectFile } from "../types/project";
import { PROJECT_APP_ID, PROJECT_VERSION } from "../types/project";
import type { NodeMap } from "../types/scene";
import { validateProject, type ValidatedProject } from "./validation";

const STORAGE_KEY = "3d-modeller:project:v1";
export const ONBOARDING_KEY = "3d-modeller:onboarding-dismissed";

export function buildProjectFile(
  projectName: string,
  nodes: NodeMap,
  rootIds: string[],
  camera: CameraPose,
): ProjectFile {
  return {
    app: PROJECT_APP_ID,
    version: PROJECT_VERSION,
    projectName,
    savedAt: new Date().toISOString(),
    nodes: Object.values(nodes),
    rootIds,
    camera,
  };
}

export function saveProjectToStorage(project: ProjectFile): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === "QuotaExceededError"
        ? "Browser storage is full. Export the project as JSON instead."
        : "Browser storage is unavailable in this context.";
    return { ok: false, error: message };
  }
}

export function loadProjectFromStorage():
  | { ok: true; project: ValidatedProject; savedAt: string | null }
  | { ok: false; error: string; empty?: boolean } {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { ok: false, error: "Browser storage is unavailable in this context." };
  }
  if (!raw) return { ok: false, empty: true, error: "No saved project was found in this browser." };
  try {
    const parsed: unknown = JSON.parse(raw);
    const project = validateProject(parsed);
    const savedAt =
      parsed !== null && typeof parsed === "object" && typeof (parsed as ProjectFile).savedAt === "string"
        ? (parsed as ProjectFile).savedAt
        : null;
    return { ok: true, project, savedAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Saved project is invalid: ${err.message}` : "Saved project is corrupted.",
    };
  }
}

export function hasStoredProject(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function parseImportedJson(text: string): ValidatedProject {
  if (text.length > 4_000_000) {
    throw new Error("The file is too large to import (4 MB limit).");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  return validateProject(parsed);
}
