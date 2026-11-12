// Illustrated hero: Colmar's half-timbered houses on the Little Venice canal,
// on a winter evening, with a string of Christmas lights between the gables.

const BASE = 214; // street / canal level
const ROOFS = ["#8E3B2F", "#6E3A2E", "#9A4A33"];
const BULBS = ["#FFD166", "#EF476F", "#7BE0B0", "#FFE9A8"];

const HOUSES = [
  { w: 58, h: 78, roof: 40, c: "#E9B949" },
  { w: 50, h: 96, roof: 46, c: "#E58F73" },
  { w: 62, h: 70, roof: 34, c: "#76B5B0" },
  { w: 54, h: 104, roof: 50, c: "#F3D9B1" },
  { w: 56, h: 82, roof: 42, c: "#9DBF8F" },
  { w: 52, h: 94, roof: 44, c: "#D98BA0" },
  { w: 60, h: 74, roof: 36, c: "#E9B949" },
];

const STARS = [
  [70, -22], [120, 4], [160, -36], [205, 18], [240, -10], [95, 30], [30, 52], [180, 40], [260, 34], [140, -48], [300, 46],
];

type H = (typeof HOUSES)[number] & { x: number; top: number; peak: [number, number] };

function layout(): H[] {
  let x = 4;
  return HOUSES.map((h) => {
    const top = BASE - h.h;
    const out = { ...h, x, top, peak: [x + h.w / 2, top - h.roof] as [number, number] };
    x += h.w;
    return out;
  });
}

function bezier(p0: [number, number], c: [number, number], p1: [number, number], t: number) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
}

