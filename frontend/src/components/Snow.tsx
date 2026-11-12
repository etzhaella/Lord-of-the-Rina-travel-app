// Gentle falling snow behind the content. Deterministic so server and
// client render the same markup; disabled for prefers-reduced-motion in CSS.
const FLAKES = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((i * 9301 + n * 49297) % 233280) / 233280;
  return {
    left: `${Math.round(r(1) * 100)}%`,
    size: 3 + Math.round(r(2) * 4),
    duration: `${9 + Math.round(r(3) * 10)}s`,
    delay: `-${Math.round(r(4) * 18)}s`,
    drift: `${Math.round(r(5) * 40 - 20)}px`,
    opacity: 0.35 + r(6) * 0.5,
  };
});

export default function Snow() {
  return (
    <div className="snow" aria-hidden>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          style={
            {
              left: f.left,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              animationDuration: f.duration,
              animationDelay: f.delay,
              "--drift": f.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
