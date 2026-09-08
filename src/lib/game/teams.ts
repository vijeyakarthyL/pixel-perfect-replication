export type Team = {
  id: string;
  name: string;
  short: string;
  theme: string;
  primary: string;
  secondary: string;
  accent: string;
  drivers: { id: string; name: string; number: number }[];
};

export const TEAMS: Team[] = [
  {
    id: "velocity-titan",
    name: "Velocity Titan Racing",
    short: "VTR",
    theme: "Aggressive factory racing",
    primary: "#e10600",
    secondary: "#12141a",
    accent: "#ff9d00",
    drivers: [
      { id: "rico-blaze", name: "Rico Blaze", number: 7 },
      { id: "marco-volt", name: "Marco Volt", number: 22 },
    ],
  },
  {
    id: "silver-arrowhead",
    name: "Silver Arrowhead GP",
    short: "SAG",
    theme: "Hyper-engineered technology",
    primary: "#c9d2da",
    secondary: "#0f1418",
    accent: "#22e0ff",
    drivers: [
      { id: "alex-veyron", name: "Alex Veyron", number: 4 },
      { id: "theo-storm", name: "Theo Storm", number: 18 },
    ],
  },
  {
    id: "prancing-comet",
    name: "Prancing Comet Motorsport",
    short: "PCM",
    theme: "Luxury Italian-inspired racing",
    primary: "#9e0b19",
    secondary: "#f3e6cf",
    accent: "#ffd166",
    drivers: [
      { id: "luca-ferrani", name: "Luca Ferrani", number: 16 },
      { id: "enzo-morelli", name: "Enzo Morelli", number: 28 },
    ],
  },
  {
    id: "orbital-blue",
    name: "Orbital Blue Racing",
    short: "OBR",
    theme: "High-tech aerospace racing",
    primary: "#12315f",
    secondary: "#2b7fd4",
    accent: "#f4f8ff",
    drivers: [
      { id: "kai-mercer", name: "Kai Mercer", number: 11 },
      { id: "dylan-cross", name: "Dylan Cross", number: 31 },
    ],
  },
  {
    id: "papaya-pulse",
    name: "Papaya Pulse GP",
    short: "PPG",
    theme: "Fearless underdog energy",
    primary: "#ff6a13",
    secondary: "#14181d",
    accent: "#00d6c2",
    drivers: [
      { id: "sam-okoye", name: "Sam Okoye", number: 3 },
      { id: "noah-linden", name: "Noah Linden", number: 45 },
    ],
  },
  {
    id: "emerald-vector",
    name: "Emerald Vector Works",
    short: "EVW",
    theme: "Ruthless efficiency",
    primary: "#0f8f4f",
    secondary: "#07120c",
    accent: "#c8ff00",
    drivers: [
      { id: "iris-vale", name: "Iris Vale", number: 9 },
      { id: "juno-kask", name: "Juno Kask", number: 27 },
    ],
  },
];

export const DEFAULT_TEAM = TEAMS[0]!;

export function teamById(id: string): Team {
  return TEAMS.find((t) => t.id === id) ?? DEFAULT_TEAM;
}

export function driverName(teamId: string, driverId: string): string {
  const team = teamById(teamId);
  return team.drivers.find((d) => d.id === driverId)?.name ?? team.drivers[0]!.name;
}
