import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";

type Props = {
  trigger: number;
  title?: string;
  subtitle?: string;
};

const BALLOON_COLORS = [
  "#a855f7", // purple
  "#ec4899", // pink
  "#f97316", // orange
  "#84cc16", // lime
  "#22c55e", // green
  "#60a5fa", // blue
] as const;

/**
 * Animated overlay shown after a successful level completion.
 * Uses canvas-confetti + simple CSS balloon burst (no images required).
 */
export default function LevelCelebration({
  trigger,
  title = "Level voltooid!",
  subtitle,
}: Props) {
  const [isVisible, setIsVisible] = useState(false);

  const balloons = useMemo(() => {
    const count = 7;
    const baseSeed = trigger * 9973;
    const items: { leftPct: number; color: string; delayMs: number }[] = [];
    for (let i = 0; i < count; i++) {
      const n = (baseSeed + i * 101) % 1000;
      const leftPct = 10 + (n % 80); // 10..89
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length]!;
      const delayMs = (n % 180) + i * 18; // stagger
      items.push({ leftPct, color, delayMs });
    }
    return items;
  }, [trigger]);

  useEffect(() => {
    if (!trigger) return;

    // Fire confetti in two bursts for a more "wow" feel.
    const run = async () => {
      confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.55 },
        zIndex: 120,
      });
      await new Promise((r) => setTimeout(r, 280));
      confetti({
        particleCount: 90,
        spread: 55,
        origin: { y: 0.6 },
        zIndex: 120,
      });
    };

    void run();
  }, [trigger]);

  useEffect(() => {
    if (!trigger) return;
    setIsVisible(true);
    const t = window.setTimeout(() => setIsVisible(false), 2400);
    return () => window.clearTimeout(t);
  }, [trigger]);

  // Always render the overlay; only animate when `trigger` changes.
  return (
    <>
      <style>
        {`
          @keyframes balloonPopUp {
            0% { transform: translateY(60px) scale(0.2); opacity: 0; }
            18% { transform: translateY(0px) scale(1); opacity: 1; }
            70% { opacity: 1; }
            100% { transform: translateY(-210px) scale(0.95); opacity: 0; }
          }
          @keyframes confettiTextIn {
            0% { transform: translateY(8px); opacity: 0; }
            100% { transform: translateY(0px); opacity: 1; }
          }
        `}
      </style>
      <div
        className="fixed inset-0 z-[120] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{ opacity: isVisible ? 1 : 0, transition: "opacity 120ms ease-out" }}
        />

        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div
            key={trigger}
            className="text-center max-w-md"
            style={{
              animation: isVisible ? "confettiTextIn 420ms ease-out both" : "none",
              display: isVisible ? "block" : "none",
            }}
          >
            <div className="text-2xl font-bold text-white drop-shadow-sm">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm text-white/90 drop-shadow-sm">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute inset-0">
          {isVisible
            ? balloons.map((b, idx) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${trigger}-${idx}`}
                  className="absolute bottom-[-40px]"
                  style={{
                    left: `${b.leftPct}%`,
                    animation: `balloonPopUp 900ms cubic-bezier(.2,.9,.2,1) ${b.delayMs}ms both`,
                  }}
                >
                  <div
                    className="w-7 h-10 rounded-[999px] flex items-center justify-center"
                    style={{
                      background: `linear-gradient(180deg, ${b.color}, rgba(0,0,0,0) 120%)`,
                      boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                    }}
                  />
                  <div
                    className="w-[2px] h-10 bg-white/70"
                    style={{ margin: "0 auto", transform: "translateY(-6px)" }}
                  />
                </div>
              ))
            : null}
        </div>
      </div>
    </>
  );
}

