import { createFileRoute, Link } from "@tanstack/react-router";
import { PartyPopper, Rocket, Users, Wallet } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Logo } from "@/components/Logo";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/bienvenue")({
  head: () => ({
    meta: [
      { title: "Bienvenue sur Street Shore" },
      {
        name: "description",
        content:
          "Votre compte Street Shore est prêt : rechargez 5 000 F et recevez 20 000 F en ajoutant 1 ami.",
      },
      { property: "og:title", content: "Bienvenue sur Street Shore" },
      { property: "og:description", content: "Rechargez 5 000 F, recevez 20 000 F." },
    ],
  }),
  component: Bienvenue,
});

function Bienvenue() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="float-slow">
        <Logo size={120} withText={false} priority />
      </div>

      <span className="glass rise mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-gold">
        <PartyPopper className="size-4" /> Compte créé avec succès
      </span>

      <h1 className="rise mt-4 text-4xl font-extrabold">
        Rechargez <span className="text-gold">5 000 F</span>
        <br />
        recevez <span className="text-gradient">20 000 F</span>
      </h1>
      <p className="rise mt-3 text-sm text-muted-foreground">
        {fcfa(20000)} crédités (5 000 F + 15 000 F de bonus) après vérification, puis invitez 1 ami
        pour débloquer votre retrait.
      </p>

      <GlassCard strong className="rise mt-8 w-full text-left">
        <div className="space-y-4">
          {[
            { icon: Wallet, t: "Faites votre dépôt Wave", d: "Minimum 5 000 F, un seul lien officiel." },
            { icon: Rocket, t: "Bonus automatique", d: "Votre solde grimpe après 10 minutes." },
            { icon: Users, t: "Invitez 1 ami", d: "Votre code unique vous rapporte 5 000 F." },
          ].map((s) => (
            <div key={s.t} className="flex items-start gap-3">
              <div className="glass rounded-2xl p-2.5">
                <s.icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-bold">{s.t}</p>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard strong className="rise mt-5 w-full text-left">
        <div className="flex items-center gap-3">
          <Logo size={44} withText={false} />
          <div className="min-w-0">
            <p className="font-bold">Rejoignez le groupe officiel</p>
            <p className="text-sm text-muted-foreground">
              Annonces, preuves de paiement et aide en direct avec l'équipe Street Shore.
            </p>
          </div>
        </div>
        <a
          href={WHATSAPP_GROUP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-success/20 py-3 text-sm font-bold text-success transition-transform duration-300 hover:scale-[1.02]"
        >
          <MessageCircle className="size-4" aria-hidden="true" /> Rejoindre le groupe WhatsApp
        </a>
      </GlassCard>


      <Link
        to="/depot"
        className="glow rise mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.02]"
      >
        Recharger maintenant
      </Link>
      <Link to="/tableau-de-bord" className="mt-3 text-sm text-muted-foreground">
        Voir mon solde
      </Link>
    </div>
  );
}
