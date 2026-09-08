import { useMemo } from "react";
import { useGameStore, useRaceStore } from "@/lib/game/store";
import { formatTime } from "@/lib/game/physics";
import { trackById } from "@/lib/game/tracks";
import { teamById } from "@/lib/game/teams";
import { touchInput } from "@/lib/game/input";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

function Minimap() {
  const trackId = useGameStore((s) => s.settings.trackId);
  const def = trackById(trackId);
  const dots = useRaceStore((s) => s.minimap);

  const { path, view } = useMemo(() => {
    const xs = def.points.map((p) => p[0]);
    const zs = def.points.map((p) => p[1]);
    const minX = Math.min(...xs) - 40;
    const maxX = Math.max(...xs) + 40;
    const minZ = Math.min(...zs) - 40;
    const maxZ = Math.max(...zs) + 40;
    const d = def.points.map(([x, z], i) => `${i === 0 ? "M" : "L"}${x.toFixed(0)},${z.toFixed(0)}`).join(" ");
    return { path: `${d} Z`, view: `${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}` };
  }, [def]);

  return (
    <svg viewBox={view} className="h-28 w-28 sm:h-36 sm:w-36">
      <path d={path} fill="none" stroke="oklch(0.4 0.02 265)" strokeWidth={22} strokeLinejoin="round" />
      <path d={path} fill="none" stroke={def.glow} strokeWidth={3} strokeLinejoin="round" opacity={0.7} />
      {dots.map((dot) => (
        <circle
          key={dot.id}
          cx={dot.x}
          cy={dot.z}
          r={dot.isSelf ? 13 : 10}
          fill={dot.isSelf ? "#ffffff" : "oklch(0.56 0.24 27)"}
        />
      ))}
    </svg>
  );
}

