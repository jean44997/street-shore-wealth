import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { fcfa, WITHDRAW_MIN } from "@/lib/format";

export const Route = createFileRoute("/retrait")({
  head: () => ({
    meta: [
      { title: "Retrait Wave — Street Shore" },
      {
        name: "description",
        content:
          "Lancez le retrait de votre solde Street Shore vers votre numéro Wave à partir de 20 000 F.",
      },
      { property: "og:title", content: "Retrait Street Shore" },
      { property: "og:description", content: "Retirez votre solde vers Wave dès 20 000 F." },
    ],
  }),
  component: Retrait,
});

function Retrait() {
  const { session } = useRequireAuth();
  const { data: profile, refreshProfile } = useProfile(!!session);
  const [amount, setAmount] = useState<string>(String(WITHDRAW_MIN));
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: history, refetch } = useQuery({
    queryKey: ["withdrawals"],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      p_amount: Number(amount),
      p_number: number,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success("Retrait lancé ! Traitement en cours 🌊");
    setNumber("");
    refreshProfile();
    refetch();
  };

  return (
    <AppShell>
      <h1 className="rise text-3xl font-extrabold">Retrait</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Retrait minimum {fcfa(WITHDRAW_MIN)}, versé sur votre numéro Wave.
      </p>

      <GlassCard strong className="rise mt-6">
        <p className="text-xs text-muted-foreground">SOLDE DISPONIBLE</p>
        <p className="text-4xl font-extrabold text-gradient">{fcfa(profile?.balance ?? 0)}</p>

        <div className="mt-5 space-y-3">
          <div className="glass rounded-2xl px-4 py-3">
            <label className="text-xs text-muted-foreground">Montant à retirer</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-lg font-bold outline-none"
            />
          </div>
          <div className="glass rounded-2xl px-4 py-3">
            <label className="text-xs text-muted-foreground">Numéro Wave</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Ex : 0700000000"
              maxLength={20}
              className="w-full bg-transparent text-lg font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <button
          disabled={loading}
          onClick={submit}
          className="glow mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowDownToLine className="size-4" />}
          Lancer le retrait
        </button>
      </GlassCard>

      <GlassCard className="rise mt-4 flex items-start gap-3">
        <Info className="mt-0.5 size-5 text-gold" />
        <p className="text-sm text-muted-foreground">
          Les retraits sont traités manuellement par notre équipe. Le solde est débité dès la
          demande.
        </p>
      </GlassCard>

      <h2 className="mt-8 mb-3 text-lg font-bold">Historique</h2>
      {(history ?? []).length === 0 ? (
        <GlassCard className="text-sm text-muted-foreground">Aucun retrait pour l'instant.</GlassCard>
      ) : (
        <div className="space-y-3">
          {(history ?? []).map((w) => (
            <GlassCard key={w.id} className="flex items-center justify-between">
              <div>
                <p className="font-bold">{fcfa(w.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.wave_number} · {new Date(w.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
                {w.status === "pending" ? "En cours" : "Payé"}
              </span>
            </GlassCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
