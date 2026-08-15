import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Ticket } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Logo } from "@/components/Logo";
import { fcfa } from "@/lib/format";

type Search = { code: string | undefined; name: string | undefined };

export const Route = createFileRoute("/merci")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    name: typeof s["name"] === "string" ? s["name"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Merci pour votre inscription — Street Shore" },
      {
        name: "description",
        content:
          "Merci de vous être inscrit avec un code promo Street Shore. Rechargez 5 000 F pour activer les bonus.",
      },
      { property: "og:title", content: "Merci — Street Shore" },
      { property: "og:description", content: "Rechargez 5 000 F pour activer votre bonus." },
    ],
  }),
  component: Merci,
});

function Merci() {
  const { code, name } = Route.useSearch();

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="float-slow">
        <Logo size={110} withText={false} priority />
      </div>

      <HeartHandshake className="rise mt-6 size-10 text-success" />
      <h1 className="rise mt-4 text-3xl font-extrabold">
        Merci de vous être inscrit
        <br />
        avec le code <span className="text-gold">{code ?? "promo"}</span>
      </h1>
      <p className="rise mt-3 text-sm text-muted-foreground">
        Vous avez rejoint Street Shore grâce à {name ?? "un membre"}. Rechargez {fcfa(5000)} pour
        recevoir {fcfa(20000)} sur votre solde et débloquer le retrait de{" "}
        {name ?? "votre parrain"}.
      </p>

      <GlassCard strong className="rise mt-8 w-full">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
          <Ticket className="size-4" /> CODE PROMO APPLIQUÉ
        </div>
        <p className="mt-2 text-3xl font-extrabold tracking-[0.3em] text-gradient">
          {code ?? "—"}
        </p>
      </GlassCard>

      <Link
        to="/depot"
        className="glow rise mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.02]"
      >
        Recharger 5 000 F via Wave
      </Link>
      <Link to="/tableau-de-bord" className="mt-3 text-sm text-muted-foreground">
        Plus tard, voir mon solde
      </Link>
    </div>
  );
}
