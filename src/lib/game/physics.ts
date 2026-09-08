import type { BuiltTrack } from "./trackGeometry";
import { nearestSample } from "./trackGeometry";
import { tyreById, type TyreId } from "./tracks";

export type CarInput = {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  deploy: boolean;
  aero: boolean;
};

export type Damage = { frontWing: number; rearWing: number; engine: number; suspension: number };

export type CarState = {
  x: number;
  z: number;
  heading: number;
  /** Forward speed in m/s. */
  speed: number;
  /** Lateral (sideways) velocity in m/s — the slide. */
  slide: number;
  gear: number;
  rpm: number;
  energy: number;
  aeroActive: boolean;
  aeroAvailable: boolean;
  tyres: [number, number, number, number];
  tyreTemp: number;
  damage: Damage;
  lap: number;
  progress: number;
  sampleIndex: number;
  lateral: number;
  offTrack: boolean;
  kerb: boolean;
  impact: number;
  lapStart: number;
  lapTimes: number[];
  bestLap: number | null;
  sector: number;
  penaltySeconds: number;
  warnings: number;
  finished: boolean;
  finishTime: number | null;
  totalTime: number;
};

export type PhysicsContext = {
  track: BuiltTrack;
  gripMultiplier: number;
  tyre: TyreId;
  wet: boolean;
  assists: boolean;
  collisions: boolean;
  damageOn: boolean;
  laps: number;
  /** 0..1 — how much aero drag help the car ahead is giving. */
  slipstream: number;
  now: number;
  racing: boolean;
};

const MASS_ACCEL = 13.5; // base longitudinal acceleration m/s²
const TOP_SPEED = 92; // m/s ≈ 331 km/h
const BRAKE_FORCE = 34;
const DRAG = 0.00042;
const BASE_GRIP = 15.5;

export function createCar(x: number, z: number, heading: number, now: number): CarState {
  return {
    x,
    z,
    heading,
    speed: 0,
    slide: 0,
    gear: 1,
    rpm: 0.15,
    energy: 1,
    aeroActive: false,
    aeroAvailable: false,
    tyres: [1, 1, 1, 1],
    tyreTemp: 0.3,
    damage: { frontWing: 0, rearWing: 0, engine: 0, suspension: 0 },
    lap: 0,
    progress: 0,
    sampleIndex: 0,
    lateral: 0,
    offTrack: false,
    kerb: false,
    impact: 0,
    lapStart: now,
    lapTimes: [],
    bestLap: null,
    sector: 1,
    penaltySeconds: 0,
    warnings: 0,
    finished: false,
    finishTime: null,
    totalTime: 0,
  };
}

export function gearFor(speed: number) {
  const ratios = [0, 14, 26, 39, 52, 65, 78, 92];
  for (let g = 1; g < ratios.length; g++) {
    if (speed < ratios[g]!) return { gear: g, rpm: (speed - ratios[g - 1]!) / (ratios[g]! - ratios[g - 1]!) };
  }
  return { gear: 8, rpm: 1 };
}

function inAeroZone(track: BuiltTrack, progress: number) {
  return track.def.aeroZones.some(([a, b]) => progress >= a && progress <= b);
}

