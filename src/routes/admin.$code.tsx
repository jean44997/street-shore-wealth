import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Undo2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { downloadCsv, printPdf } from "@/lib/csv";
import { dt, fcfa } from "@/lib/format";

export const Route = createFileRoute("/admin/$code")({
  head: () => ({
    meta: [
      { title: "Console interne — Street Shore" },
      { name: "description", content: "Espace de vérification interne Street Shore." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Console interne" },
      { property: "og:description", content: "Accès restreint." },
    ],
  }),
  component: Admin,
});

type Stats = {
  members: number;
  deposits_pending: number;
  deposits_ok: number;
  total_deposited: number;
  total_credited: number;
  total_withdrawn: number;
  rechargers: number;
  blocked: number;
};
const ACTION_LABEL: Record<string, string> = {
  approve: "Dépôt accepté",
  reject: "Dépôt refusé",
  reclaim: "Fonds repris",
  block: "Compte bloqué",
  unblock: "Compte débloqué",
};


function Admin() {
  const { code } = Route.useParams();
  const [email, setEmail] = useState("");
  const [auth, setAuth] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<"depots" | "membres" | "audit">("depots");
  const [busy, setBusy] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);

  const args = { p_code: code, p_email: email.trim().toLowerCase() };

  const enter = async () => {
    setChecking(true);
    const { data, error } = await supabase.rpc("admin_gate", args);
    setChecking(false);
    if (error || !data) {
      toast.error("Accès refusé.");
      return;
    }
    setAuth(true);
  };

  const deposits = useQuery({
    queryKey: ["admin-deposits", email],
    enabled: auth,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_deposits", args);
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["admin-members", email],
    enabled: auth,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_members", args);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useQuery({
    queryKey: ["admin-stats", email],
    enabled: auth,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats", args);
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const audit = useQuery({
    queryKey: ["admin-audit", email],
    enabled: auth,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_audit_list", args);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refreshAll = () => {
    deposits.refetch();
    members.refetch();
    stats.refetch();
    audit.refetch();
  };

  const exportCurrent = (kind: "csv" | "pdf") => {
    const map: Record<typeof tab, { name: string; rows: Record<string, unknown>[] }> = {
      depots: {
        name: "street-shore-depots",
        rows: (deposits.data ?? []).map((d) => ({
          date: dt(d.created_at),
          membre: d.full_name,
          email: d.email,
          telephone: d.phone,
          wave: d.wave_phone,
          code: d.invite_code,
          parrain: d.sponsor_code ?? "",
          montant: d.amount,
          credite: d.status === "credited" ? d.amount * 4 : 0,
          statut: d.status,
          note: d.admin_note,
          solde: d.balance,
          bloque: d.blocked ? "oui" : "non",
        })),
      },
      membres: {
        name: "street-shore-membres",
        rows: (members.data ?? []).map((m) => ({
          inscrit: dt(m.created_at),
          membre: m.full_name,
          email: m.email,
          telephone: m.phone,
          code: m.invite_code,
          parrain: m.sponsor_code ?? "",
          solde: m.balance,
          recharge: m.has_deposited ? "oui" : "non",
          filleuls: m.referrals,
          filleuls_actifs: m.active_referrals,
          bloque: m.blocked ? "oui" : "non",
        })),
      },
      audit: {
        name: "street-shore-journal-admin",
        rows: (audit.data ?? []).map((a) => ({
          date: dt(a.created_at),
          admin: a.admin_email,
          action: ACTION_LABEL[a.action] ?? a.action,
          membre: a.target_name,
          email: a.target_email,
          montant: a.amount,
          note: a.note,
        })),
      },
    };
    const { name, rows } = map[tab];
    const ok = kind === "csv" ? downloadCsv(name, rows) : printPdf(name, rows);
    if (!ok) toast.error("Rien à exporter.");
  };


  const review = async (id: string, action: "approve" | "reject" | "reclaim") => {
    const note =
      action === "approve"
        ? null
        : window.prompt(
            action === "reject" ? "Motif du refus ?" : "Motif de la reprise des fonds ?",
            "",
          );
    if (action !== "approve" && note === null) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_review_deposit", {
      ...args,
      p_id: id,
      p_action: action,
      p_note: note ?? "",
    });
    setBusy(null);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(
      action === "approve"
        ? "Dépôt validé et bonus crédité."
        : action === "reject"
          ? "Dépôt refusé."
          : "Fonds repris.",
    );
    refreshAll();
  };

  const toggleBlock = async (profileId: string, blocked: boolean) => {
    setBusy(profileId);
    const { error } = await supabase.rpc("admin_set_blocked", {
      ...args,
      p_profile_id: profileId,
      p_blocked: blocked,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(blocked ? "Compte bloqué." : "Compte débloqué.");
    refreshAll();
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("preuves-depot")
      .createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Capture indisponible.");
      return;
    }
    setProof(data.signedUrl);
  };

  if (!auth) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <GlassCard strong className="pop-3d w-full max-w-sm text-center">
          <LockKeyhole className="mx-auto size-9 text-primary" />
          <h1 className="mt-3 text-xl font-extrabold">Console interne</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Accès réservé. Entrez votre e-mail administrateur.
          </p>
          <label htmlFor="admin-email" className="sr-only">
            E-mail administrateur
          </label>
          <input
            id="admin-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
            type="email"
            autoComplete="email"
            aria-label="E-mail administrateur"
            placeholder="email@exemple.com"
            className="glass mt-4 w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />

          <button
            onClick={enter}
            disabled={checking}
            className="glow mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {checking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Entrer
          </button>
        </GlassCard>
      </main>
    );
  }

  const s = stats.data;
  const cards = [
    { label: "MEMBRES", value: s?.members ?? 0, tint: "text-primary" },
    { label: "RECHARGÉS", value: s?.rechargers ?? 0, tint: "text-success" },
    { label: "EN ATTENTE", value: s?.deposits_pending ?? 0, tint: "text-gold" },
    { label: "BLOQUÉS", value: s?.blocked ?? 0, tint: "text-destructive" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Console Street Shore</h1>
          <p className="text-xs text-muted-foreground">Connecté : {email}</p>
        </div>
        <button onClick={refreshAll} className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold">
          <RefreshCw className="size-4" /> Actualiser
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="text-center">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${c.tint}`}>{c.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="text-[11px] text-muted-foreground">TOTAL DÉPOSÉ (VALIDÉ)</p>
          <p className="mt-1 text-xl font-extrabold">{fcfa(s?.total_deposited ?? 0)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[11px] text-muted-foreground">TOTAL CRÉDITÉ (BONUS)</p>
          <p className="mt-1 text-xl font-extrabold text-gold">{fcfa(s?.total_credited ?? 0)}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[11px] text-muted-foreground">TOTAL RETIRÉ</p>
          <p className="mt-1 text-xl font-extrabold text-aqua">{fcfa(s?.total_withdrawn ?? 0)}</p>
        </GlassCard>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="glass inline-flex rounded-full p-1" role="tablist" aria-label="Sections de la console">
          {(
            [
              ["depots", "Dépôts", Wallet],
              ["membres", "Membres", Users],
              ["audit", "Journal", ScrollText],
            ] as const
          ).map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportCurrent("csv")}
            className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
          >
            <Download className="size-4" aria-hidden="true" /> Export CSV
          </button>
          <button
            onClick={() => exportCurrent("pdf")}
            className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
          >
            <FileText className="size-4" aria-hidden="true" /> Export PDF
          </button>
        </div>
      </div>

      {tab === "audit" && (
        <div className="mt-4 space-y-2">
          {(audit.data ?? []).length === 0 && (
            <GlassCard className="text-sm text-muted-foreground">Aucune action enregistrée.</GlassCard>
          )}
          {(audit.data ?? []).map((a) => (
            <GlassCard key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {ACTION_LABEL[a.action] ?? a.action}
                  {a.amount ? ` · ${fcfa(a.amount)}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.target_name || "—"} · {a.target_email || "—"}
                </p>
                {a.note && <p className="text-xs text-muted-foreground">Note : {a.note}</p>}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{dt(a.created_at)}</p>
                <p>par {a.admin_email}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}


      {tab === "depots" && (
        <div className="mt-4 space-y-3">
          {(deposits.data ?? []).length === 0 && (
            <GlassCard className="text-sm text-muted-foreground">Aucun dépôt.</GlassCard>
          )}
          {(deposits.data ?? []).map((d) => (
            <GlassCard key={d.id} className="grid gap-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
              <button
                onClick={() => d.proof_url && openProof(d.proof_url)}
                className="glass flex h-28 items-center justify-center gap-2 rounded-2xl text-xs font-bold text-muted-foreground"
              >
                <Eye className="size-4" /> {d.proof_url ? "Voir la capture" : "Sans capture"}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-extrabold">{fcfa(d.amount)}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      d.status === "credited"
                        ? "bg-success/20 text-success"
                        : d.status === "pending"
                          ? "bg-gold/20 text-gold"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {d.status}
                  </span>
                  {d.blocked && (
                    <span className="rounded-full bg-destructive/20 px-2.5 py-0.5 text-[10px] font-bold text-destructive">
                      compte bloqué
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{d.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Wave : {d.wave_phone || "—"} · Profil : {d.phone || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.email} · code {d.invite_code}
                  {d.sponsor_code ? ` · parrain ${d.sponsor_code}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dt(d.created_at)} · solde {fcfa(d.balance)}
                </p>
                {d.admin_note && (
                  <p className="mt-1 text-xs text-muted-foreground">Note : {d.admin_note}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-col">
                <button
                  disabled={busy === d.id || d.status === "credited"}
                  onClick={() => review(d.id, "approve")}
                  className="flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Check className="size-3.5" /> Accepter
                </button>
                <button
                  disabled={busy === d.id || d.status !== "pending"}
                  onClick={() => review(d.id, "reject")}
                  className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-40"
                >
                  <X className="size-3.5" /> Refuser
                </button>
                <button
                  disabled={busy === d.id || d.status !== "credited"}
                  onClick={() => review(d.id, "reclaim")}
                  className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  <Undo2 className="size-3.5" /> Reprendre
                </button>
                <button
                  disabled={busy === d.profile_id}
                  onClick={() => toggleBlock(d.profile_id, !d.blocked)}
                  className="glass flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  <Ban className="size-3.5" /> {d.blocked ? "Débloquer" : "Bloquer"}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "membres" && (
        <div className="mt-4 space-y-3">
          {(members.data ?? []).map((m) => (
            <GlassCard key={m.profile_id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{m.full_name || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email} · {m.phone || "—"} · code {m.invite_code}
                  {m.sponsor_code ? ` · parrain ${m.sponsor_code}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inscrit {dt(m.created_at)} · {m.referrals} filleul(s), {m.active_referrals}{" "}
                  actif(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-extrabold text-gradient">{fcfa(m.balance)}</p>
                <button
                  disabled={busy === m.profile_id}
                  onClick={() => toggleBlock(m.profile_id, !m.blocked)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40 ${
                    m.blocked ? "bg-success text-primary-foreground" : "glass"
                  }`}
                >
                  <Ban className="size-3.5" /> {m.blocked ? "Débloquer" : "Bloquer"}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {proof && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setProof(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-xl"
        >
          <img
            src={proof}
            alt="Capture du paiement Wave envoyée par l'utilisateur"
            className="max-h-[85vh] w-auto max-w-full rounded-3xl"
          />
        </div>
      )}
    </main>
  );
}
