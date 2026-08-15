import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = {
  title: string;
  text: string;
  state: "done" | "current" | "todo";
};

export function Timeline({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-4 pl-8", className)}>
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[13px] w-px bg-gradient-to-b from-primary/60 via-border to-transparent"
      />
      {steps.map((s) => (
        <li key={s.title} className="relative">
          <span
            className={cn(
              "absolute top-0.5 -left-8 grid size-7 place-items-center rounded-full border",
              s.state === "done" && "border-success/50 bg-success/20 text-success",
              s.state === "current" && "border-gold/50 bg-gold/20 text-gold pulse-ring",
              s.state === "todo" && "border-border bg-muted text-muted-foreground",
            )}
          >
            {s.state === "done" ? (
              <Check className="size-4" />
            ) : s.state === "current" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Circle className="size-3" />
            )}
          </span>
          <p
            className={cn(
              "text-sm font-bold",
              s.state === "todo" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {s.title}
          </p>
          <p className="text-xs text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
