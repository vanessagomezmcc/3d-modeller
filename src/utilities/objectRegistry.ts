import type { Object3D } from "three";

// Three.js objects are intentionally kept out of the Zustand store; only
// serializable data lives there. This registry lets the transform gizmo and
// camera focus find the live Object3D for a given node id.
const registry = new Map<string, Object3D>();

export function registerObject(id: string, object: Object3D): void {
  registry.set(id, object);
}

export function unregisterObject(id: string, object: Object3D): void {
  if (registry.get(id) === object) registry.delete(id);
}

export function getObject(id: string): Object3D | undefined {
  return registry.get(id);
}
