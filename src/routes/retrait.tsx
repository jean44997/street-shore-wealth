import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Clock3, Gift, Info, Loader2, Lock, RefreshCw, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { GiftRain } from "@/components/GiftRain";
import { Timeline, type Step } from "@/components/Timeline";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { dt, fcfa, WITHDRAW_ETA_HOURS, WITHDRAW_MIN } from "@/lib/format";

export const Route = createFileRoute("/retrait")({
  head: () => ({
    meta: [
      { title: "Retrait Wave — Street Shore" },
      {
        name: "description",
        content:
          "Lancez le retrait de votre solde Street Shore vers votre numéro Wave à partir de 20 000 F, après validation de votre parrainage.",
      },
      { property: "og:title", content: "Retrait Street Shore" },
      { property: "og:description", content: "Retirez votre solde vers Wave dès 20 000 F." },
    ],
  }),
  component: Retrait,
});

type Referral = { full_name: string; created_at: string; has_deposited: boolean };

type WithdrawStatus = {
  unlocked: boolean;
  reason: string;
  blocked: boolean;
  has_deposited: boolean;
  vip: boolean;
  no_referral: boolean;
  flag_unlocked: boolean;
  invited: number;
  active_referrals: number;
  pending_withdrawals: number;
};

function Retrait() {
  const { session } = useRequireAuth();
  const { data: profile, refreshProfile } = useProfile(!!session);
  const [amount, setAmount] = useState<string>(String(WITHDRAW_MIN));
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [gate, setGate] = useState(false);

  const { data: referrals } = useQuery({
    queryKey: ["referrals"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase.rpc("my_referrals");
      return (data ?? []) as Referral[];
    },
  });

  const {
    data: status,
    refetch: refetchStatus,
    isFetching: checking,
  } = useQuery({
    queryKey: ["withdraw-status"],
    enabled: !!session,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("withdraw_status");
      if (error) throw error;
      return data as unknown as WithdrawStatus;
    },
  });

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

  const invited = status?.invited ?? referrals?.length ?? 0;
  const active =
    status?.active_referrals ?? (referrals ?? []).filter((r) => r.has_deposited).length;
  const unlocked = status?.unlocked ?? false;

  const steps: Step[] = [
    {
      title: "Invitez 1 ami",
      text: "Partagez votre code d'invitation unique.",
      state: invited > 0 ? "done" : "current",
    },
    {
      title: "Votre ami recharge 5 000 F",
      text: "Son dépôt Wave doit être validé par l'équipe.",
      state: active > 0 ? "done" : invited > 0 ? "current" : "todo",
    },
    {
      title: "Retrait débloqué",
      text: "Votre solde part vers votre numéro Wave.",
      state: unlocked ? "done" : "todo",
    },
    {
      title: `Versement Wave sous ${WITHDRAW_ETA_HOURS} h`,
      text: "Notre équipe traite les retraits manuellement, du lundi au dimanche.",
      state: (status?.pending_withdrawals ?? 0) > 0 ? "current" : "todo",
    },
  ];

  const submit = async () => {
    const fresh = await refetchStatus();
    if (!(fresh.data?.unlocked ?? unlocked)) {
      setGate(true);
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      p_amount: Number(amount),
      p_number: number,
    });
    setLoading(false);
    void refetchStatus();
    if (error) {
      const msg = error.message.replace(/^.*?:\s*/, "");
      if (/parrain|ami|filleul/i.test(msg)) setGate(true);
      toast.error(msg);
      return;
    }
    toast.success("Retrait lancé ! Traitement en cours 🌊");
    setNumber("");
    refreshProfile();
    refetch();
  };

  return (
    <AppShell>
      <h1 className="rise text-2xl font-extrabold sm:text-3xl">Retrait</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Retrait minimum {fcfa(WITHDRAW_MIN)}, versé sur votre numéro Wave.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <GlassCard strong className="rise">
          <p className="text-xs text-muted-foreground">SOLDE DISPONIBLE</p>
          <p className="text-4xl font-extrabold text-gradient sm:text-5xl">
            {fcfa(profile?.balance ?? 0)}
          </p>

          <div
            className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold ${
              unlocked ? "bg-success/15 text-success" : "bg-gold/15 text-gold"
            }`}
          >
            {unlocked ? <Gift className="size-4" /> : <Lock className="size-4" />}
            <span className="min-w-0 flex-1">{status?.reason ?? "Vérification en cours…"}</span>
            <button
              type="button"
              onClick={() => refetchStatus()}
              aria-label="Actualiser mon statut de retrait"
              className="shrink-0 rounded-full p-1 transition-transform hover:scale-110"
            >
              <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
            </button>
          </div>

          {unlocked && (
            <p className="mt-2 text-xs text-muted-foreground">
              {active} ami(s) actif(s) sur {invited} invité(s) · versement Wave sous{" "}
              {WITHDRAW_ETA_HOURS} h après la demande.
            </p>
          )}

          <div className="mt-5 space-y-3">
            <div className="glass rounded-2xl px-4 py-3">
              <label className="text-xs text-muted-foreground" htmlFor="montant">
                Montant à retirer
              </label>
              <input
                id="montant"
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-lg font-bold outline-none"
              />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <label className="text-xs text-muted-foreground" htmlFor="wave">
                Numéro Wave
              </label>
              <input
                id="wave"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex : 0700000000"
                inputMode="tel"
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
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            Lancer le retrait
          </button>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="rise">
            <p className="mb-4 text-sm font-bold">Conditions de retrait</p>
            <Timeline steps={steps} />
          </GlassCard>

          <GlassCard className="rise flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-gold" />
            <p className="text-sm text-muted-foreground">
              Les retraits sont traités manuellement sous <strong>{WITHDRAW_ETA_HOURS} h</strong>{" "}
              maximum. Le solde est débité dès la demande, puis versé sur votre numéro Wave. Si
              votre filleul a été validé côté admin et que le retrait reste verrouillé, appuyez sur
              l'icône d'actualisation ci-contre.
            </p>
          </GlassCard>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Historique des retraits</h2>
      {(history ?? []).length === 0 ? (
        <GlassCard className="text-sm text-muted-foreground">
          Aucun retrait pour l'instant.
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {(history ?? []).map((w) => (
            <GlassCard key={w.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{fcfa(w.amount)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {w.wave_number} · {dt(w.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  w.status === "pending" ? "bg-gold/20 text-gold" : "bg-success/20 text-success"
                }`}
              >
                <Clock3 className="size-3" aria-hidden="true" />
                {w.status === "pending" ? `En cours · ≤ ${WITHDRAW_ETA_HOURS} h` : "Payé"}
              </span>
            </GlassCard>
          ))}
        </div>
      )}

      {gate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-xl"
        >
          <GiftRain count={26} />
          <div className="pop-3d glass-strong relative z-10 w-full max-w-md rounded-4xl p-6 text-center sm:p-8">
            <button
              onClick={() => setGate(false)}
              aria-label="Fermer"
              className="glass absolute top-3 right-3 rounded-full p-2"
            >
              <X className="size-4" />
            </button>
            <div className="tilt-3d mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-gold/40 to-primary/30 text-4xl">
              🎁
            </div>
            <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">Encore une étape !</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Avant de faire le retrait, vous devez{" "}
              <strong className="text-foreground">ajouter obligatoirement 1 personne</strong> avec
              votre code d'invitation. Cette personne doit ensuite{" "}
              <strong className="text-foreground">se recharger de 5 000 F</strong>. Vous recevrez
              alors votre retrait 🌊
            </p>
            <div className="glass mt-4 rounded-2xl px-4 py-3">
              <p className="text-xs text-muted-foreground">VOTRE CODE D'INVITATION</p>
              <p className="text-2xl font-extrabold tracking-[0.2em] text-gold">
                {profile?.invite_code}
              </p>
            </div>
            <Link
              to="/amis"
              onClick={() => setGate(false)}
              className="glow mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
            >
              <Share2 className="size-4" /> Inviter un ami maintenant
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