function TouchControls() {
  const press = (key: "throttle" | "brake", value: number) => ({
    onPointerDown: () => {
      touchInput[key] = value;
    },
    onPointerUp: () => {
      touchInput[key] = 0;
    },
    onPointerLeave: () => {
      touchInput[key] = 0;
    },
  });

  const steer = (value: number) => ({
    onPointerDown: () => {
      touchInput.steer = value;
    },
    onPointerUp: () => {
      touchInput.steer = 0;
    },
    onPointerLeave: () => {
      touchInput.steer = 0;
    },
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 lg:hidden">
      <div className="pointer-events-auto flex gap-3">
        <button aria-label="Steer left" className="hud-tile h-20 w-20 text-2xl" {...steer(-1)}>
          ◀
        </button>
        <button aria-label="Steer right" className="hud-tile h-20 w-20 text-2xl" {...steer(1)}>
          ▶
        </button>
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <button
          aria-label="Deploy energy"
          className="hud-tile px-4 py-2 label-caps"
          onPointerDown={() => {
            touchInput.deploy = true;
          }}
          onPointerUp={() => {
            touchInput.deploy = false;
          }}
        >
          Deploy
        </button>
        <div className="flex gap-3">
          <button aria-label="Brake" className="hud-tile h-20 w-20 text-sm" {...press("brake", 1)}>
            BRAKE
          </button>
          <button
            aria-label="Throttle"
            className="hud-tile h-24 w-24 text-sm font-bold text-primary"
            {...press("throttle", 1)}
          >
            THROTTLE
          </button>
        </div>
      </div>
    </div>
  );
}

export function RaceHud() {
  const t = useRaceStore((s) => s.telemetry);
  const standings = useRaceStore((s) => s.standings);
  const ping = useRaceStore((s) => s.ping);
  const phase = useRaceStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const camera = useGameStore((s) => s.camera);
  const cycleCamera = useGameStore((s) => s.cycleCamera);
  const settings = useGameStore((s) => s.settings);
  const track = trackById(settings.trackId);
  const timed = mode === "practice" || mode === "timetrial";

  const tyreLabels = ["FL", "FR", "RL", "RR"] as const;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-10 select-none">
        {/* top strip */}
        <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="hud-tile px-3 py-2">
            <div className="label-caps">Position</div>
            <div className="font-display text-3xl leading-none">
              {t.position}
              <span className="text-base text-muted-foreground">/{t.entries}</span>
            </div>
          </div>
          <div className="hud-tile hidden px-3 py-2 text-center sm:block">
            <div className="label-caps">{track.name}</div>
            <div className="font-mono text-sm tracking-widest">
              {timed ? "OPEN RUNNING" : `LAP ${t.lap} / ${t.laps}`} · SECTOR {t.sector}
            </div>
          </div>
          <div className="hud-tile px-3 py-2 text-right">
            <div className="label-caps">Current</div>
            <div className="font-mono text-lg leading-none">{formatTime(t.currentLap)}</div>
            <div className="label-caps mt-1">Best {formatTime(t.bestLap)}</div>
          </div>
        </div>

        {/* left column: standings */}
        <div className="absolute left-3 top-24 hidden w-56 sm:block">
          <div className="hud-tile divide-y divide-border">
            {standings.slice(0, 8).map((row, i) => (
              <div
                key={row.id}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs ${row.isSelf ? "bg-primary/20" : ""}`}
              >
                <span className="w-4 font-mono text-muted-foreground">{i + 1}</span>
                <span
                  className="h-3 w-1 rounded-full"
                  style={{ background: teamById(row.team).primary }}
                  aria-hidden
                />
                <span className="flex-1 truncate">{row.name}</span>
                <span className="font-mono text-muted-foreground">
                  {row.finished ? "FIN" : `L${row.lap + 1}`}
                </span>
              </div>
            ))}
          </div>
          {t.penaltySeconds > 0 && (
            <div className="hud-tile mt-2 px-2 py-1 text-xs text-primary">
              +{t.penaltySeconds}s TRACK LIMITS PENALTY
            </div>
          )}
          {t.offTrack && phase === "racing" && (
            <div className="hud-tile mt-2 px-2 py-1 text-xs text-signal">OFF TRACK — LOW GRIP</div>
          )}
        </div>

        {/* right column: minimap + tyres + damage */}
        <div className="absolute right-3 top-24 flex flex-col items-end gap-2">
          <div className="hud-tile p-1">
            <Minimap />
          </div>
          <div className="hud-tile w-40 space-y-1 p-2">
            <div className="label-caps">Tyres · {settings.tyre.toUpperCase()}</div>
            <div className="grid grid-cols-2 gap-1">
              {t.tyres.map((v, i) => (
                <div key={tyreLabels[i]} className="text-[0.65rem]">
                  <div className="flex justify-between font-mono">
                    <span>{tyreLabels[i]}</span>
                    <span>{Math.round(v * 100)}%</span>
                  </div>
                  <Bar
                    value={v}
                    color={v > 0.6 ? "oklch(0.75 0.17 145)" : v > 0.3 ? "var(--signal)" : "var(--primary)"}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="hud-tile w-40 space-y-1 p-2">
            <div className="label-caps">Damage</div>
            {(
              [
                ["Front wing", t.damage.frontWing],
                ["Rear wing", t.damage.rearWing],
                ["Engine", t.damage.engine],
                ["Suspension", t.damage.suspension],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="text-[0.65rem]">
                <div className="flex justify-between font-mono">
                  <span>{label}</span>
                  <span>{Math.round(v * 100)}%</span>
                </div>
                <Bar value={v} color="var(--primary)" />
              </div>
            ))}
          </div>
        </div>

        {/* bottom: speed, gear, energy, aero */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
          <div className="hud-tile w-48 space-y-2 p-3">
            <div>
              <div className="label-caps">Vector Energy</div>
              <Bar value={t.energy} color="var(--signal)" />
            </div>
            <div
              className={`label-caps ${
                t.aeroActive ? "text-signal" : t.aeroAvailable ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t.aeroActive ? "AERO BOOST ACTIVE" : t.aeroAvailable ? "AERO BOOST AVAILABLE" : "AERO BOOST"}
            </div>
            {t.slipstream > 0.15 && <div className="label-caps text-signal">SLIPSTREAM</div>}
          </div>

          <div className="hud-tile flex items-end gap-4 px-4 py-2">
            <div className="text-right">
              <div className="label-caps">km/h</div>
              <div className="font-display text-5xl leading-none tabular-nums">
                {Math.round(t.speedKph)}
              </div>
            </div>
            <div className="text-center">
              <div className="label-caps">Gear</div>
              <div className="font-display text-4xl leading-none text-primary">
                {t.gear === 0 ? "R" : t.gear}
              </div>
            </div>
            <div className="h-14 w-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="w-full origin-bottom rounded-full bg-primary"
                style={{ height: `${t.rpm * 100}%`, marginTop: `${(1 - t.rpm) * 100}%` }}
              />
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="hud-tile px-3 py-1 font-mono text-xs">
              {ping === null ? (
                <span className="text-muted-foreground">OFFLINE RUN</span>
              ) : (
                <span className={ping > 140 ? "text-primary" : "text-signal"}>PING: {ping}ms</span>
              )}
            </div>
            <button className="btn-race-ghost text-xs" onClick={cycleCamera}>
              CAM: {camera}
            </button>
          </div>
        </div>
      </div>
      <TouchControls />
    </>
  );
}