function House({ h, i }: { h: H; i: number }) {
  const floors = h.h > 88 ? 3 : 2;
  const fh = h.h / floors;
  const beam = "#5A3A28";
  const els: React.ReactNode[] = [];

  for (let f = 0; f < floors; f++) {
    const y0 = BASE - (f + 1) * fh;
    // floor beam
    els.push(<line key={`b${f}`} x1={h.x} y1={y0} x2={h.x + h.w} y2={y0} stroke={beam} strokeWidth={2.4} />);
    if (f === 0) {
      // ground floor: door + two small windows
      els.push(
        <rect key="door" x={h.x + h.w * 0.4} y={BASE - fh * 0.62} width={h.w * 0.2} height={fh * 0.62} rx={h.w * 0.1} fill="#4A2E20" />,
        <rect key="gw1" x={h.x + h.w * 0.1} y={y0 + fh * 0.3} width={h.w * 0.18} height={fh * 0.34} fill="#FFD98A" className="win" />,
        <rect key="gw2" x={h.x + h.w * 0.72} y={y0 + fh * 0.3} width={h.w * 0.18} height={fh * 0.34} fill="#FFD98A" className="win" />
      );
    } else {
      // upper floors: half-timber braces + two lit windows
      els.push(
        <line key={`l${f}`} x1={h.x + 2} y1={y0 + fh} x2={h.x + h.w * 0.2} y2={y0} stroke={beam} strokeWidth={2} />,
        <line key={`r${f}`} x1={h.x + h.w - 2} y1={y0 + fh} x2={h.x + h.w * 0.8} y2={y0} stroke={beam} strokeWidth={2} />,
        <line key={`m${f}`} x1={h.x + h.w / 2} y1={y0} x2={h.x + h.w / 2} y2={y0 + fh} stroke={beam} strokeWidth={2} />,
        <rect key={`w1${f}`} x={h.x + h.w * 0.24} y={y0 + fh * 0.26} width={h.w * 0.18} height={fh * 0.44} fill="#FFD98A" className="win" />,
        <rect key={`w2${f}`} x={h.x + h.w * 0.58} y={y0 + fh * 0.26} width={h.w * 0.18} height={fh * 0.44} fill="#FFD98A" className="win" />
      );
    }
  }

  const [px, py] = h.peak;
  return (
    <g>
      <rect x={h.x} y={h.top} width={h.w} height={h.h} fill={h.c} />
      <rect x={h.x} y={h.top} width={h.w} height={h.h} fill="url(#dusk)" />
      {els}
      <rect x={h.x} y={h.top} width={h.w} height={h.h} fill="none" stroke={beam} strokeWidth={2.4} />
      <polygon points={`${h.x - 3},${h.top} ${px},${py} ${h.x + h.w + 3},${h.top}`} fill={ROOFS[i % ROOFS.length]} />
      <rect x={px - 4} y={py + h.roof * 0.42} width={8} height={9} fill="#FFD98A" className="win" />
      {/* snow on the roof edges */}
      <polyline
        points={`${h.x - 4},${h.top + 1} ${px},${py - 1} ${h.x + h.w + 4},${h.top + 1}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* reflection in the canal */}
      <rect x={h.x + 2} y={BASE + 4} width={h.w - 4} height={26} fill={h.c} opacity={0.22} />
      <rect x={h.x + h.w * 0.26} y={BASE + 8} width={h.w * 0.12} height={2} fill="#FFD98A" opacity={0.7} />
      <rect x={h.x + h.w * 0.6} y={BASE + 14} width={h.w * 0.12} height={2} fill="#FFD98A" opacity={0.5} />
    </g>
  );
}

export default function ColmarScene() {
  const houses = layout();

  // a string of lights hanging from gable to gable
  const garland: React.ReactNode[] = [];
  houses.slice(0, -1).forEach((h, i) => {
    const a = h.peak;
    const b = houses[i + 1].peak;
    const c: [number, number] = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 24];
    garland.push(
      <path key={`g${i}`} d={`M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`} fill="none" stroke="#2B1D16" strokeWidth={1} opacity={0.8} />
    );
    [0.2, 0.4, 0.6, 0.8].forEach((t, j) => {
      const [x, y] = bezier(a, c, b, t);
      garland.push(
        <circle
          key={`l${i}-${j}`}
          cx={x}
          cy={y + 2}
          r={2.6}
          fill={BULBS[(i + j) % BULBS.length]}
          className="bulb"
          style={{ animationDelay: `${((i * 4 + j) % 7) * 0.35}s` }}
        />
      );
    });
  });

  return (
    <svg className="colmar-scene" viewBox="0 -56 400 306" role="img" aria-label="קולמר בערב חג המולד">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141B33" />
          <stop offset="0.55" stopColor="#2A2F57" />
          <stop offset="1" stopColor="#5B4A7A" />
        </linearGradient>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A1430" stopOpacity="0.05" />
          <stop offset="1" stopColor="#1A1430" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2C3B63" />
          <stop offset="1" stopColor="#17203C" />
        </linearGradient>
        <radialGradient id="moonglow">
          <stop offset="0" stopColor="#FFF3D6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF3D6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect y="-56" width="400" height="306" fill="url(#sky)" />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#FFF6DA" className="star" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
      <circle cx="44" cy="2" r="34" fill="url(#moonglow)" />
      <circle cx="44" cy="2" r="13" fill="#FFF3D6" />
      <circle cx="49" cy="-2" r="11" fill="#2A2F57" opacity="0.18" />

      {houses.map((h, i) => (
        <House key={i} h={h} i={i} />
      ))}
      {garland}

      {/* quay + Little Venice canal */}
      <rect x="0" y={BASE} width="400" height="4" fill="#3B2A20" />
      <rect x="0" y={BASE + 4} width="400" height={250 - BASE - 4} fill="url(#water)" opacity="0.92" />
      <path d={`M0,${BASE + 20} q20,-3 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0`} stroke="#9FB4E0" strokeOpacity="0.25" fill="none" />

      {/* little boat */}
      <path d={`M300,${BASE + 18} h44 l-6,8 h-32 z`} fill="#7A4A2E" />
      <rect x="320" y={BASE + 10} width="3" height="8" fill="#5A3A28" />

      {/* Christmas tree on the quay */}
      <g transform={`translate(18 ${BASE})`}>
        <rect x="-3" y="-8" width="6" height="8" fill="#5A3A28" />
        <polygon points="0,-62 -16,-30 16,-30" fill="#1F5C43" />
        <polygon points="0,-48 -20,-14 20,-14" fill="#1F5C43" />
        <polygon points="0,-34 -24,-6 24,-6" fill="#1A4D38" />
        <polyline points="-14,-34 14,-22 -18,-14 18,-8" fill="none" stroke="#FFD166" strokeWidth="1.2" opacity="0.9" />
        <circle cx="-8" cy="-28" r="2" fill="#EF476F" className="bulb" />
        <circle cx="9" cy="-18" r="2" fill="#FFD166" className="bulb" style={{ animationDelay: "0.6s" }} />
        <circle cx="-12" cy="-11" r="2" fill="#7BE0B0" className="bulb" style={{ animationDelay: "1.1s" }} />
        <path d="M0,-70 l2.4,5 5.4,0.6 -4,3.6 1.2,5.3 -5,-2.8 -5,2.8 1.2,-5.3 -4,-3.6 5.4,-0.6z" fill="#FFD166" />
      </g>
    </svg>
  );
}
