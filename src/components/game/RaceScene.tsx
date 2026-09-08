import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CarModel } from "./CarModel";
import { Circuit } from "./Circuit";
import { buildTrack, gridPose, type BuiltTrack } from "@/lib/game/trackGeometry";
import { createCar, stepCar, raceDistance, type CarState } from "@/lib/game/physics";
import { readInput, isHeld, attachControls } from "@/lib/game/input";
import { remoteCars, selfNet } from "@/lib/game/netState";
import { teamById } from "@/lib/game/teams";
import { trackById, weatherById } from "@/lib/game/tracks";
import { useGameStore, useRaceStore, type StandingRow } from "@/lib/game/store";
import { updateEngine } from "@/lib/game/audio";

export type SceneProps = {
  roster: { id: string; name: string; team: string }[];
  selfId: string;
  gridSlot: number;
  send: (event: string, payload: Record<string, unknown>) => void;
  networked: boolean;
};

const NET_TICK = 1 / 8;

function LocalCar({ track, gridSlot, send, networked }: SceneProps & { track: BuiltTrack }) {
  const group = useRef<THREE.Group>(null);
  const carRef = useRef<CarState | null>(null);
  const { camera } = useThree();
  const settings = useGameStore((s) => s.settings);
  const cameraMode = useGameStore((s) => s.camera);
  const soundOn = useGameStore((s) => s.sound);
  const profile = useGameStore((s) => s.profile);
  const team = teamById(profile.teamId);
  const mode = useGameStore((s) => s.mode);
  const trackDef = trackById(settings.trackId);
  const weather = weatherById(settings.weather);

  const hudAcc = useRef(0);
  const netAcc = useRef(0);
  const shake = useRef(0);
  const camTarget = useRef(new THREE.Vector3());
  const raceClock = useRef(0);

  useEffect(() => {
    const pose = gridPose(track, gridSlot);
    const car = createCar(pose.position.x, pose.position.z, pose.heading, 0);
    carRef.current = car;
    selfNet.x = car.x;
    selfNet.z = car.z;
    selfNet.heading = car.heading;
    if (group.current) {
      group.current.position.set(car.x, 0, car.z);
      group.current.rotation.y = car.heading;
    }
  }, [track, gridSlot]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const car = carRef.current;
    const g = group.current;
    if (!car || !g) return;

    const race = useRaceStore.getState();
    const phase = race.phase;
    const running = phase === "racing" && !race.paused;
    if (running) raceClock.current += delta * 1000;

    const input = running
      ? readInput(delta, settings.assists)
      : { throttle: 0, brake: 1, steer: 0, handbrake: false, deploy: false, aero: false };

    // Slipstream from the nearest car ahead on track.
    let slipstream = 0;
    for (const other of remoteCars.values()) {
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 30 || dist < 1) continue;
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const ahead = (dx * fx + dz * fz) / dist;
      if (ahead > 0.72) slipstream = Math.max(slipstream, 1 - dist / 30);
    }

    stepCar(car, input, delta, {
      track,
      gripMultiplier: weather.gripMultiplier,
      tyre: settings.tyre,
      wet: settings.weather === "light-rain" || settings.weather === "heavy-rain",
      assists: settings.assists,
      collisions: settings.collisions,
      damageOn: settings.damage,
      laps: mode === "practice" || mode === "timetrial" ? 9999 : settings.laps,
      slipstream,
      now: raceClock.current,
      racing: phase === "racing",
    });

    // Car-to-car contact (cosmetic push, latency tolerant).
    if (settings.collisions) {
      for (const other of remoteCars.values()) {
        const dx = car.x - other.x;
        const dz = car.z - other.z;
        const d = Math.hypot(dx, dz);
        if (d < 3.4 && d > 0.001) {
          const push = (3.4 - d) * 0.6;
          car.x += (dx / d) * push;
          car.z += (dz / d) * push;
          car.speed *= 0.985;
          car.impact = Math.max(car.impact, 0.3);
        }
      }
    }

    g.position.set(car.x, 0, car.z);
    g.rotation.y = car.heading;
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -car.slide * 0.012, 1 - Math.exp(-8 * delta));

    // --- Camera ------------------------------------------------------------
    const forward = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const speedT = Math.min(1, Math.abs(car.speed) / 92);
    const rear = isHeld("r");
    shake.current = Math.max(shake.current * Math.exp(-6 * delta), car.impact * 0.5 + (car.kerb ? 0.06 : 0));

    let desired: THREE.Vector3;
    let lookAt: THREE.Vector3;
    if (cameraMode === "hood" || cameraMode === "cockpit") {
      const height = cameraMode === "cockpit" ? 0.95 : 1.15;
      const ahead = cameraMode === "cockpit" ? 0.15 : 1.4;
      desired = new THREE.Vector3(car.x, height, car.z).addScaledVector(forward, ahead);
      lookAt = desired.clone().addScaledVector(forward, rear ? -14 : 18).setY(height * 0.72);
      camera.position.copy(desired);
    } else {
      const back = cameraMode === "close" ? 5.6 : 8.4 + speedT * 2.4;
      const up = cameraMode === "close" ? 2.3 : 3.1;
      desired = new THREE.Vector3(car.x, up, car.z).addScaledVector(forward, rear ? back : -back);
      desired.addScaledVector(right, -car.slide * 0.06);
      const t = 1 - Math.exp(-9 * delta);
      camera.position.lerp(desired, t);
      lookAt = new THREE.Vector3(car.x, 0.9, car.z).addScaledVector(forward, rear ? -10 : 12);
    }
    camTarget.current.lerp(lookAt, 1 - Math.exp(-12 * delta));
    camera.lookAt(camTarget.current);
    if (shake.current > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake.current;
      camera.position.y += (Math.random() - 0.5) * shake.current * 0.6;
    }
    const fov = 62 + speedT * 12;
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - fov) > 0.1) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-4 * delta));
      camera.updateProjectionMatrix();
    }

    updateEngine(car.rpm, input.throttle, soundOn && running);

    // --- Shared state ------------------------------------------------------
    selfNet.x = car.x;
    selfNet.z = car.z;
    selfNet.heading = car.heading;
    selfNet.speed = car.speed;
    selfNet.lap = car.lap;
    selfNet.progress = car.progress;
    selfNet.finished = car.finished;
    selfNet.bestLap = car.bestLap;
    selfNet.totalTime = car.finishTime;
    selfNet.team = profile.teamId;
    selfNet.name = profile.nickname || "You";

    // --- HUD at 12 Hz ------------------------------------------------------
    hudAcc.current += delta;
    if (hudAcc.current > 1 / 12) {
      hudAcc.current = 0;
      const all = [selfNet, ...remoteCars.values()];
      const sorted = [...all].sort((a, b) => b.lap + b.progress - (a.lap + a.progress));
      const position = sorted.findIndex((c) => c === selfNet) + 1;
      useRaceStore.getState().setTelemetry({
        speedKph: Math.abs(car.speed) * 3.6,
        gear: car.gear,
        rpm: car.rpm,
        lap: Math.min(car.lap + 1, settings.laps),
        laps: settings.laps,
        position,
        entries: all.length,
        energy: car.energy,
        aeroActive: car.aeroActive,
        aeroAvailable: car.aeroAvailable,
        tyres: car.tyres,
        tyreTemp: car.tyreTemp,
        damage: { ...car.damage },
        lastLap: car.lapTimes.length ? car.lapTimes[car.lapTimes.length - 1]! : null,
        bestLap: car.bestLap,
        currentLap: raceClock.current - car.lapStart,
        sector: car.sector,
        penaltySeconds: car.penaltySeconds,
        offTrack: car.offTrack,
        progress: car.progress,
        slipstream,
      });

      const rows: StandingRow[] = sorted.map((c) => ({
        id: c === selfNet ? "self" : c.id,
        name: c === selfNet ? profile.nickname || "You" : c.name,
        team: c.team,
        lap: c.lap,
        progress: c.progress,
        bestLap: c.bestLap,
        finished: c.finished,
        totalTime: c.totalTime,
        isSelf: c === selfNet,
      }));
      useRaceStore.getState().setStandings(rows);
      useRaceStore.getState().setMinimap(
        sorted.map((c) => ({ x: c.x, z: c.z, id: c === selfNet ? "self" : c.id, isSelf: c === selfNet })),
      );

      const soloFinished =
        car.finished ||
        (phase === "racing" && !(mode === "practice" || mode === "timetrial") && raceDistance(car) >= settings.laps);
      if (soloFinished && phase === "racing") {
        useRaceStore.getState().setPhase("finished");
        if (networked) {
          send("finish", {
            id: selfNet.id,
            name: selfNet.name,
            team: selfNet.team,
            lap: car.lap,
            best: car.bestLap,
            total: car.finishTime,
          });
        }
      }
    }

    // --- Network send at 8 Hz ---------------------------------------------
    if (!networked) return;
    netAcc.current += delta;
    if (netAcc.current < NET_TICK) return;
    netAcc.current = 0;
    if (document.hidden) return;
    send("state", {
      id: selfNet.id,
      name: selfNet.name,
      team: selfNet.team,
      x: Math.round(car.x * 100) / 100,
      z: Math.round(car.z * 100) / 100,
      h: Math.round(car.heading * 1000) / 1000,
      sp: Math.round(car.speed),
      lap: car.lap,
      pr: Math.round(car.progress * 1000) / 1000,
      fin: car.finished,
      best: car.bestLap,
      total: car.finishTime,
    });
  });

  return (
    <group ref={group}>
      <CarModel
        primary={team.primary}
        secondary={team.secondary}
        accent={team.accent}
        hideCockpit={cameraMode === "cockpit"}
      />
      <pointLight position={[0, 0.4, 2.6]} color={team.accent} intensity={12} distance={14} />
    </group>
  );
}

