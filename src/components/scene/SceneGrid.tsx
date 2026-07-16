import { Grid } from "@react-three/drei";

export function SceneGrid() {
  return (
    <>
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#b6b3ac"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#94918a"
        fadeDistance={38}
        fadeStrength={1.4}
        followCamera={false}
      />
      {/* Invisible plane that only receives shadows, sitting just under the grid. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
    </>
  );
}
