import * as THREE from "three";
import type { TrackDef } from "./tracks";

export type TrackSample = {
  pos: THREE.Vector3;
  /** Forward direction (unit). */
  tangent: THREE.Vector3;
  /** Left-hand lateral direction (unit). */
  normal: THREE.Vector3;
  /** Normalised lap progress at this sample. */
  t: number;
};

export type BuiltTrack = {
  def: TrackDef;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  length: number;
  halfWidth: number;
  /** Surface mesh geometry (asphalt ribbon). */
  road: THREE.BufferGeometry;
  kerbLeft: THREE.BufferGeometry;
  kerbRight: THREE.BufferGeometry;
  wallLeft: THREE.BufferGeometry;
  wallRight: THREE.BufferGeometry;
  startLine: { pos: THREE.Vector3; tangent: THREE.Vector3; normal: THREE.Vector3 };
};

const SAMPLE_COUNT = 600;

function ribbon(samples: TrackSample[], from: number, to: number, y: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = samples.length;
  for (let i = 0; i <= n; i++) {
    const s = samples[i % n]!;
    const a = s.pos.clone().addScaledVector(s.normal, from).setY(y);
    const b = s.pos.clone().addScaledVector(s.normal, to).setY(y);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const v = i / n;
    uvs.push(0, v * 60, 1, v * 60);
  }
  for (let i = 0; i < n; i++) {
    const o = i * 2;
    indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function wall(samples: TrackSample[], offset: number, height: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const n = samples.length;
  for (let i = 0; i <= n; i++) {
    const s = samples[i % n]!;
    const base = s.pos.clone().addScaledVector(s.normal, offset);
    positions.push(base.x, 0.02, base.z, base.x, height, base.z);
  }
  for (let i = 0; i < n; i++) {
    const o = i * 2;
    indices.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildTrack(def: TrackDef): BuiltTrack {
  const pts = def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.5);
  const length = curve.getLength();

  const samples: TrackSample[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    samples.push({ pos, tangent, normal, t });
  }

  const hw = def.halfWidth;
  const first = samples[0]!;

  return {
    def,
    curve,
    samples,
    length,
    halfWidth: hw,
    road: ribbon(samples, -hw, hw, 0),
    kerbLeft: ribbon(samples, hw, hw + 1.6, 0.03),
    kerbRight: ribbon(samples, -hw - 1.6, -hw, 0.03),
    wallLeft: wall(samples, hw + 5.5, 1.6),
    wallRight: wall(samples, -hw - 5.5, 1.6),
    startLine: { pos: first.pos.clone(), tangent: first.tangent.clone(), normal: first.normal.clone() },
  };
}

/** Nearest centreline sample to a world position, searched near a hint index. */
export function nearestSample(track: BuiltTrack, x: number, z: number, hint: number) {
  const n = track.samples.length;
  let bestIndex = hint;
  let bestDist = Infinity;
  for (let d = -40; d <= 60; d++) {
    const i = (((hint + d) % n) + n) % n;
    const s = track.samples[i]!;
    const dist = (s.pos.x - x) ** 2 + (s.pos.z - z) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  // Fall back to a full search if the local window clearly missed.
  if (bestDist > 90 * 90) {
    for (let i = 0; i < n; i++) {
      const s = track.samples[i]!;
      const dist = (s.pos.x - x) ** 2 + (s.pos.z - z) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
  }
  const s = track.samples[bestIndex]!;
  const dx = x - s.pos.x;
  const dz = z - s.pos.z;
  const lateral = dx * s.normal.x + dz * s.normal.z;
  return { index: bestIndex, sample: s, lateral, t: s.t };
}

/** Grid slot pose: staggered two-by-two behind the start line. */
export function gridPose(track: BuiltTrack, slot: number) {
  const row = Math.floor(slot / 2);
  const side = slot % 2 === 0 ? 1 : -1;
  const back = 8 + row * 9;
  const t = (1 - back / track.length + 1) % 1;
  const pos = track.curve.getPointAt(t);
  const tangent = track.curve.getTangentAt(t).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const p = pos.clone().addScaledVector(normal, side * track.halfWidth * 0.42);
  const heading = Math.atan2(tangent.x, tangent.z);
  return { position: p, heading, t };
}
