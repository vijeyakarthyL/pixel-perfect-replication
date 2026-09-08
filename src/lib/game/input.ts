import type { CarInput } from "./physics";

const held = new Set<string>();

export const touchInput = { steer: 0, throttle: 0, brake: 0, aero: false, deploy: false };

export const inputFlags = { rearView: false };

let attached = 0;

export function attachControls(onKey?: (key: string) => void) {
  attached += 1;
  const down = (e: KeyboardEvent) => {
    held.add(e.key.toLowerCase());
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    onKey?.(e.key.toLowerCase());
  };
  const up = (e: KeyboardEvent) => held.delete(e.key.toLowerCase());
  const blur = () => held.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    attached -= 1;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    held.clear();
  };
}

export function isHeld(key: string) {
  return held.has(key);
}

const state = { steer: 0 };

export function readInput(dt: number, assists: boolean): CarInput {
  const throttleKey = isHeld("w") || isHeld("arrowup");
  const brakeKey = isHeld("s") || isHeld("arrowdown");
  const left = isHeld("a") || isHeld("arrowleft");
  const right = isHeld("d") || isHeld("arrowright");

  const target = (right ? 1 : 0) - (left ? 1 : 0) + touchInput.steer;
  const clampedTarget = Math.max(-1, Math.min(1, target));
  const rate = assists ? 6 : 9;
  state.steer += (clampedTarget - state.steer) * Math.min(1, rate * dt);
  if (Math.abs(clampedTarget) < 0.01) state.steer *= Math.exp(-8 * dt);

  return {
    throttle: Math.min(1, (throttleKey ? 1 : 0) + touchInput.throttle),
    brake: Math.min(1, (brakeKey ? 1 : 0) + touchInput.brake),
    steer: state.steer,
    handbrake: isHeld(" "),
    deploy: isHeld("shift") || touchInput.deploy,
    aero: isHeld("e") || isHeld("control") || touchInput.aero,
  };
}

export function resetInput() {
  state.steer = 0;
  touchInput.steer = 0;
  touchInput.throttle = 0;
  touchInput.brake = 0;
  touchInput.aero = false;
  touchInput.deploy = false;
}