function RemoteCar({ id, team }: { id: string; team: string }) {
  const group = useRef<THREE.Group>(null);
  const colors = teamById(team);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    const s = remoteCars.get(id);
    if (!g || !s) return;
    g.visible = true;
    target.set(s.x, 0, s.z);
    const t = 1 - Math.exp(-12 * delta);
    if (g.position.distanceTo(target) > 25) g.position.copy(target);
    else g.position.lerp(target, t);
    const dy = s.heading - g.rotation.y;
    g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
  });

  return (
    <group ref={group} visible={false}>
      <CarModel primary={colors.primary} secondary={colors.secondary} accent={colors.accent} />
    </group>
  );
}

export function RaceScene(props: SceneProps) {
  const trackId = useGameStore((s) => s.settings.trackId);
  const weatherId = useGameStore((s) => s.settings.weather);
  const trackDef = trackById(trackId);
  const track = useMemo(() => buildTrack(trackDef), [trackDef]);
  const wet = weatherId === "light-rain" || weatherId === "heavy-rain";

  useEffect(() => attachControls(), []);

  return (
    <>
      <color attach="background" args={[trackDef.ambient]} />
      <fog attach="fog" args={[trackDef.ambient, 90, wet ? 300 : 520]} />
      <hemisphereLight args={["#4d5c7a", "#0b0d12", 0.55]} />
      <directionalLight position={[80, 120, 40]} intensity={0.5} color="#9fb4dd" castShadow />
      <Circuit track={track} wet={wet} />
      <LocalCar {...props} track={track} />
      {props.roster
        .filter((r) => r.id !== props.selfId)
        .map((r) => (
          <RemoteCar key={r.id} id={r.id} team={r.team} />
        ))}
    </>
  );
}
