import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Carte à gratter 3D : couche métallique effacée au doigt / à la souris.
 * Le lot est déjà décidé côté serveur, on ne fait que le révéler.
 */
export function ScratchCard({
  children,
  onRevealed,
  disabled = false,
  revealed = false,
  className,
  threshold = 0.45,
}: {
  children: React.ReactNode;
  onRevealed: () => void;
  disabled?: boolean;
  revealed?: boolean;
  className?: string;
  threshold?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const done = useRef(false);
  const [cleared, setCleared] = useState(false);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#1d4f5c");
    g.addColorStop(0.45, "#3fb8a6");
    g.addColorStop(0.55, "#f4c445");
    g.addColorStop(1, "#17323f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.arc(((i * 137) % width), ((i * 71) % height), 18 + ((i * 13) % 26), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `600 ${Math.max(13, Math.min(18, width / 22))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("GRATTEZ ICI 🪙", width / 2, height / 2 + 6);
  }, []);

  useEffect(() => {
    if (revealed) return;
    paint();
    const ro = new ResizeObserver(() => {
      if (!done.current) paint();
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [paint, revealed]);

  const progress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    for (let i = 3; i < data.length; i += 4 * 24) if (data[i] === 0) clear++;
    return clear / (data.length / (4 * 24));
  };

  const scratchAt = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || done.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr, 26 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (progress() > threshold) {
      done.current = true;
      setCleared(true);
      onRevealed();
    }
  };

  const show = revealed || cleared;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "tilt-3d relative aspect-[16/9] w-full overflow-hidden rounded-3xl select-none",
        "glass-strong shadow-[0_28px_60px_-24px_rgba(0,0,0,0.75)]",
        className,
      )}
    >
      <div className="absolute inset-0 grid place-items-center p-4 text-center">{children}</div>

      {!show && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full touch-none",
            disabled ? "pointer-events-none opacity-60" : "cursor-crosshair",
          )}
          onPointerDown={(e) => {
            if (disabled) return;
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scratchAt(e);
          }}
          onPointerMove={(e) => {
            if (drawing.current && !disabled) scratchAt(e);
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
      )}

      {!show && !disabled && (
        <button
          onClick={() => {
            done.current = true;
            setCleared(true);
            onRevealed();
          }}
          className="glass absolute right-3 bottom-3 z-10 rounded-full px-3 py-1.5 text-[11px] font-bold"
        >
          Tout révéler
        </button>
      )}
    </div>
  );
}
