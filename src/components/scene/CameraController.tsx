import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Box3, MOUSE, Vector3 } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { getObject } from "../../utilities/objectRegistry";
import type { Vec3 } from "../../types/scene";

const FLIGHT_DURATION = 0.45; // seconds

interface Flight {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  elapsed: number;
}

export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const flightRef = useRef<Flight | null>(null);
  const camera = useThree((s) => s.camera);

  const cameraNonce = useSceneStore((s) => s.cameraNonce);
  const focusNonce = useSceneStore((s) => s.focusNonce);
  const isTransforming = useSceneStore((s) => s.isTransforming);
  const setCameraPoseFromControls = useSceneStore((s) => s.setCameraPoseFromControls);

  // Fly to the pose in the store whenever a preset / load bumps the nonce.
  useEffect(() => {
    if (cameraNonce === 0) return;
    const { cameraPose } = useSceneStore.getState();
    startFlight(cameraPose.position, cameraPose.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraNonce]);

  // Frame the current selection.
  useEffect(() => {
    if (focusNonce === 0) return;
    const { selectedIds } = useSceneStore.getState();
    const box = new Box3();
    let hasAny = false;
    for (const id of selectedIds) {
      const object = getObject(id);
      if (!object) continue;
      box.expandByObject(object);
      hasAny = true;
    }
    if (!hasAny || box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3()).length();
    const distance = Math.max(size * 1.7, 3.5);
    const direction = camera.position
      .clone()
      .sub(controlsRef.current?.target ?? new Vector3())
      .normalize();
    const nextPos = center.clone().add(direction.multiplyScalar(distance));
    startFlight([nextPos.x, nextPos.y, nextPos.z], [center.x, center.y, center.z]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  function startFlight(position: Vec3, target: Vec3) {
    const controls = controlsRef.current;
    if (!controls) return;
    flightRef.current = {
      fromPos: camera.position.clone(),
      toPos: new Vector3(...position),
      fromTarget: controls.target.clone(),
      toTarget: new Vector3(...target),
      elapsed: 0,
    };
  }

  useFrame((_, delta) => {
    const flight = flightRef.current;
    const controls = controlsRef.current;
    if (!flight || !controls) return;
    flight.elapsed += delta;
    const t = Math.min(flight.elapsed / FLIGHT_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(flight.fromPos, flight.toPos, eased);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
    controls.update();
    if (t >= 1) {
      flightRef.current = null;
      commitPose();
    }
  });

  function commitPose() {
    const controls = controlsRef.current;
    if (!controls) return;
    setCameraPoseFromControls({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    });
  }

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isTransforming}
      enableDamping
      dampingFactor={0.12}
      minDistance={1.2}
      maxDistance={60}
      maxPolarAngle={Math.PI * 0.55}
      mouseButtons={{
        LEFT: undefined as unknown as MOUSE, // left button is reserved for selection
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.ROTATE,
      }}
      onEnd={commitPose}
    />
  );
}
