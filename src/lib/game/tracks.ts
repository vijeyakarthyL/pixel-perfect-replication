export type TrackDef = {
  id: string;
  name: string;
  location: string;
  blurb: string;
  /** Closed centreline control points in metres, [x, z] pairs. */
  points: [number, number][];
  /** Half-width of the racing surface in metres. */
  halfWidth: number;
  corners: number;
  difficulty: "Easy" | "Medium" | "Hard";
  topSpeed: number;
  technicality: number;
  /** Aero Boost activation zones as normalised lap progress ranges. */
  aeroZones: [number, number][];
  ambient: string;
  glow: string;
};

export const TRACKS: TrackDef[] = [
  {
    id: "neon-harbor",
    name: "Neon Harbor",
    location: "Harbour District",
    blurb: "Long floodlit straights between container cranes, heavy braking zones.",
    points: [
      [0, -240],
      [120, -230],
      [200, -160],
      [210, -40],
      [150, 40],
      [60, 70],
      [-40, 90],
      [-120, 150],
      [-190, 120],
      [-200, 20],
      [-150, -60],
      [-160, -160],
      [-90, -230],
    ],
    halfWidth: 11,
    corners: 12,
    difficulty: "Easy",
    topSpeed: 331,
    technicality: 4,
    aeroZones: [
      [0.0, 0.12],
      [0.45, 0.55],
    ],
    ambient: "#0a1220",
    glow: "#2ad4ff",
  },
  {
    id: "red-canyon",
    name: "Red Canyon Ring",
    location: "Vermillion Desert",
    blurb: "High-speed sweepers carved through canyon walls. Very little runoff.",
    points: [
      [0, -300],
      [160, -260],
      [260, -140],
      [240, 20],
      [140, 120],
      [20, 150],
      [-90, 190],
      [-210, 140],
      [-250, 10],
      [-200, -130],
      [-100, -260],
    ],
    halfWidth: 12,
    corners: 10,
    difficulty: "Medium",
    topSpeed: 338,
    technicality: 5,
    aeroZones: [
      [0.05, 0.18],
      [0.6, 0.7],
    ],
    ambient: "#1a0f12",
    glow: "#ff7a3c",
  },
  {
    id: "emerald-ridge",
    name: "Emerald Ridge",
    location: "Highland Forest",
    blurb: "Technical mountain course, blind apexes and tight direction changes.",
    points: [
      [0, -200],
      [90, -190],
      [130, -120],
      [90, -60],
      [130, 10],
      [90, 80],
      [10, 100],
      [-60, 70],
      [-70, 10],
      [-140, 20],
      [-180, -60],
      [-120, -130],
      [-70, -190],
    ],
    halfWidth: 9.5,
    corners: 16,
    difficulty: "Hard",
    topSpeed: 308,
    technicality: 9,
    aeroZones: [[0.72, 0.82]],
    ambient: "#0a1611",
    glow: "#3dffa8",
  },
  {
    id: "titan-coast",
    name: "Titan Coast",
    location: "Cliffside Bay",
    blurb: "Fast coastal circuit with endless sweeping corners and sea spray.",
    points: [
      [0, -260],
      [140, -240],
      [230, -150],
      [250, -20],
      [190, 90],
      [70, 130],
      [-60, 120],
      [-170, 150],
      [-230, 50],
      [-200, -90],
      [-110, -210],
    ],
    halfWidth: 11.5,
    corners: 11,
    difficulty: "Medium",
    topSpeed: 334,
    technicality: 6,
    aeroZones: [
      [0.1, 0.22],
      [0.55, 0.64],
    ],
    ambient: "#08131c",
    glow: "#4fd8ff",
  },
  {
    id: "midnight-tokyo",
    name: "Midnight Metro",
    location: "Neon City Loop",
    blurb: "Barrier-lined city loop under a wall of signage. Zero margin for error.",
    points: [
      [0, -220],
      [110, -210],
      [170, -150],
      [150, -80],
      [190, -10],
      [150, 70],
      [50, 90],
      [-50, 80],
      [-100, 130],
      [-180, 90],
      [-190, -10],
      [-140, -80],
      [-160, -160],
      [-80, -215],
    ],
    halfWidth: 9,
    corners: 18,
    difficulty: "Hard",
    topSpeed: 312,
    technicality: 8,
    aeroZones: [[0.28, 0.38]],
    ambient: "#120a1c",
    glow: "#c04dff",
  },
  {
    id: "silver-peak",
    name: "Silver Peak",
    location: "Alpine Plateau",
    blurb: "Thin air, slow hairpins and one enormous downhill straight.",
    points: [
      [0, -280],
      [130, -250],
      [200, -170],
      [180, -80],
      [120, -30],
      [170, 40],
      [110, 110],
      [0, 130],
      [-110, 110],
      [-190, 40],
      [-160, -60],
      [-200, -160],
      [-110, -250],
    ],
    halfWidth: 10.5,
    corners: 14,
    difficulty: "Medium",
    topSpeed: 322,
    technicality: 7,
    aeroZones: [
      [0.0, 0.1],
      [0.65, 0.75],
    ],
    ambient: "#0d1118",
    glow: "#9fe8ff",
  },
];

export const DEFAULT_TRACK = TRACKS[0]!;

export function trackById(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? DEFAULT_TRACK;
}

export const RACE_PRESETS = [
  { id: "sprint", name: "Sprint", laps: 3 },
  { id: "standard", name: "Standard", laps: 5 },
  { id: "gp", name: "Grand Prix", laps: 10 },
  { id: "endurance", name: "Endurance", laps: 20 },
] as const;

export const WEATHER = [
  { id: "clear", name: "Clear", gripMultiplier: 1, visibility: 1 },
  { id: "cloudy", name: "Cloudy", gripMultiplier: 0.97, visibility: 0.95 },
  { id: "light-rain", name: "Light Rain", gripMultiplier: 0.84, visibility: 0.78 },
  { id: "heavy-rain", name: "Heavy Rain", gripMultiplier: 0.7, visibility: 0.6 },
] as const;

export type WeatherId = (typeof WEATHER)[number]["id"];

export function weatherById(id: WeatherId) {
  return WEATHER.find((w) => w.id === id) ?? WEATHER[0];
}

export const TYRES = [
  { id: "soft", name: "Soft", grip: 1.08, degradation: 1.7 },
  { id: "medium", name: "Medium", grip: 1.0, degradation: 1.0 },
  { id: "hard", name: "Hard", grip: 0.93, degradation: 0.62 },
  { id: "wet", name: "Wet", grip: 0.86, degradation: 0.9, wetGrip: 1.35 },
] as const;

export type TyreId = (typeof TYRES)[number]["id"];

export function tyreById(id: TyreId) {
  return TYRES.find((t) => t.id === id) ?? TYRES[1];
}
