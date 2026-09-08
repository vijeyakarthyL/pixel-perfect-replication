export type NetCar = {
  id: string;
  name: string;
  team: string;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  progress: number;
  finished: boolean;
  bestLap: number | null;
  totalTime: number | null;
  at: number;
};

export const selfNet: NetCar = {
  id: "self",
  name: "You",
  team: "velocity-titan",
  x: 0,
  z: 0,
  heading: 0,
  speed: 0,
  lap: 0,
  progress: 0,
  finished: false,
  bestLap: null,
  totalTime: null,
  at: 0,
};

export const remoteCars = new Map<string, NetCar>();

export function resetNetState() {
  remoteCars.clear();
  selfNet.lap = 0;
  selfNet.progress = 0;
  selfNet.finished = false;
  selfNet.bestLap = null;
  selfNet.totalTime = null;
}
