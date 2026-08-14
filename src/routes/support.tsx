import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Logo } from "@/components/Logo";
import { WHATSAPP_LINK } from "@/lib/format";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Service client WhatsApp — Street Shore" },
      {
        name: "description",
        content:
          "Contactez l'équipe Street Shore sur WhatsApp pour vos dépôts Wave, retraits et bonus de parrainage.",
      },
      { property: "og:title", content: "Service client Street Shore" },
      { property: "og:description", content: "Assistance WhatsApp dépôts, retraits et bonus." },
    ],
  }),
  component: Support,
});

function Support() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="glass rounded-full p-2.5">
          <ArrowLeft className="size-4" />
        </Link>
        <Logo size={34} />
      </div>

      <h1 className="rise text-3xl font-extrabold">Service client</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Une question sur un dépôt, un bonus ou un retrait ? Notre équipe vous répond sur WhatsApp.
      </p>

      <GlassCard strong className="rise mt-6 text-center">
        <MessageCircle className="mx-auto mb-3 size-10 text-success" />
        <h2 className="text-xl font-bold">Discutons sur WhatsApp</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Réponse rapide, 7j/7. Munissez-vous de votre reçu Wave.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="glow mt-5 inline-flex items-center gap-2 rounded-full bg-success px-6 py-3 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.04]"
        >
          <MessageCircle className="size-4" /> Ouvrir WhatsApp
        </a>
      </GlassCard>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <Clock3 className="mb-2 size-6 text-primary" />
          <h3 className="font-bold">Délai des bonus</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            10 minutes après un dépôt Wave validé.
          </p>
        </GlassCard>
        <GlassCard>
          <ShieldCheck className="mb-2 size-6 text-gold" />
          <h3 className="font-bold">Sécurité</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Nous ne demandons jamais votre code secret Wave.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