export function stepCar(car: CarState, input: CarInput, dtRaw: number, ctx: PhysicsContext) {
  const dt = Math.min(dtRaw, 0.05);
  const tyre = tyreById(ctx.tyre);
  const wetBonus = ctx.wet && "wetGrip" in tyre ? (tyre as { wetGrip: number }).wetGrip : 1;
  const tyreHealth = (car.tyres[0] + car.tyres[1] + car.tyres[2] + car.tyres[3]) / 4;

  if (car.finished) {
    // Coast down after the flag.
    car.speed *= Math.exp(-0.9 * dt);
  }

  // --- Aero Boost + Vector Energy -------------------------------------------
  car.aeroAvailable =
    inAeroZone(ctx.track, car.progress) && (!ctx.racing || ctx.slipstream > 0.2) && car.speed > 40;
  car.aeroActive = car.aeroAvailable && input.aero && !car.finished;

  const deploying = input.deploy && car.energy > 0.02 && !car.finished;
  if (deploying) car.energy = Math.max(0, car.energy - dt * 0.14);
  // Regeneration from braking and cornering load.
  const regen = input.brake * 0.1 + Math.min(1, Math.abs(car.slide) / 6) * 0.05;
  car.energy = Math.min(1, car.energy + regen * dt);

  // --- Longitudinal ---------------------------------------------------------
  const surfaceGrip =
    ctx.gripMultiplier *
    tyre.grip *
    wetBonus *
    (0.55 + 0.45 * tyreHealth) *
    (car.offTrack ? 0.55 : 1) *
    (1 - car.damage.suspension * 0.25);

  const powerLoss = 1 - car.damage.engine * 0.35;
  const boost = (car.aeroActive ? 1.1 : 1) * (deploying ? 1.14 : 1);
  const dragCoefficient = DRAG * (car.aeroActive ? 0.72 : 1) * (1 - ctx.slipstream * 0.25);
  const effectiveTop = TOP_SPEED * boost * powerLoss;

  const accel = input.throttle * MASS_ACCEL * powerLoss * boost * (1 - car.speed / (effectiveTop + 8));
  const brakeGrip = surfaceGrip / BASE_GRIP;
  const braking = input.brake * BRAKE_FORCE * (0.55 + 0.45 * brakeGrip);
  const handbrake = input.handbrake ? 16 : 0;

  car.speed += (accel - braking - handbrake) * dt;
  car.speed -= dragCoefficient * car.speed * car.speed * dt * 60 * 0.016;
  car.speed -= car.speed * 0.25 * dt * (car.offTrack ? 3 : 1);
  if (car.speed < -8) car.speed = -8;
  if (car.speed > effectiveTop) car.speed = effectiveTop;
  if (input.throttle < 0.02 && input.brake < 0.02 && Math.abs(car.speed) < 0.4) car.speed = 0;

  // Lockup: heavy braking at speed without assists pushes the car wide.
  const lockup = !ctx.assists && input.brake > 0.85 && car.speed > 55 ? 0.55 : 1;

  // --- Steering / cornering -------------------------------------------------
  const speedFactor = Math.min(1, Math.abs(car.speed) / 18);
  const maxSteer = (1.75 - Math.min(1.25, Math.abs(car.speed) / 70)) * (ctx.assists ? 0.9 : 1);
  const downforce = 1 + Math.min(0.55, (car.speed / TOP_SPEED) ** 2 * 0.75) * (1 - ctx.slipstream * 0.3);
  const grip = surfaceGrip * downforce * lockup * (1 - car.damage.frontWing * 0.2);

  const desiredYaw = input.steer * maxSteer * speedFactor * Math.sign(car.speed || 1);
  const lateralDemand = Math.abs(desiredYaw) * Math.abs(car.speed);
  const gripLimit = grip * 1.35;
  const understeer = lateralDemand > gripLimit ? gripLimit / lateralDemand : 1;

  car.heading += desiredYaw * understeer * dt;

  // Oversteer: power or handbrake through a corner breaks the rear loose.
  const oversteerPush =
    (input.throttle * (ctx.assists ? 0.45 : 1) + (input.handbrake ? 2.4 : 0)) *
    Math.abs(desiredYaw) *
    Math.min(1, car.speed / 40) *
    (1 - car.damage.rearWing * 0.3);
  car.slide += -Math.sign(desiredYaw || 1) * oversteerPush * 5 * dt;
  car.slide *= Math.exp(-(3.2 + grip * 0.22) * dt);
  const slideMax = 11;
  car.slide = Math.max(-slideMax, Math.min(slideMax, car.slide));
  // A big slide scrubs speed.
  car.speed -= Math.min(Math.abs(car.slide) * 0.35, 6) * dt;
  // Rear stepping out rotates the car.
  car.heading += (car.slide / 40) * dt * Math.min(1, car.speed / 20);

  // --- Integrate ------------------------------------------------------------
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.x += (fx * car.speed + fz * car.slide) * dt;
  car.z += (fz * car.speed - fx * car.slide) * dt;

  // --- Track position, limits, walls ---------------------------------------
  const near = nearestSample(ctx.track, car.x, car.z, car.sampleIndex);
  const prevProgress = car.progress;
  car.sampleIndex = near.index;
  car.lateral = near.lateral;
  const hw = ctx.track.halfWidth;
  car.offTrack = Math.abs(near.lateral) > hw + 0.6;
  car.kerb = Math.abs(near.lateral) > hw - 0.9 && Math.abs(near.lateral) <= hw + 1.8;

  const wallAt = hw + 5.2;
  if (Math.abs(near.lateral) > wallAt) {
    const over = Math.abs(near.lateral) - wallAt;
    const side = Math.sign(near.lateral);
    car.x -= near.sample.normal.x * side * over;
    car.z -= near.sample.normal.z * side * over;
    const hitSpeed = Math.abs(car.speed);
    car.impact = Math.min(1, hitSpeed / 60);
    car.speed *= hitSpeed > 30 ? 0.55 : 0.8;
    car.slide *= -0.35;
    if (ctx.damageOn) {
      const d = Math.min(0.35, hitSpeed / 220);
      car.damage.frontWing = Math.min(1, car.damage.frontWing + d);
      car.damage.suspension = Math.min(1, car.damage.suspension + d * 0.6);
      if (hitSpeed > 55) car.damage.engine = Math.min(1, car.damage.engine + d * 0.3);
    }
  } else {
    car.impact *= Math.exp(-4 * dt);
  }

  // Track limits warning.
  if (ctx.racing && Math.abs(near.lateral) > hw + 3.4 && car.speed > 25) {
    car.warnings += dt * 1.4;
    if (car.warnings >= 3) {
      car.warnings = 0;
      car.penaltySeconds += 5;
    }
  }

  // --- Tyres ---------------------------------------------------------------
  const load = Math.min(1, (Math.abs(car.slide) / 6 + Math.abs(input.steer) * (car.speed / TOP_SPEED)) * 1.2);
  const wear = (0.0016 + load * 0.006) * tyre.degradation * dt * (ctx.wet ? 0.7 : 1);
  car.tyres = car.tyres.map((v, i) => Math.max(0.12, v - wear * (i < 2 ? 1.05 : 0.95))) as CarState["tyres"];
  car.tyreTemp += (Math.min(1, load + car.speed / TOP_SPEED * 0.6) - car.tyreTemp) * dt * 0.35;

  // --- Lap counting --------------------------------------------------------
  car.progress = near.t;
  if (!car.finished && prevProgress > 0.75 && car.progress < 0.25) {
    const lapTime = ctx.now - car.lapStart;
    if (car.lap > 0 || true) {
      car.lapTimes.push(lapTime);
      if (car.bestLap === null || lapTime < car.bestLap) car.bestLap = lapTime;
    }
    car.lapStart = ctx.now;
    car.lap += 1;
    if (ctx.racing && car.lap >= ctx.laps) {
      car.finished = true;
      car.finishTime = ctx.now;
    }
  } else if (!car.finished && prevProgress < 0.25 && car.progress > 0.75) {
    // Went backwards over the line.
    car.lap = Math.max(0, car.lap - 1);
  }
  car.sector = car.progress < 1 / 3 ? 1 : car.progress < 2 / 3 ? 2 : 3;

  const g = gearFor(Math.abs(car.speed));
  car.gear = car.speed < -0.5 ? 0 : g.gear;
  car.rpm = Math.max(0.12, Math.min(1, g.rpm * 0.9 + input.throttle * 0.1));
  if (!car.finished) car.totalTime = ctx.now - 0;

  return car;
}

/** Race distance covered, used for live position ordering. */
export function raceDistance(car: CarState) {
  return car.lap + car.progress;
}

export function formatTime(ms: number | null | undefined) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "--:--.---";
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor(total % 1000);
  return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(3, "0")}`;
}

export function formatGap(ms: number) {
  if (!Number.isFinite(ms)) return "--";
  return `+${(ms / 1000).toFixed(3)}`;
}
