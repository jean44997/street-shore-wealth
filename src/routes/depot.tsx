import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, ExternalLink, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { DEPOSIT_MIN, fcfa, WAVE_LINK } from "@/lib/format";

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Dépôt Wave — Street Shore" },
      {
        name: "description",
        content:
          "Rechargez votre compte Street Shore via Wave à partir de 5 000 F et recevez votre bonus après 10 minutes.",
      },
      { property: "og:title", content: "Dépôt Wave Street Shore" },
      { property: "og:description", content: "Recharge Wave dès 5 000 F, bonus x3." },
    ],
  }),
  component: Depot,
});

const amounts = [5000, 10000, 20000, 50000];

function Depot() {
  const { session } = useRequireAuth();
  const { refreshProfile } = useProfile(!!session);
  const [amount, setAmount] = useState(DEPOSIT_MIN);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("submit_deposit", { p_amount: amount });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dépôt enregistré ! Bonus dans 10 minutes ⏳");
    refreshProfile();
    setPaid(true);
  };

  return (
    <AppShell>
      <h1 className="rise text-3xl font-extrabold">Dépôt Wave</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paiement uniquement via Wave. Votre bonus vaut 3x le montant déposé.
      </p>

      <GlassCard strong className="rise mt-6">
        <p className="text-xs font-semibold text-muted-foreground">MONTANT DU DÉPÔT</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {amounts.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`rounded-2xl py-3 text-sm font-bold transition-all duration-300 ${
                amount === a
                  ? "bg-primary text-primary-foreground glow"
                  : "glass text-muted-foreground"
              }`}
            >
              {fcfa(a)}
            </button>
          ))}
        </div>

        <div className="glass mt-5 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Vous recevrez</p>
          <p className="text-3xl font-extrabold text-gradient">{fcfa(amount * 3)}</p>
          <p className="mt-1 text-xs text-muted-foreground">+ 5 000 F par ami qui recharge</p>
        </div>
      </GlassCard>

      <GlassCard className="rise mt-4">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-6 text-primary" />
          <div>
            <p className="font-bold">Étape 1 — Payez sur Wave</p>
            <p className="text-sm text-muted-foreground">
              Envoyez exactement {fcfa(amount)} via le lien officiel Wave.
            </p>
            <a
              href={WAVE_LINK}
              target="_blank"
              rel="noreferrer"
              className="glow mt-3 inline-flex items-center gap-2 rounded-full bg-aqua px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Payer avec Wave <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="rise mt-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 text-success" />
          <div className="w-full">
            <p className="font-bold">Étape 2 — Confirmez votre dépôt</p>
            <p className="text-sm text-muted-foreground">
              Après le paiement, validez ici. Le bonus arrive automatiquement en 10 minutes.
            </p>
            <button
              disabled={loading || paid}
              onClick={confirm}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-success py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {paid ? "Dépôt enregistré" : "J'ai payé sur Wave"}
            </button>
          </div>
        </div>
      </GlassCard>

      {paid && (
        <GlassCard strong className="rise mt-4 text-center">
          <Clock3 className="mx-auto mb-2 size-8 text-gold" />
          <p className="font-bold">Patientez 10 minutes</p>
          <p className="text-sm text-muted-foreground">
            Votre bonus de {fcfa(amount * 3)} sera crédité automatiquement sur votre solde.
          </p>
        </GlassCard>
      )}
    </AppShell>
  );
}
