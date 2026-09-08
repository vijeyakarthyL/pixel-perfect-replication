import { useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

type Props = {
  primary: string;
  secondary: string;
  accent: string;
  number?: number;
  hideCockpit?: boolean;
};

/**
 * Stylised open-wheel car built from primitives — nose, monocoque, sidepods,
 * front/rear wings, halo and four exposed wheels.
 */
export function CarModel({ primary, secondary, accent, number, hideCockpit }: Props) {
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: primary, metalness: 0.55, roughness: 0.32 }),
    [primary],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.4, roughness: 0.5 }),
    [secondary],
  );
  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: new THREE.Color(accent),
        emissiveIntensity: 0.65,
        metalness: 0.3,
        roughness: 0.4,
      }),
    [accent],
  );
  const tyreMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.85, metalness: 0.05 }),
    [],
  );

  const wheel = (x: number, z: number, r: number) => (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]} key={`${x}-${z}`}>
      <mesh castShadow material={tyreMat}>
        <cylinderGeometry args={[r, r, 0.42, 20]} />
      </mesh>
      <mesh material={accentMat} scale={[0.62, 1.02, 0.62]}>
        <cylinderGeometry args={[r, r, 0.44, 16]} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* monocoque */}
      <mesh position={[0, 0.34, -0.15]} castShadow material={bodyMat}>
        <boxGeometry args={[0.86, 0.32, 3.0]} />
      </mesh>
      {/* nose cone */}
      <mesh position={[0, 0.3, 1.95]} castShadow material={bodyMat}>
        <cylinderGeometry args={[0.09, 0.32, 1.5, 12]} />
      </mesh>
      <mesh position={[0, 0.3, 1.95]} rotation={[Math.PI / 2, 0, 0]} material={bodyMat}>
        <cylinderGeometry args={[0.1, 0.3, 1.5, 12]} />
      </mesh>
      {/* sidepods */}
      <mesh position={[0.72, 0.3, -0.3]} castShadow material={darkMat}>
        <boxGeometry args={[0.5, 0.34, 1.9]} />
      </mesh>
      <mesh position={[-0.72, 0.3, -0.3]} castShadow material={darkMat}>
        <boxGeometry args={[0.5, 0.34, 1.9]} />
      </mesh>
      {/* engine cover + airbox */}
      <mesh position={[0, 0.56, -0.9]} castShadow material={bodyMat}>
        <boxGeometry args={[0.6, 0.42, 1.6]} />
      </mesh>
      <mesh position={[0, 0.78, -0.28]} castShadow material={darkMat}>
        <boxGeometry args={[0.34, 0.3, 0.5]} />
      </mesh>
      {/* front wing */}
      <mesh position={[0, 0.13, 2.72]} castShadow material={accentMat}>
        <boxGeometry args={[1.9, 0.07, 0.62]} />
      </mesh>
      <mesh position={[0.86, 0.24, 2.6]} material={darkMat}>
        <boxGeometry args={[0.08, 0.3, 0.5]} />
      </mesh>
      <mesh position={[-0.86, 0.24, 2.6]} material={darkMat}>
        <boxGeometry args={[0.08, 0.3, 0.5]} />
      </mesh>
      {/* rear wing */}
      <mesh position={[0, 0.95, -2.05]} castShadow material={accentMat}>
        <boxGeometry args={[1.35, 0.08, 0.5]} />
      </mesh>
      <mesh position={[0.6, 0.72, -2.05]} material={darkMat}>
        <boxGeometry args={[0.07, 0.5, 0.34]} />
      </mesh>
      <mesh position={[-0.6, 0.72, -2.05]} material={darkMat}>
        <boxGeometry args={[0.07, 0.5, 0.34]} />
      </mesh>
      {/* diffuser glow */}
      <mesh position={[0, 0.16, -2.2]} material={accentMat}>
        <boxGeometry args={[0.9, 0.06, 0.3]} />
      </mesh>
      {/* halo */}
      {!hideCockpit && (
        <mesh position={[0, 0.78, 0.55]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
          <torusGeometry args={[0.4, 0.045, 8, 20]} />
        </mesh>
      )}
      {/* driver helmet */}
      {!hideCockpit && (
        <mesh position={[0, 0.66, 0.3]} castShadow material={accentMat}>
          <sphereGeometry args={[0.19, 16, 12]} />
        </mesh>
      )}
      {number !== undefined && (
        <Text
          position={[0, 0.79, -0.05]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.34}
          color={accent}
          anchorX="center"
          anchorY="middle"
        >
          {String(number)}
        </Text>
      )}
      {wheel(0.82, 1.42, 0.36)}
      {wheel(-0.82, 1.42, 0.36)}
      {wheel(0.86, -1.35, 0.42)}
      {wheel(-0.86, -1.35, 0.42)}
    </group>
  );
}
