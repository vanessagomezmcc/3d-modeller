import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useSceneStore } from "../../store/useSceneStore";
import { SceneNode } from "./SceneNode";
import { SceneLighting } from "./SceneLighting";
import { SceneGrid } from "./SceneGrid";
import { CameraController } from "./CameraController";
import { TransformControlsManager } from "./TransformControlsManager";
import { SAMPLE_CAMERA } from "../../utilities/sampleScene";
import { LoadingOverlay } from "../common/LoadingOverlay";

export function SceneCanvas() {
  const rootIds = useSceneStore((s) => s.rootIds);
  const selectNode = useSceneStore((s) => s.selectNode);
  const addPrimitive = useSceneStore((s) => s.addPrimitive);
  const [ready, setReady] = useState(false);

  return (
    <div className="scene-canvas" aria-label="3D scene viewport">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        camera={{ position: SAMPLE_CAMERA.position, fov: 45, near: 0.1, far: 300 }}
        onCreated={() => setReady(true)}
        onPointerMissed={(event) => {
          if (event.button === 0) selectNode(null);
        }}
      >
        <color attach="background" args={["#dedcd7"]} />
        <SceneLighting />
        <SceneGrid />
        {rootIds.map((id) => (
          <SceneNode key={id} id={id} inSelectedBranch={false} />
        ))}
        <TransformControlsManager />
        <CameraController />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport
            axisColors={["#c0564f", "#6f9e58", "#4f7fb5"]}
            labelColor="#3a3a3d"
          />
        </GizmoHelper>
      </Canvas>

      {!ready && <LoadingOverlay />}

      {ready && rootIds.length === 0 && (
        <div className="canvas-empty-state" role="note">
          <p className="canvas-empty-title">Empty scene</p>
          <p className="canvas-empty-text">
            Add a primitive from the toolbar to start modeling.
          </p>
          <button type="button" className="btn btn-accent" onClick={() => addPrimitive("cube")}>
            Add a cube
          </button>
        </div>
      )}
    </div>
  );
}
