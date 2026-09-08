import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TyreId, WeatherId } from "./tracks";

export type GameMode = "quick" | "lobby" | "practice" | "timetrial" | "championship";
export type CameraMode = "chase" | "close" | "hood" | "cockpit";

export type RaceSettings = {
  trackId: string;
  laps: number;
  weather: WeatherId;
  tyre: TyreId;
  assists: boolean;
  collisions: boolean;
  damage: boolean;
};

export type Profile = {
  nickname: string;
  teamId: string;
  driverId: string;
};

type GameStore = {
  profile: Profile;
  mode: GameMode;
  room: string | null;
  isHost: boolean;
  settings: RaceSettings;
  camera: CameraMode;
  sound: boolean;
  championship: { trackId: string; points: number }[];
  setProfile: (p: Partial<Profile>) => void;
  setMode: (m: GameMode) => void;
  setRoom: (room: string | null, isHost: boolean) => void;
  setSettings: (s: Partial<RaceSettings>) => void;
  setCamera: (c: CameraMode) => void;
  cycleCamera: () => void;
  setSound: (v: boolean) => void;
  addChampionshipResult: (trackId: string, points: number) => void;
  resetChampionship: () => void;
};

const CAMERA_ORDER: CameraMode[] = ["chase", "close", "hood", "cockpit"];

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      profile: { nickname: "", teamId: "velocity-titan", driverId: "rico-blaze" },
      mode: "practice",
      room: null,
      isHost: false,
      settings: {
        trackId: "neon-harbor",
        laps: 3,
        weather: "clear",
        tyre: "medium",
        assists: true,
        collisions: true,
        damage: true,
      },
      camera: "chase",
      sound: true,
      championship: [],
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      setMode: (mode) => set({ mode }),
      setRoom: (room, isHost) => set({ room, isHost }),
      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setCamera: (camera) => set({ camera }),
      cycleCamera: () => {
        const i = CAMERA_ORDER.indexOf(get().camera);
        set({ camera: CAMERA_ORDER[(i + 1) % CAMERA_ORDER.length]! });
      },
      setSound: (sound) => set({ sound }),
      addChampionshipResult: (trackId, points) =>
        set({ championship: [...get().championship, { trackId, points }] }),
      resetChampionship: () => set({ championship: [] }),
    }),
    {
      name: "apex-gp",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        profile: s.profile,
        mode: s.mode,
        room: s.room,
        isHost: s.isHost,
        settings: s.settings,
        camera: s.camera,
        sound: s.sound,
        championship: s.championship,
      }),
    },
  ),
);

export type Telemetry = {
  speedKph: number;
  gear: number;
  rpm: number;
  lap: number;
  laps: number;
  position: number;
  entries: number;
  energy: number;
  aeroActive: boolean;
  aeroAvailable: boolean;
  tyres: [number, number, number, number];
  tyreTemp: number;
  damage: { frontWing: number; rearWing: number; engine: number; suspension: number };
  lastLap: number | null;
  bestLap: number | null;
  currentLap: number;
  sector: number;
  penaltySeconds: number;
  offTrack: boolean;
  progress: number;
  slipstream: number;
};

export type StandingRow = {
  id: string;
  name: string;
  team: string;
  lap: number;
  progress: number;
  bestLap: number | null;
  finished: boolean;
  totalTime: number | null;
  isSelf: boolean;
};

export type RacePhase = "countdown" | "racing" | "finished";

type RaceStore = {
  phase: RacePhase;
  countdown: number;
  paused: boolean;
  ping: number | null;
  telemetry: Telemetry;
  standings: StandingRow[];
  minimap: { x: number; z: number; id: string; isSelf: boolean }[];
  setPhase: (p: RacePhase) => void;
  setCountdown: (n: number) => void;
  setPaused: (v: boolean) => void;
  setPing: (n: number | null) => void;
  setTelemetry: (t: Telemetry) => void;
  setStandings: (s: StandingRow[]) => void;
  setMinimap: (m: { x: number; z: number; id: string; isSelf: boolean }[]) => void;
  reset: () => void;
};

const emptyTelemetry: Telemetry = {
  speedKph: 0,
  gear: 1,
  rpm: 0,
  lap: 0,
  laps: 3,
  position: 1,
  entries: 1,
  energy: 1,
  aeroActive: false,
  aeroAvailable: false,
  tyres: [1, 1, 1, 1],
  tyreTemp: 0.3,
  damage: { frontWing: 0, rearWing: 0, engine: 0, suspension: 0 },
  lastLap: null,
  bestLap: null,
  currentLap: 0,
  sector: 1,
  penaltySeconds: 0,
  offTrack: false,
  progress: 0,
  slipstream: 0,
};

export const useRaceStore = create<RaceStore>((set) => ({
  phase: "countdown",
  countdown: 5,
  paused: false,
  ping: null,
  telemetry: emptyTelemetry,
  standings: [],
  minimap: [],
  setPhase: (phase) => set({ phase }),
  setCountdown: (countdown) => set({ countdown }),
  setPaused: (paused) => set({ paused }),
  setPing: (ping) => set({ ping }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setStandings: (standings) => set({ standings }),
  setMinimap: (minimap) => set({ minimap }),
  reset: () =>
    set({
      phase: "countdown",
      countdown: 5,
      paused: false,
      telemetry: emptyTelemetry,
      standings: [],
      minimap: [],
    }),
}));

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4];
