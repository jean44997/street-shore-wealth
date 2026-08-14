import logo from "@/assets/street-shore-logo.png";
import { cn } from "@/lib/utils";

export function Logo({
  size = 44,
  withText = true,
  className,
  priority = false,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Logo Street Shore"
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        style={{ width: size, height: size }}
        className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
      />
      {withText && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          Street <span className="text-gradient">Shore</span>
        </span>
      )}
    </div>
  );
}
