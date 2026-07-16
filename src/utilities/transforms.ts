import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { NodeMap, Vec3 } from "../types/scene";

export interface TransformTriple {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

function localMatrix(t: TransformTriple): Matrix4 {
  const q = new Quaternion().setFromEuler(new Euler(...t.rotation, "XYZ"));
  return new Matrix4().compose(
    new Vector3(...t.position),
    q,
    new Vector3(...t.scale),
  );
}

/** World matrix of a node, walking up its parent chain. */
export function worldMatrixOf(nodes: NodeMap, id: string): Matrix4 {
  const chain: Matrix4[] = [];
  let current: string | null = id;
  while (current) {
    const node: NodeMap[string] | undefined = nodes[current];
    if (!node) break;
    chain.push(localMatrix(node));
    current = node.parentId;
  }
  const world = new Matrix4();
  for (let i = chain.length - 1; i >= 0; i -= 1) world.multiply(chain[i]);
  return world;
}

/** Decompose a matrix back into serializable position / rotation / scale. */
export function decompose(matrix: Matrix4): TransformTriple {
  const p = new Vector3();
  const q = new Quaternion();
  const s = new Vector3();
  matrix.decompose(p, q, s);
  const e = new Euler().setFromQuaternion(q, "XYZ");
  return {
    position: [clean(p.x), clean(p.y), clean(p.z)],
    rotation: [clean(e.x), clean(e.y), clean(e.z)],
    scale: [clean(s.x), clean(s.y), clean(s.z)],
  };
}

/** Express a node's world transform relative to a new parent matrix. */
export function relativeTo(parentWorld: Matrix4, childWorld: Matrix4): TransformTriple {
  const inv = parentWorld.clone().invert();
  return decompose(inv.multiply(childWorld));
}

function clean(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 100000) / 100000;
  return Object.is(rounded, -0) ? 0 : rounded;
}
