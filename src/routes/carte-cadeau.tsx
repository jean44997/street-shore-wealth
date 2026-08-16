import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Gift, Loader2, PartyPopper, Sparkles, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { GiftRain } from "@/components/GiftRain";
import { ScratchCard } from "@/components/ScratchCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { fcfa, SCRATCH_INTERVAL_DAYS } from "@/lib/format";

export const Route = createFileRoute("/carte-cadeau")({
  head: () => ({
    meta: [
      { title: "Carte cadeau à gratter — Street Shore" },
      {
        name: "description",
        content:
          "Grattez votre carte cadeau Street Shore tous les 2 jours : 20 % de chances de gagner 20 000 F retirables immédiatement, sans dépôt ni parrainage.",
      },
      { property: "og:title", content: "Carte cadeau Street Shore" },
      { property: "og:description", content: "Une carte à gratter offerte tous les 2 jours." },
    ],
  }),
  component: CarteCadeau;
});

type Card = {
  id: string;
  prize: string | null;
  amount: number;
  scratched_at: string | null;
  created_at: string;
};

const PRIZES: Record<string, { title: string; text: string; emoji: string; win: boolean }> = {
  jackpot_libre: {
    title: "JACKPOT 20 000 F",
    text: "Crédités immédiatement et retirables sans dépôt ni ami à ajouter.",
    emoji: "🏆",
    win: true,
  },
  retrait_sans_ami: {
    title: "Retrait libéré",
    text: "Dès votre recharge, retirez vos 20 000 F sans ajouter d'ami.",
    emoji: "🔓",
    win: true,
  },
  bonus: { title: "Bonus solde", text: "Ajouté à votre solde tout de suite.", emoji: "🪙", win: true },
  rien: { title: "Pas cette fois", text: "Une nouvelle carte arrive dans 2 jours.", emoji: "🍀", win: false },
};

function nextCardAt(created: string) {
  return new Date(new Date(created).getTime() + SCRATCH_INTERVAL_DAYS * 86400000);
}

function CarteCadeau() {
  const { session } = useRequireAuth();
  const { refreshProfile } = useProfile(!!session);
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: card, refetch } = useQuery({
    queryKey: ["scratch-card"],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_scratch_card");
      if (error) throw error;
      return data as unknown as Card;
    },
  });

  const { data: past } = useQuery({
    queryKey: ["scratch-history"],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("scratch_cards")
        .select("*")
        .not("scratched_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Card[];
    },
  });

  const reveal = async () => {
    if (!card || card.scratched_at || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("scratch_card", { p_id: card.id });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    const res = data as unknown as Card;
    const info = PRIZES[res.prize ?? "rien"];
    if (info?.win) {
      setParty(true);
      toast.success(`Félicitations ! ${info.title}`);
      setTimeout(() => setParty(false), 9000);
    } else {
      toast("Pas de chance cette fois 🍀");
    }
    refreshProfile();
    refetch();
  };

  const prize = card?.scratched_at ? PRIZES[card.prize ?? "rien"] : null;
  const next = card ? nextCardAt(card.created_at).getTime() : 0;
  const waiting = !!card?.scratched_at && next > now;
  const left = Math.max(0, next - now);
  const hh = Math.floor(left / 3600000);
  const mm = Math.floor((left % 3600000) / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <AppShell>
      {party && <GiftRain count={34} />}

      <div className="relative z-10">
        <span className="glass rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-gold">
          <Sparkles className="size-3.5" /> 1 carte offerte tous les 2 jours
        </span>
        <h1 className="rise mt-3 text-2xl font-extrabold sm:text-3xl">Carte cadeau à gratter</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Grattez avec le doigt : 20 % de chances de remporter {fcfa(20000)} retirables sans dépôt,
          30 % de libérer votre retrait sans ajouter d'ami, et des bonus de {fcfa(1000)} ou{" "}
          {fcfa(2000)}.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <GlassCard strong className="rise">
            {!card ? (
              <div className="grid h-48 place-items-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <ScratchCard
                  revealed={!!card.scratched_at}
                  disabled={busy || waiting}
                  onRevealed={reveal}
                >
                  {card.scratched_at ? (
                    <div className="pop-3d">
                      <div className="text-5xl sm:text-6xl">{prize?.emoji}</div>
                      <p className="mt-2 text-xl font-extrabold text-gradient sm:text-2xl">
                        {prize?.title}
                      </p>
                      {card.amount > 0 && (
                        <p className="text-lg font-extrabold text-gold">+ {fcfa(card.amount)}</p>
                      )}
                      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                        {prize?.text}
                      </p>
                    </div>
                  ) : (
                    <div className="text-4xl">🎁</div>
                  )}
                </ScratchCard>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {waiting ? (
                    <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-gold">
                      <Clock3 className="size-4" aria-hidden="true" /> Prochaine carte dans {hh}h{" "}
                      {String(mm).padStart(2, "0")}m {String(ss).padStart(2, "0")}s
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-xs font-bold text-success">
                      <Gift className="size-4" aria-hidden="true" /> Carte disponible — grattez !
                    </span>
                  )}
                  {busy && <Loader2 className="size-4 animate-spin text-primary" />}
                </div>
              </>
            )}
          </GlassCard>

          <div className="space-y-4">
            <GlassCard className="rise">
              <p className="mb-3 text-sm font-bold">Vos chances</p>
              <ul className="space-y-2 text-sm">
                {[
                  ["20 %", `Jackpot ${fcfa(20000)} retirables sans rien investir`],
                  ["30 %", "Retrait sans ajouter d'ami après recharge"],
                  ["12,5 %", `Bonus ${fcfa(2000)}`],
                  ["12,5 %", `Bonus ${fcfa(1000)}`],
                  ["25 %", "Aucun lot — réessayez dans 2 jours"],
                ].map(([p, t]) => (
                  <li key={p} className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-extrabold text-primary">
                      {p}
                    </span>
                    <span className="min-w-0 text-muted-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="rise flex items-start gap-3">
              <Unlock className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Les lots sont tirés côté serveur : impossible de tricher, et vos gains apparaissent
                instantanément dans{" "}
                <Link to="/tableau-de-bord" className="text-primary">
                  votre solde
                </Link>
                .
              </p>
            </GlassCard>
          </div>
        </div>

        {(past ?? []).length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-lg font-bold">Vos dernières cartes</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(past ?? []).map((c) => {
                const p = PRIZES[c.prize ?? "rien"];
                return (
                  <GlassCard key={c.id} className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {p?.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{p?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.amount > 0 ? `+ ${fcfa(c.amount)}` : "—"}
                      </p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </>
        )}

        {party && (
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
            <div className="pop-3d glass-strong flex items-center gap-3 rounded-full px-5 py-3">
              <PartyPopper className="size-5 text-gold" aria-hidden="true" />
              <span className="text-sm font-extrabold">Félicitations, lot débloqué !</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
