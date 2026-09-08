import { Canvas } from "@react-three/fiber";
import { RaceScene, type SceneProps } from "./RaceScene";

export function GameCanvas(props: SceneProps) {
  return (
    <div className="fixed inset-0">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 6, -14], fov: 62, near: 0.2, far: 2000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <RaceScene {...props} />
      </Canvas>
    </div>
  );
}
