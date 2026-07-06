import { useMemo } from "react";

interface Ember {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  hue: "gold" | "mana";
}

const COLORS: Record<Ember["hue"], string> = {
  gold: "rgba(223,177,90,0.55)",
  mana: "rgba(91,184,232,0.4)",
};

export function AmbientEmbers({ count = 18 }: { count?: number }) {
  const embers = useMemo<Ember[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.round(Math.random() * 100)}%`,
        size: 2 + Math.random() * 3,
        duration: 14 + Math.random() * 16,
        delay: -Math.random() * 20,
        drift: (Math.random() - 0.5) * 60,
        hue: Math.random() > 0.75 ? "mana" : "gold",
      })),
    [count]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {embers.map((e) => (
        <span
          key={e.id}
          className="absolute bottom-0 rounded-full animate-drift"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            background: COLORS[e.hue],
            boxShadow: `0 0 6px 2px ${COLORS[e.hue]}`,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
