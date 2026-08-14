import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Clock3, Copy, Loader2, TrendingUp, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Mon solde — Street Shore" },
      {
        name: "description",
        content: "Consultez votre solde Street Shore, vos dépôts Wave et vos bonus de parrainage.",
      },
      { property: "og:title", content: "Mon solde Street Shore" },
      { property: "og:description", content: "Solde, bonus et parrainage en temps réel." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session, loading } = useRequireAuth();
  const { data: profile, isLoading, refreshProfile } = useProfile(!!session);

  const { data: deposits } = useQuery({
    queryKey: ["deposits"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  useEffect(() => {
    const t = setInterval(refreshProfile, 60000);
    return () => clearInterval(t);
  }, [refreshProfile]);

  if (loading || isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const pending = (deposits ?? []).filter((d) => d.status === "pending");

  return (
    <AppShell>
      <GlassCard strong className="rise overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground">SOLDE DISPONIBLE</p>
        <p className="mt-1 text-5xl font-extrabold text-gradient">{fcfa(profile?.balance ?? 0)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Bonjour {profile?.full_name || "investisseur"} 👋
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            to="/depot"
            className="glow flex-1 rounded-full bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
          >
            Recharger
          </Link>
          <Link to="/retrait" className="glass flex-1 rounded-full py-3 text-center text-sm font-bold">
            Retirer
          </Link>
        </div>
      </GlassCard>

      {pending.length > 0 && (
        <GlassCard className="rise mt-4 border-gold/40">
          <div className="flex items-center gap-3">
            <Clock3 className="size-6 text-gold" />
            <div>
              <p className="font-bold">Dépôt en cours de validation</p>
              <p className="text-sm text-muted-foreground">
                Patientez 10 minutes pour recevoir votre bonus de{" "}
                {fcfa((pending[0]?.amount ?? 5000) * 3)}.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <p className="text-xs text-muted-foreground">MON CODE D'INVITATION</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-2xl font-extrabold tracking-[0.2em] text-gold">
              {profile?.invite_code}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/auth?ref=${profile?.invite_code}`,
                );
                toast.success("Lien d'invitation copié !");
              }}
              className="glass rounded-full p-2.5"
              aria-label="Copier le lien d'invitation"
            >
              <Copy className="size-4" />
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <TrendingUp className="mb-2 size-6 text-primary" />
          <p className="font-bold">Bonus actif</p>
          <p className="text-sm text-muted-foreground">
            Chaque recharge est multipliée par 3, + 5 000 F par ami actif.
          </p>
        </GlassCard>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link to="/depot" className="glass rounded-3xl p-4 text-center">
          <Wallet className="mx-auto mb-2 size-6 text-primary" />
          <p className="text-sm font-bold">Dépôt Wave</p>
        </Link>
        <Link to="/retrait" className="glass rounded-3xl p-4 text-center">
          <ArrowDownToLine className="mx-auto mb-2 size-6 text-aqua" />
          <p className="text-sm font-bold">Retrait</p>
        </Link>
        <Link to="/amis" className="glass rounded-3xl p-4 text-center">
          <Users className="mx-auto mb-2 size-6 text-gold" />
          <p className="text-sm font-bold">Mes amis</p>
        </Link>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Derniers dépôts</h2>
      {(deposits ?? []).length === 0 ? (
        <GlassCard className="text-sm text-muted-foreground">
          Aucun dépôt pour l'instant. Rechargez 5 000 F pour démarrer.
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {(deposits ?? []).map((d) => (
            <GlassCard key={d.id} className="flex items-center justify-between">
              <div>
                <p className="font-bold">{fcfa(d.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  d.status === "credited" ? "bg-success/20 text-success" : "bg-gold/20 text-gold"
                }`}
              >
                {d.status === "credited" ? "Crédité" : "En attente"}
              </span>
            </GlassCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
