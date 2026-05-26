// Pure SVG, server-renderable. No client JS, no chart library.
// Tomorrow-Night accent palette for distinct team lines.

const PALETTE = [
  "#2bbc8a", // green (primary)
  "#d480aa", // pink (accent)
  "#f0c674", // yellow
  "#81a2be", // blue
  "#8abeb7", // cyan
  "#b294bb", // purple
  "#de935f", // orange
  "#cc6666", // red
];

export type TimelinePoint = { t: number; score: number };
export type TeamSeries = { teamId: string; teamName: string; series: TimelinePoint[] };

export function TimelineChart({
  teams,
  width = 900,
  height = 320,
}: {
  teams: TeamSeries[];
  width?: number;
  height?: number;
}) {
  const padL = 50, padR = 16, padT = 16, padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  // Filter empty + cap to top N by final score (chart noise control).
  const active = teams.filter((t) => t.series.length > 0);
  if (active.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        No solves yet — the chart will appear after the first flag is submitted.
      </div>
    );
  }

  const TOP_N = 8;
  const ranked = [...active]
    .sort((a, b) => last(b.series).score - last(a.series).score)
    .slice(0, TOP_N);

  const allTimes = ranked.flatMap((t) => t.series.map((p) => p.t));
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes, tMin + 60_000); // at least 1 min wide
  const sMax = Math.max(...ranked.map((t) => last(t.series).score), 1);

  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * innerW;
  const y = (s: number) => padT + (1 - s / sMax) * innerH;

  // Gridlines
  const yTicks = niceTicks(sMax, 4);
  const xTicks = niceTimeTicks(tMin, tMax, 5);

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="score over time chart"
      >
        {/* y-axis grid + labels */}
        {yTicks.map((v, i) => (
          <g key={`y${i}`}>
            <line
              x1={padL} x2={width - padR}
              y1={y(v)} y2={y(v)}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
            <text
              x={padL - 6} y={y(v)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="10" fill="currentColor" opacity="0.55"
              fontFamily="inherit"
            >{v}</text>
          </g>
        ))}

        {/* x-axis labels */}
        {xTicks.map((t, i) => (
          <g key={`x${i}`}>
            <line
              x1={x(t)} x2={x(t)}
              y1={padT} y2={height - padB}
              stroke="currentColor" strokeOpacity="0.05"
            />
            <text
              x={x(t)} y={height - padB + 14}
              textAnchor="middle"
              fontSize="10" fill="currentColor" opacity="0.55"
              fontFamily="inherit"
            >{formatShortTime(t)}</text>
          </g>
        ))}

        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="currentColor" strokeOpacity="0.25" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="currentColor" strokeOpacity="0.25" />

        {/* one stepped line per team */}
        {ranked.map((team, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const d = buildSteppedPath(team.series, x, y, tMax);
          const finalScore = last(team.series).score;
          return (
            <g key={team.teamId}>
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.95"
              />
              {/* dot at each solve */}
              {team.series.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.t)} cy={y(p.score)}
                  r="2.5" fill={color}
                />
              ))}
              {/* end-of-line label */}
              <text
                x={x(tMax) + 2}
                y={y(finalScore)}
                fontSize="10" fill={color}
                dominantBaseline="middle"
                fontFamily="inherit"
              >
                {finalScore}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {ranked.map((team, idx) => (
          <div key={team.teamId} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: PALETTE[idx % PALETTE.length] }}
            />
            <span className="text-muted-foreground">{team.teamName}</span>
          </div>
        ))}
        {teams.length > TOP_N && (
          <span className="text-muted-foreground italic">
            +{teams.length - TOP_N} more (top {TOP_N} shown)
          </span>
        )}
      </div>
    </div>
  );
}

// --- helpers ---

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

function buildSteppedPath(
  series: TimelinePoint[],
  x: (t: number) => number,
  y: (s: number) => number,
  tMax: number
): string {
  if (series.length === 0) return "";
  const parts: string[] = [];
  // Start at first solve at y=0 baseline (so the line steps up from there).
  parts.push(`M ${x(series[0].t)},${y(0)}`);
  let prevScore = 0;
  for (const p of series) {
    // horizontal to this time at prev score, then vertical jump to new score
    parts.push(`L ${x(p.t)},${y(prevScore)}`);
    parts.push(`L ${x(p.t)},${y(p.score)}`);
    prevScore = p.score;
  }
  // extend to the right edge so the final score reads cleanly
  parts.push(`L ${x(tMax)},${y(prevScore)}`);
  return parts.join(" ");
}

function niceTicks(max: number, count: number): number[] {
  const step = Math.max(1, Math.ceil(max / count));
  const out: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) out.push(v);
  return out;
}

function niceTimeTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(min + i * step));
}

function formatShortTime(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
