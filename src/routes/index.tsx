import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Gift,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { GlassCard } from "@/components/GlassCard";
import { fcfa, WHATSAPP_LINK } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Street Shore — Rechargez 5 000 F, recevez 20 000 F" },
      {
        name: "description",
        content:
          "Street Shore : plateforme d'investissement en Côte d'Ivoire. Rechargez 5 000 F via Wave, recevez 15 000 F, invitez 1 ami et atteignez 20 000 F.",
      },
      { property: "og:title", content: "Street Shore — Investissement Wave" },
      {
        property: "og:description",
        content: "Rechargez 5 000 F via Wave et recevez jusqu'à 20 000 F sur votre solde.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  {
    icon: Wallet,
    title: "1. Rechargez 5 000 F",
    text: "Paiement uniquement via Wave, en quelques secondes.",
  },
  {
    icon: Clock3,
    title: "2. Patientez 10 minutes",
    text: "Votre bonus de 15 000 F est crédité automatiquement.",
  },
  {
    icon: Users,
    title: "3. Invitez 1 ami",
    text: "Son dépôt vous rapporte 5 000 F de plus : 20 000 F au total.",
  },
];

function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo size={40} priority />
        <Link
          to="/auth"
          search={{ ref: undefined }}
          className="glass rounded-full px-4 py-2 text-sm font-semibold transition-transform duration-300 hover:scale-[1.03]"
        >
          Connexion
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-6 pb-14 text-center">
        <div className="rise mx-auto mb-6 flex justify-center">
          <div className="float-slow">
            <Logo size={132} withText={false} priority />
          </div>
        </div>
        <span className="glass rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" /> Bonus x3 sur chaque recharge
        </span>
        <h1 className="rise mt-5 text-4xl leading-tight font-extrabold sm:text-6xl">
          Rechargez <span className="text-gold">5 000 F</span>
          <br />
          recevez <span className="text-gradient">20 000 F</span>
        </h1>
        <p className="rise mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Street Shore transforme votre recharge Wave en solde investisseur. 15 000 F crédités
          après 10 minutes, + 5 000 F dès qu'un ami rejoint avec votre code.
        </p>
        <div className="rise mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
          search={{ ref: undefined }}
            className="glow inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.04]"
          >
            Créer mon compte <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/support"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            <MessageCircle className="size-4" /> Service client
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="mb-5 text-center text-xl font-bold">Comment ça marche</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <GlassCard key={s.title}>
              <s.icon className="mb-3 size-7 text-primary" />
              <h3 className="text-base font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <GlassCard strong className="text-center">
          <Gift className="mx-auto mb-3 size-8 text-gold" />
          <h2 className="text-2xl font-bold">Votre gain potentiel</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Dépôt", fcfa(5000)],
              ["Bonus après 10 min", fcfa(15000)],
              ["Avec 1 ami", fcfa(20000)],
            ].map(([label, value]) => (
              <div key={label} className="glass rounded-2xl p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-extrabold text-gradient">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard>
            <ShieldCheck className="mb-3 size-7 text-primary" />
            <h3 className="text-base font-bold">Paiement 100 % Wave</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Un seul moyen de paiement, un lien officiel, aucune donnée bancaire stockée.
            </p>
          </GlassCard>
          <GlassCard>
            <BadgeCheck className="mb-3 size-7 text-gold" />
            <h3 className="text-base font-bold">Code d'invitation unique</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Chaque membre reçoit son code personnel et suit ses filleuls en temps réel.
            </p>
          </GlassCard>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Street Shore — Abidjan, Côte d'Ivoire</p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-primary"
        >
          Support WhatsApp
        </a>
      </footer>
    </div>
  );
}
