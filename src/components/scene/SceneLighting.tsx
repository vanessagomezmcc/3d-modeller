export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dfe4ea", "#b8b2a6", 0.35]} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, -6]} intensity={0.3} />
    </>
  );
}
