import { useMemo } from "react";
import * as THREE from "three";
import type { BuiltTrack } from "@/lib/game/trackGeometry";

function asphaltTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#26262b";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = 20 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  // faint racing line
  ctx.fillStyle = "rgba(12,12,14,0.35)";
  ctx.fillRect(size * 0.42, 0, size * 0.16, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function kerbTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#e8e8ea" : "#c9182a";
    ctx.fillRect(0, i * 8, 8, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Circuit({ track, wet }: { track: BuiltTrack; wet: boolean }) {
  const asphalt = useMemo(asphaltTexture, []);
  const kerb = useMemo(kerbTexture, []);

  const roadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: asphalt,
        roughness: wet ? 0.22 : 0.78,
        metalness: wet ? 0.35 : 0.1,
        color: "#8f8f96",
      }),
    [asphalt, wet],
  );
  const kerbMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: kerb, roughness: 0.6 }),
    [kerb],
  );
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1b1f2a",
        roughness: 0.5,
        metalness: 0.2,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(track.def.glow),
        emissiveIntensity: 0.08,
      }),
    [track.def.glow],
  );

  // Floodlight pylons + trackside glow strips around the lap.
  const pylons = useMemo(() => {
    const out: { pos: THREE.Vector3; rot: number }[] = [];
    const n = track.samples.length;
    for (let i = 0; i < n; i += 22) {
      const s = track.samples[i]!;
      const side = (i / 22) % 2 === 0 ? 1 : -1;
      out.push({
        pos: s.pos.clone().addScaledVector(s.normal, side * (track.halfWidth + 11)),
        rot: Math.atan2(s.tangent.x, s.tangent.z),
      });
    }
    return out;
  }, [track]);

  return (
    <group>
      {/* ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color={track.def.ambient} roughness={0.95} />
      </mesh>

      <mesh geometry={track.road} material={roadMat} receiveShadow />
      <mesh geometry={track.kerbLeft} material={kerbMat} />
      <mesh geometry={track.kerbRight} material={kerbMat} />
      <mesh geometry={track.wallLeft} material={wallMat} />
      <mesh geometry={track.wallRight} material={wallMat} />

      {/* start / finish line */}
      <mesh
        position={[track.startLine.pos.x, 0.02, track.startLine.pos.z]}
        rotation={[-Math.PI / 2, 0, -Math.atan2(track.startLine.tangent.x, track.startLine.tangent.z)]}
      >
        <planeGeometry args={[track.halfWidth * 2, 1.6]} />
        <meshStandardMaterial color="#f4f4f6" emissive="#ffffff" emissiveIntensity={0.25} />
      </mesh>

      {pylons.map((p, i) => (
        <group key={i} position={[p.pos.x, 0, p.pos.z]} rotation={[0, p.rot, 0]}>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.22, 0.3, 10, 8]} />
            <meshStandardMaterial color="#2a2f3c" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 10.2, 0]}>
            <boxGeometry args={[2.6, 0.5, 0.4]} />
            <meshStandardMaterial
              color="#f6f8ff"
              emissive="#dfe9ff"
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, 9.5, 0]}
            color="#cfe0ff"
            intensity={i % 2 === 0 ? 110 : 70}
            distance={70}
            decay={2}
          />
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.5, 1.8, 0.5]} />
            <meshStandardMaterial
              color={track.def.glow}
              emissive={track.def.glow}
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
