import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Ban,
  CheckCircle2,
  Clock3,
  Gift,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";
import { dt, fcfa } from "@/lib/format";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique détaillé — Street Shore" },
      {
        name: "description",
        content:
          "Retrouvez l'historique complet de vos dépôts Wave, bonus crédités, retraits et validations de parrainage Street Shore.",
      },
      { property: "og:title", content: "Historique Street Shore" },
      {
        property: "og:description",
        content: "Dépôts, bonus, retraits et parrainages, tout au même endroit.",
      },
    ],
  }),
  component: Historique,
});

type Row = {
  key: string;
  date: string;
  kind: "depot" | "bonus" | "retrait" | "parrain";
  label: string;
  sub: string;
  amount: number;
  sign: "+" | "-" | "";
  status: "ok" | "wait" | "ko";
};

const meta = {
  depot: { icon: Wallet, tint: "text-primary" },
  bonus: { icon: Gift, tint: "text-gold" },
  retrait: { icon: ArrowDownToLine, tint: "text-aqua" },
  parrain: { icon: Users, tint: "text-success" },
} as const;

const badge = {
  ok: { label: "Validé", cls: "bg-success/20 text-success", Icon: CheckCircle2 },
  wait: { label: "En attente", cls: "bg-gold/20 text-gold", Icon: Clock3 },
  ko: { label: "Refusé", cls: "bg-destructive/20 text-destructive", Icon: Ban },
} as const;

function Historique() {
  const { session } = useRequireAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["historique"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const [dep, wit, refs] = await Promise.all([
        supabase.from("deposits").select("*").order("created_at", { ascending: false }),
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
        supabase.rpc("my_referrals"),
      ]);

      const rows: Row[] = [];

      for (const d of dep.data ?? []) {
        rows.push({
          key: `d-${d.id}`,
          date: d.created_at,
          kind: "depot",
          label: `Dépôt Wave ${fcfa(d.amount)}`,
          sub:
            d.status === "credited"
              ? "Vérifié par l'équipe"
              : d.status === "rejected"
                ? d.admin_note || "Paiement introuvable"
                : d.status === "reclaimed"
                  ? "Bonus repris après vérification"
                  : "Vérification en cours (≈ 10 min)",
          amount: d.amount,
          sign: "",
          status: d.status === "credited" ? "ok" : d.status === "pending" ? "wait" : "ko",
        });

        if (d.status === "credited") {
          rows.push({
            key: `b-${d.id}`,
            date: d.credited_at ?? d.created_at,
            kind: "bonus",
            label: "Bonus x3 crédité",
            sub: "Ajouté à votre solde",
            amount: d.amount * 3,
            sign: "+",
            status: "ok",
          });
        }
        if (d.status === "reclaimed") {
          rows.push({
            key: `r-${d.id}`,
            date: d.reviewed_at ?? d.created_at,
            kind: "bonus",
            label: "Bonus repris",
            sub: d.admin_note || "Vérification anti-fraude",
            amount: d.amount * 3,
            sign: "-",
            status: "ko",
          });
        }
      }

      for (const w of wit.data ?? []) {
        rows.push({
          key: `w-${w.id}`,
          date: w.created_at,
          kind: "retrait",
          label: `Retrait vers ${w.wave_number}`,
          sub: w.status === "pending" ? "Traitement en cours" : "Payé",
          amount: w.amount,
          sign: "-",
          status: w.status === "pending" ? "wait" : "ok",
        });
      }

      for (const r of (refs.data ?? []) as {
        full_name: string;
        created_at: string;
        has_deposited: boolean;
      }[]) {
        rows.push({
          key: `p-${r.created_at}-${r.full_name}`,
          date: r.created_at,
          kind: "parrain",
          label: r.full_name || "Nouveau filleul",
          sub: r.has_deposited
            ? "Parrainage validé — bonus reçu"
            : "Inscrit, en attente de sa recharge",
          amount: 5000,
          sign: r.has_deposited ? "+" : "",
          status: r.has_deposited ? "ok" : "wait",
        });
      }

      return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    },
  });

  const rows = data ?? [];
  const totals = {
    in: rows.filter((r) => r.sign === "+").reduce((s, r) => s + r.amount, 0),
    out: rows.filter((r) => r.sign === "-").reduce((s, r) => s + r.amount, 0),
  };

  return (
    <AppShell>
      <h1 className="rise text-2xl font-extrabold sm:text-3xl">Historique détaillé</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dépôts, bonus, retraits et validations de parrainage.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
        <GlassCard className="text-center">
          <p className="text-[11px] text-muted-foreground">TOTAL CRÉDITÉ</p>
          <p className="mt-1 text-xl font-extrabold text-success sm:text-2xl">{fcfa(totals.in)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-[11px] text-muted-foreground">TOTAL SORTI</p>
          <p className="mt-1 text-xl font-extrabold text-gold sm:text-2xl">{fcfa(totals.out)}</p>
        </GlassCard>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && (
          <GlassCard className="text-sm text-muted-foreground">Chargement…</GlassCard>
        )}
        {!isLoading && rows.length === 0 && (
          <GlassCard className="text-sm text-muted-foreground">
            Aucune opération pour l'instant. Rechargez 5 000 F pour démarrer.
          </GlassCard>
        )}
        {rows.map((r) => {
          const M = meta[r.kind];
          const B = badge[r.status];
          return (
            <GlassCard key={r.key} className="flex items-start gap-3">
              <div className="glass shrink-0 rounded-2xl p-2.5">
                <M.icon className={`size-5 ${M.tint}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm font-bold sm:text-base">{r.label}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${B.cls}`}
                  >
                    <B.Icon className="size-3" />
                    {B.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.sub}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{dt(r.date)}</p>
              </div>
              <p
                className={`shrink-0 text-sm font-extrabold sm:text-base ${
                  r.sign === "+" ? "text-success" : r.sign === "-" ? "text-gold" : "text-foreground"
                }`}
              >
                {r.sign}
                {fcfa(r.amount)}
              </p>
            </GlassCard>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Undo2 className="size-3.5" /> Les montants repris apparaissent en cas de vérification
        anti-fraude.
      </p>
    </AppShell>
  );
}
