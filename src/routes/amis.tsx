import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/amis")({
  head: () => ({
    meta: [
      { title: "Mes amis & parrainage — Street Shore" },
      {
        name: "description",
        content:
          "Partagez votre code d'invitation Street Shore et suivez les amis inscrits avec votre code.",
      },
      { property: "og:title", content: "Parrainage Street Shore" },
      { property: "og:description", content: "5 000 F par ami qui recharge son compte." },
    ],
  }),
  component: Amis,
});

type Referral = { full_name: string; created_at: string; has_deposited: boolean };

function Amis() {
  const { session } = useRequireAuth();
  const { data: profile } = useProfile(!!session);

  const { data: referrals } = useQuery({
    queryKey: ["referrals"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase.rpc("my_referrals");
      return (data ?? []) as Referral[];
    },
  });

  const link =
    typeof window !== "undefined" && profile
      ? `${window.location.origin}/auth?ref=${profile.invite_code}`
      : "";

  const share = async () => {
    const text = `Rejoins-moi sur Street Shore ! Recharge 5 000 F et reçois 20 000 F. Mon code : ${profile?.invite_code} — ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Street Shore", text, url: link });
        return;
      } catch {
        /* annulé */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Invitation copiée !");
  };

  const active = (referrals ?? []).filter((r) => r.has_deposited).length;

  return (
    <AppShell>
      <h1 className="rise text-3xl font-extrabold">Mes amis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Chaque ami qui recharge 5 000 F vous rapporte {fcfa(5000)}.
      </p>

      <GlassCard strong className="rise mt-6 text-center">
        <p className="text-xs text-muted-foreground">MON CODE D'INVITATION UNIQUE</p>
        <p className="mt-2 text-4xl font-extrabold tracking-[0.25em] text-gold">
          {profile?.invite_code ?? "—"}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Lien copié !");
            }}
            className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
          >
            <Copy className="size-4" /> Copier
          </button>
          <button
            onClick={share}
            className="glow flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Share2 className="size-4" /> Partager
          </button>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <GlassCard className="text-center">
          <Users className="mx-auto mb-2 size-6 text-primary" />
          <p className="text-2xl font-extrabold">{referrals?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Filleuls inscrits</p>
        </GlassCard>
        <GlassCard className="text-center">
          <CheckCircle2 className="mx-auto mb-2 size-6 text-success" />
          <p className="text-2xl font-extrabold">{active}</p>
          <p className="text-xs text-muted-foreground">Amis rechargés</p>
        </GlassCard>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Inscrits avec mon code</h2>
      {(referrals ?? []).length === 0 ? (
        <GlassCard className="text-sm text-muted-foreground">
          Personne n'a encore utilisé votre code. Partagez-le pour débloquer vos {fcfa(20000)}.
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {(referrals ?? []).map((r, i) => (
            <GlassCard key={i} className="flex items-center justify-between">
              <div>
                <p className="font-bold">{r.full_name || "Nouveau membre"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              {r.has_deposited ? (
                <span className="flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
                  <CheckCircle2 className="size-3.5" /> +{fcfa(5000)}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">
                  <Clock3 className="size-3.5" /> En attente
                </span>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
