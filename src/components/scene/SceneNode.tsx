import { useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import type { PrimitiveObjectType, SceneObjectData } from "../../types/scene";
import { isGroup } from "../../types/scene";
import { useSceneStore } from "../../store/useSceneStore";
import { registerObject, unregisterObject } from "../../utilities/objectRegistry";

// One shared geometry per primitive type for the whole app.
const GEOMETRIES: Record<PrimitiveObjectType, BoxGeometry | SphereGeometry | CylinderGeometry | ConeGeometry | PlaneGeometry> =
  {
    cube: new BoxGeometry(1, 1, 1),
    sphere: new SphereGeometry(0.5, 40, 28),
    cylinder: new CylinderGeometry(0.5, 0.5, 1, 40),
    cone: new ConeGeometry(0.5, 1, 40),
    // Pre-rotated to lie flat so the stored rotation maps 1:1 to the gizmo.
    plane: new PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
  };

const ACCENT = "#e8871e";

interface SceneNodeProps {
  id: string;
  /** True when this node or any ancestor is in the current selection. */
  inSelectedBranch: boolean;
}

export function SceneNode({ id, inSelectedBranch }: SceneNodeProps) {
  const node = useSceneStore((s) => s.nodes[id]);
  const directlySelected = useSceneStore((s) => s.selectedIds.includes(id));
  const selectFromViewport = useSceneStore((s) => s.selectFromViewport);

  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    const object = node && isGroup(node) ? groupRef.current : meshRef.current;
    if (!object) return;
    registerObject(id, object);
    return () => unregisterObject(id, object);
  }, [id, node && isGroup(node)]);

  if (!node) return null;
  const selected = directlySelected || inSelectedBranch;

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    selectFromViewport(id, event.shiftKey);
  };

  if (isGroup(node)) {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        visible={node.visible}
      >
        {node.childrenIds.map((childId) => (
          <SceneNode key={childId} id={childId} inSelectedBranch={selected} />
        ))}
      </group>
    );
  }

  return (
    <ObjectMesh
      node={node}
      selected={selected}
      meshRef={meshRef}
      onPointerDown={handlePointerDown}
    />
  );
}

interface ObjectMeshProps {
  node: SceneObjectData;
  selected: boolean;
  meshRef: React.RefObject<Mesh>;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}

function ObjectMesh({ node, selected, meshRef, onPointerDown }: ObjectMeshProps) {
  const geometry = GEOMETRIES[node.type];
  const isPlane = node.type === "plane";

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      visible={node.visible}
      castShadow={!isPlane}
      receiveShadow
      onPointerDown={onPointerDown}
    >
      <meshStandardMaterial
        color={node.color}
        wireframe={node.wireframe}
        roughness={0.62}
        metalness={0.08}
        emissive={selected ? ACCENT : "#000000"}
        emissiveIntensity={selected ? 0.14 : 0}
        side={isPlane ? DoubleSide : undefined}
      />
      {selected && node.visible && !node.wireframe && (
        <Edges scale={1.002} threshold={12} color={ACCENT} />
      )}
    </mesh>
  );
}
