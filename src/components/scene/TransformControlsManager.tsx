import { useEffect, useMemo, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";
import type { Object3D } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { getObject } from "../../utilities/objectRegistry";
import type { Vec3 } from "../../types/scene";

export function TransformControlsManager() {
  const activeTool = useSceneStore((s) => s.activeTool);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const nodesVersion = useSceneStore((s) => s.nodes); // re-run lookup when scene changes
  const controlsRef = useRef<TransformControlsImpl>(null);
  const pendingFrame = useRef(false);

  const targetId = selectedIds.length === 1 ? selectedIds[0] : null;
  const targetNode = targetId ? nodesVersion[targetId] : null;

  const target: Object3D | null = useMemo(() => {
    if (!targetId || !targetNode || !targetNode.visible) return null;
    return getObject(targetId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, targetNode, nodesVersion]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event: { value?: boolean }) => {
      const store = useSceneStore.getState();
      if (event.value) {
        store.beginTransformDrag();
      } else {
        if (targetId) mirrorToStore(targetId);
        store.endTransformDrag();
      }
    };

    const handleObjectChange = () => {
      // Throttle store writes to one per animation frame while dragging.
      if (pendingFrame.current || !targetId) return;
      pendingFrame.current = true;
      requestAnimationFrame(() => {
        pendingFrame.current = false;
        mirrorToStore(targetId);
      });
    };

    // The controls emit custom events beyond Object3DEventMap; type them loosely
    // but keep the same listener references for add/remove.
    const emitter = controls as unknown as {
      addEventListener: (type: string, listener: (event: { value?: boolean }) => void) => void;
      removeEventListener: (type: string, listener: (event: { value?: boolean }) => void) => void;
    };
    emitter.addEventListener("dragging-changed", handleDraggingChanged);
    emitter.addEventListener("objectChange", handleObjectChange);
    return () => {
      emitter.removeEventListener("dragging-changed", handleDraggingChanged);
      emitter.removeEventListener("objectChange", handleObjectChange);
    };
  }, [targetId, target]);

  if (!target || activeTool === "select") return null;

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      mode={activeTool}
      size={0.85}
    />
  );
}

function mirrorToStore(id: string): void {
  const object = getObject(id);
  if (!object) return;
  useSceneStore.getState().setNodeTransform(id, {
    position: [object.position.x, object.position.y, object.position.z] as Vec3,
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z] as Vec3,
    scale: [object.scale.x, object.scale.y, object.scale.z] as Vec3,
  });
}
