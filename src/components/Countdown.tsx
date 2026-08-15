import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { EVENT_END } from "@/lib/format";
import { cn } from "@/lib/utils";

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor(ms / 3600000) % 24,
    m: Math.floor(ms / 60000) % 60,
    s: Math.floor(ms / 1000) % 60,
    over: ms === 0,
  };
}

export function Countdown({ className, compact = false }: { className?: string; compact?: boolean }) {
  // Valeur neutre au rendu serveur : évite tout écart d'hydratation.
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, over: false });

  useEffect(() => {
    setT(diff(EVENT_END));
    const id = setInterval(() => setT(diff(EVENT_END)), 1000);
    return () => clearInterval(id);
  }, []);

  const cells: [string, number][] = [
    ["JOURS", t.d],
    ["HEURES", t.h],
    ["MIN", t.m],
    ["SEC", t.s],
  ];

  return (
    <div className={cn("glass-strong pop-3d rounded-3xl px-4 py-4 text-center", className)}>
      <p className="flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-wide text-gold sm:text-xs">
        <Timer className="size-4 shrink-0 text-gold" />
        {t.over ? "OPÉRATION CADEAUX TERMINÉE" : "FIN DES CADEAUX STREET SHORE — PROFITEZ VITE !"}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {cells.map(([label, value]) => (
          <div key={label} className="glass rounded-2xl px-1 py-2">
            <p
              className={cn(
                "font-display font-extrabold tabular-nums text-gradient",
                compact ? "text-xl" : "text-2xl sm:text-4xl",
              )}
            >
              {String(value).padStart(2, "0")}
            </p>
            <p className="text-[9px] font-bold tracking-widest text-muted-foreground sm:text-[10px]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
