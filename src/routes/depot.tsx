import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  ImageUp,
  Loader2,
  Phone,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { Timeline, type Step } from "@/components/Timeline";
import { useRequireAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { DEPOSIT_MIN, dt, fcfa, WAVE_LINK } from "@/lib/format";

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Dépôt Wave — Street Shore" },
      {
        name: "description",
        content:
          "Rechargez votre compte Street Shore via Wave dès 5 000 F, envoyez votre capture de paiement et recevez votre bonus après vérification.",
      },
      { property: "og:title", content: "Dépôt Wave Street Shore" },
      { property: "og:description", content: "Recharge Wave dès 5 000 F, bonus x3 vérifié." },
    ],
  }),
  component: Depot,
});

const amounts = [5000, 10000, 20000, 50000];

function Depot() {
  const { session } = useRequireAuth();
  const { data: profile, refreshProfile } = useProfile(!!session);
  const [amount, setAmount] = useState(DEPOSIT_MIN);
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: last, refetch } = useQuery({
    queryKey: ["last-deposit"],
    enabled: !!session,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const pick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Choisissez une image (capture d'écran).");
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      toast.error("Image trop lourde (6 Mo maximum).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirm = async () => {
    const uid = session?.user.id;
    if (!uid) return;
    if (phone.trim().length < 8) {
      toast.error("Entrez le numéro Wave utilisé pour le paiement.");
      return;
    }
    if (!file) {
      toast.error("Ajoutez la capture d'écran du paiement Wave.");
      return;
    }
    setLoading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    const path = `${uid}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("preuves-depot").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (up.error) {
      setLoading(false);
      toast.error("Échec de l'envoi de la capture. Réessayez.");
      return;
    }
    const { error } = await supabase.rpc("submit_deposit_proof", {
      p_amount: amount,
      p_proof_url: path,
      p_phone: phone.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success("Preuve envoyée ! Vérification sous 10 minutes ⏳");
    clear();
    refreshProfile();
    refetch();
  };

  const status = last?.status ?? null;
  const pending = status === "pending";

  const steps: Step[] = [
    {
      title: "1. Paiement Wave",
      text: `Envoyez ${fcfa(amount)} via le lien officiel Wave.`,
      state: last ? "done" : "current",
    },
    {
      title: "2. Capture envoyée",
      text: "Votre preuve part chez l'équipe de vérification.",
      state: last ? "done" : "todo",
    },
    {
      title: "3. Vérification (≈ 10 min)",
      text: "Un administrateur contrôle votre paiement.",
      state: pending ? "current" : status === "credited" ? "done" : last ? "done" : "todo",
    },
    {
      title: "4. Bonus crédité",
      text: `${fcfa(amount * 3)} ajoutés à votre solde.`,
      state: status === "credited" ? "done" : "todo",
    },
    {
      title: "5. Retrait possible",
      text: "Invitez 1 ami qui recharge 5 000 F pour débloquer.",
      state: "todo",
    },
  ];

  return (
    <AppShell>
      <h1 className="rise text-2xl font-extrabold sm:text-3xl">Dépôt Wave</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paiement uniquement via Wave. Votre bonus vaut 3x le montant déposé, après vérification de
        votre capture.
      </p>

      {profile?.blocked && (
        <GlassCard className="rise mt-5 border-destructive/50 text-sm text-destructive">
          Votre compte est bloqué. Contactez le service client.
        </GlassCard>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-4">
          <GlassCard strong className="rise">
            <p className="text-xs font-semibold text-muted-foreground">MONTANT DU DÉPÔT</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
              <p className="text-3xl font-extrabold text-gradient sm:text-4xl">
                {fcfa(amount * 3)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">+ 5 000 F par ami qui recharge</p>
            </div>
          </GlassCard>

          <GlassCard className="rise">
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 size-6 shrink-0 text-primary" />
              <div className="min-w-0">
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

          <GlassCard className="rise">
            <div className="flex items-start gap-3">
              <ImageUp className="mt-0.5 size-6 shrink-0 text-gold" />
              <div className="w-full min-w-0">
                <p className="font-bold">Étape 2 — Envoyez la preuve</p>
                <p className="text-sm text-muted-foreground">
                  Capture d'écran du paiement + numéro Wave utilisé. Un administrateur vérifie
                  avant de créditer.
                </p>

                <div className="glass mt-3 flex items-center gap-3 rounded-2xl px-4 py-3">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    maxLength={20}
                    placeholder="Numéro Wave (ex : 0700000000)"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                />

                {!preview ? (
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="glass mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-6 text-sm font-semibold text-muted-foreground"
                  >
                    <ImageUp className="size-6 text-primary" />
                    Ajouter la capture du paiement
                  </button>
                ) : (
                  <div className="glass relative mt-3 overflow-hidden rounded-2xl">
                    <img
                      src={preview}
                      alt="Aperçu de la capture de paiement Wave"
                      className="max-h-64 w-full object-contain"
                    />
                    <button
                      onClick={clear}
                      aria-label="Retirer la capture"
                      className="absolute top-2 right-2 rounded-full bg-background/80 p-2"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}

                <button
                  disabled={loading || pending || profile?.blocked}
                  onClick={confirm}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-success py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {pending ? "Vérification en cours…" : "J'ai payé — envoyer ma preuve"}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard strong className="rise">
            <p className="mb-4 text-sm font-bold">Suivi de votre dépôt</p>
            <Timeline steps={steps} />
          </GlassCard>

          {last && (
            <GlassCard className="rise">
              <p className="text-xs text-muted-foreground">DERNIER DÉPÔT</p>
              <p className="mt-1 text-xl font-extrabold">{fcfa(last.amount)}</p>
              <p className="text-xs text-muted-foreground">{dt(last.created_at)}</p>
              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  last.status === "credited"
                    ? "bg-success/20 text-success"
                    : last.status === "pending"
                      ? "bg-gold/20 text-gold"
                      : "bg-destructive/20 text-destructive"
                }`}
              >
                {last.status === "credited" ? (
                  <CheckCircle2 className="size-3.5" />
                ) : last.status === "pending" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
                {last.status === "credited"
                  ? "Validé et crédité"
                  : last.status === "pending"
                    ? "En vérification"
                    : last.status === "reclaimed"
                      ? "Bonus repris"
                      : "Refusé"}
              </span>
              {last.admin_note && (
                <p className="mt-2 text-xs text-muted-foreground">Note : {last.admin_note}</p>
              )}
            </GlassCard>
          )}

          <GlassCard className="rise flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            Toute fausse capture entraîne le blocage définitif du compte et la reprise des bonus.
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
