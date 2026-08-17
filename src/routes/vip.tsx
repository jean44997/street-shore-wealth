import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2, Rocket, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { GiftRain } from "@/components/GiftRain";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "Plans VIP — Revenus quotidiens Street Shore" },
      {
        name: "description",
        content:
          "Activez un plan VIP Street Shore dès 3 000 F et encaissez un revenu quotidien pendant 150 jours, retirable à tout moment sans parrainage.",
      },
      { property: "og:title", content: "Plans VIP Street Shore" },
      {
        property: "og:description",
        content: "8 paliers d'investissement avec revenu quotidien pendant 150 jours.",
      },
    ],
  }),
  component: Vip,
});

type Plan = {
  id: number;
  name: string;
  tier: string;
  price: number;
  daily_income: number;
  days: number;
};

type Investment = {
  id: string;
  plan_id: number;
  price: number;
  daily_income: number;
  days: number;
  days_claimed: number;
  active: boolean;
  created_at: string;
};

function Vip() {
  const { session } = useRequireAuth();
  const { data: profile, refreshProfile } = useProfile(!!session);
  const [busy, setBusy] = useState<number | null>(null);
  const [party, setParty] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["vip-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const { data: mine, refetch } = useQuery({
    queryKey: ["investments"],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("investments")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Investment[];
    },
  });

  const buy = async (plan: Plan) => {
    if (busy !== null) return;
    setBusy(plan.id);
    const { error } = await supabase.rpc("buy_vip", { p_plan_id: plan.id });
    setBusy(null);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    setParty(true);
    setTimeout(() => setParty(false), 8000);
    toast.success(`${plan.name} activé 🚀`);
    refreshProfile();
    refetch();
  };

  const claim = async () => {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_vip_income");
    setClaiming(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    const total = Number(data ?? 0);
    if (total > 0) {
      setParty(true);
      setTimeout(() => setParty(false), 6000);
      toast.success(`${fcfa(total)} encaissés 💰`);
    } else {
      toast("Aucun revenu à encaisser pour le moment.");
    }
    refreshProfile();
    refetch();
  };

  const active = (mine ?? []).filter((i) => i.active);

  return (
    <AppShell>
      {party && <GiftRain count={30} />}

      <div className="relative z-10">
        <span className="glass rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-gold">
          <Sparkles className="size-3.5" aria-hidden="true" /> Revenu quotidien pendant 150 jours
        </span>
        <h1 className="rise mt-3 text-2xl font-extrabold sm:text-3xl">Plans VIP Street Shore</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Activez un plan avec votre solde : votre revenu tombe chaque jour et reste retirable sans
          ajouter d'ami. Solde actuel :{" "}
          <span className="font-bold text-gradient">{fcfa(profile?.balance ?? 0)}</span>.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={claim}
            disabled={claiming || active.length === 0}
            className="glow inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            {claiming ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Wallet className="size-4" aria-hidden="true" />
            )}
            Encaisser mes revenus
          </button>
          <Link
            to="/depot"
            className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
          >
            <Rocket className="size-4" aria-hidden="true" /> Recharger mon solde
          </Link>
        </div>

        {active.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-lg font-bold">Vos plans actifs</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((i) => (
                <GlassCard key={i.id} className="rise">
                  <div className="flex items-center gap-2">
                    <Crown className="size-5 text-gold" aria-hidden="true" />
                    <p className="text-sm font-bold">
                      {plans?.find((p) => p.id === i.plan_id)?.name ?? `Plan ${i.plan_id}`}
                    </p>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-gradient">
                    {fcfa(i.daily_income)}
                    <span className="text-xs font-semibold text-muted-foreground"> / jour</span>
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (i.days_claimed / i.days) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {i.days_claimed} / {i.days} jours encaissés
                  </p>
                </GlassCard>
              ))}
            </div>
          </>
        )}

        <h2 className="mt-8 mb-3 text-lg font-bold">Choisissez votre palier</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans ?? []).map((p) => {
            const total = p.daily_income * p.days;
            const affordable = (profile?.balance ?? 0) >= p.price;
            return (
              <GlassCard key={p.id} strong className="tilt-3d rise flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-extrabold text-primary">
                    {p.tier}
                  </span>
                  <TrendingUp className="size-4 text-gold" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-base font-bold">{p.name}</h3>
                <p className="mt-1 text-2xl font-extrabold text-gradient">{fcfa(p.price)}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li>
                    Revenu quotidien :{" "}
                    <span className="font-bold text-foreground">{fcfa(p.daily_income)}</span>
                  </li>
                  <li>Durée : {p.days} jours</li>
                  <li>
                    Total : <span className="font-bold text-gold">{fcfa(total)}</span>
                  </li>
                </ul>
                <button
                  onClick={() => buy(p)}
                  disabled={busy !== null}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
                >
                  {busy === p.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Crown className="size-4" aria-hidden="true" />
                  )}
                  {affordable ? "Activer ce plan" : "Solde insuffisant"}
                </button>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
