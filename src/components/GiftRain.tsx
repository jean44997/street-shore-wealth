import { useMemo } from "react";
import { cn } from "@/lib/utils";

const EMOJIS = ["🎁", "🎉", "💎", "🪙", "✨", "🎊"];
const COLORS = ["#39d3b6", "#f4c445", "#5ecbf0", "#ff7ab8", "#a6f0c6"];

/**
 * Pluie de cadeaux + confettis en 3D. Purement décoratif.
 */
export function GiftRain({
  count = 18,
  className,
  fixed = true,
}: {
  count?: number;
  className?: string;
  fixed?: boolean;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const isGift = i % 2 === 0;
        return {
          id: i,
          isGift,
          left: Math.round((i / count) * 100 + (i * 13) % 7),
          delay: ((i * 37) % 90) / 10,
          duration: 7 + ((i * 17) % 60) / 10,
          size: isGift ? 16 + ((i * 7) % 16) : 6 + ((i * 5) % 6),
          color: COLORS[i % COLORS.length] as string,
          emoji: EMOJIS[i % EMOJIS.length] as string,
        };
      }),
    [count],
  );

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none z-0 overflow-hidden",
        fixed ? "fixed inset-0" : "absolute inset-0",
        className,
      )}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="gift-fall absolute top-[-12%] block will-change-transform"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: p.isGift ? `${p.size}px` : undefined,
          }}
        >
          {p.isGift ? (
            <span className="drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]">{p.emoji}</span>
          ) : (
            <span
              className="block rounded-[2px]"
              style={{
                width: p.size,
                height: p.size * 1.6,
                background: p.color,
                opacity: 0.85,
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
