import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Chrome, Download, Share, Smartphone, SquarePlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";

export const Route = createFileRoute("/installation")({
  head: () => ({
    meta: [
      { title: "Installer l'application — Street Shore" },
      {
        name: "description",
        content:
          "Installez Street Shore sur votre écran d'accueil en quelques secondes : instructions Android, iPhone et ordinateur.",
      },
      { property: "og:title", content: "Installer Street Shore" },
      {
        property: "og:description",
        content: "Ajoutez Street Shore à votre écran d'accueil, comme une vraie app.",
      },
    ],
  }),
  component: Installation,
});

type Guide = { id: string; label: string; icon: typeof Share; steps: string[] };

const guides: Guide[] = [
  {
    id: "android",
    label: "Android · Chrome",
    icon: Chrome,
    steps: [
      "Ouvrez Street Shore dans Chrome.",
      "Touchez le menu ⋮ en haut à droite.",
      "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
      "Confirmez : l'icône Street Shore apparaît sur votre écran.",
    ],
  },
  {
    id: "ios",
    label: "iPhone · Safari",
    icon: Share,
    steps: [
      "Ouvrez Street Shore dans Safari (pas Chrome).",
      "Touchez le bouton Partager (carré avec une flèche).",
      "Faites défiler et choisissez « Sur l'écran d'accueil ».",
      "Touchez « Ajouter » en haut à droite.",
    ],
  },
  {
    id: "desktop",
    label: "Ordinateur",
    icon: SquarePlus,
    steps: [
      "Ouvrez Street Shore dans Chrome ou Edge.",
      "Cliquez sur l'icône d'installation dans la barre d'adresse.",
      "Cliquez sur « Installer ».",
      "L'app s'ouvre dans sa propre fenêtre.",
    ],
  },
];

function detect(): string {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function Installation() {
  const [tab, setTab] = useState("android");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<{ prompt: () => void } | null>(null);

  useEffect(() => {
    setTab(detect());
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as unknown as { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const guide = guides.find((g) => g.id === tab) ?? guides[0]!;
  const total = guide.steps.length;
  const checked = guide.steps.filter((_, i) => done[`${guide.id}-${i}`]).length;

  return (
    <AppShell>
      <h1 className="rise text-2xl font-extrabold sm:text-3xl">Installer Street Shore</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ajoutez l'application à votre écran d'accueil pour un accès instantané, plein écran.
      </p>

      {installed && (
        <GlassCard className="rise mt-5 flex items-center gap-3 border-success/40 text-sm text-success">
          <Check className="size-5 shrink-0" /> L'application est déjà installée sur cet appareil 🎉
        </GlassCard>
      )}

      {prompt && !installed && (
        <button
          onClick={() => prompt.prompt()}
          className="glow rise mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
        >
          <Download className="size-4" /> Installer maintenant en 1 clic
        </button>
      )}

      <div className="glass mt-6 flex gap-1 overflow-x-auto rounded-full p-1">
        {guides.map((g) => (
          <button
            key={g.id}
            onClick={() => setTab(g.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
              tab === g.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <g.icon className="size-4" /> {g.label}
          </button>
        ))}
      </div>

      <GlassCard strong className="rise mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold">
            <Smartphone className="size-5 text-primary" /> {guide.label}
          </p>
          <p className="text-xs font-bold text-muted-foreground">
            {checked}/{total}
          </p>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(checked / total) * 100}%` }}
          />
        </div>

        <ul className="mt-4 space-y-2.5">
          {guide.steps.map((s, i) => {
            const key = `${guide.id}-${i}`;
            const ok = !!done[key];
            return (
              <li key={key}>
                <button
                  onClick={() => setDone((d) => ({ ...d, [key]: !ok }))}
                  className="glass flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left"
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                      ok ? "border-success bg-success text-primary-foreground" : "border-border"
                    }`}
                  >
                    {ok && <Check className="size-3.5" />}
                  </span>
                  <span
                    className={`text-sm ${ok ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {s}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </AppShell>
  );
}
