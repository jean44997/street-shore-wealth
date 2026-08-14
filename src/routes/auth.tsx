import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gift, Loader2, Lock, Mail, Phone, Ticket, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Logo } from "@/components/Logo";

type Search = { ref: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ref: typeof search["ref"] === "string" ? search["ref"].toUpperCase().slice(0, 12) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inscription & connexion — Street Shore" },
      {
        name: "description",
        content:
          "Créez votre compte Street Shore, ajoutez un code d'invitation et commencez à investir dès 5 000 F via Wave.",
      },
      { property: "og:title", content: "Rejoindre Street Shore" },
      {
        property: "og:description",
        content: "Inscription gratuite avec code d'invitation optionnel.",
      },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Entrez votre nom complet").max(80),
  phone: z.string().trim().min(8, "Numéro invalide").max(20),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(72),
  code: z.string().trim().max(12).optional(),
});

function AuthPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    code: ref ?? "",
  });
  const [sponsor, setSponsor] = useState<string | null>(null);

  useEffect(() => {
    const code = form.code.trim().toUpperCase();
    if (code.length < 4) {
      setSponsor(null);
      return;
    }
    let active = true;
    supabase.rpc("referrer_name", { p_code: code }).then(({ data }) => {
      if (active) setSponsor((data as string | null) ?? null);
    });
    return () => {
      active = false;
    };
  }, [form.code]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "code" ? e.target.value.toUpperCase() : e.target.value }));

  const handleSignup = async () => {
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire incomplet");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(
        error.message.includes("already registered")
          ? "Cet e-mail possède déjà un compte."
          : error.message,
      );
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoading(false);
      toast.success("Compte créé ! Confirmez votre e-mail puis connectez-vous.");
      setMode("login");
      return;
    }
    await supabase.rpc("ensure_profile", {
      p_name: parsed.data.full_name,
      p_phone: parsed.data.phone,
      p_ref_code: parsed.data.code ?? "",
    });
    setLoading(false);
    const code = (parsed.data.code ?? "").trim();
    if (code && sponsor) {
      navigate({ to: "/merci", search: { code, name: sponsor } });
    } else {
      navigate({ to: "/bienvenue" });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou mot de passe incorrect.");
      return;
    }
    toast.success("Bon retour sur Street Shore 🌊");
    navigate({ to: "/tableau-de-bord" });
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="glass rounded-full p-2.5">
          <ArrowLeft className="size-4" />
        </Link>
        <Logo size={34} />
      </div>

      <GlassCard strong className="rise">
        <div className="glass mb-6 flex rounded-full p-1">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all duration-300 ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signup" ? "Inscription" : "Connexion"}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-extrabold">
          {mode === "signup" ? "Créer mon compte" : "Se connecter"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Rechargez 5 000 F et recevez 20 000 F en invitant 1 ami."
            : "Retrouvez votre solde et vos filleuls."}
        </p>

        <div className="mt-6 space-y-3">
          {mode === "signup" && (
            <>
              <Field icon={User} placeholder="Nom complet" value={form.full_name} onChange={set("full_name")} />
              <Field icon={Phone} placeholder="Numéro Wave" value={form.phone} onChange={set("phone")} />
            </>
          )}
          <Field icon={Mail} type="email" placeholder="Adresse e-mail" value={form.email} onChange={set("email")} />
          <Field icon={Lock} type="password" placeholder="Mot de passe" value={form.password} onChange={set("password")} />

          {mode === "signup" && (
            <div className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gold">
                <Ticket className="size-4" /> CODE D'INVITATION (optionnel)
              </div>
              <Field
                icon={Gift}
                placeholder="Ex : SS4F2A9C"
                value={form.code}
                onChange={set("code")}
              />
              {sponsor && (
                <p className="rise mt-2 text-xs font-semibold text-success">
                  ✅ Code valide — parrainé par {sponsor}
                </p>
              )}
              {!sponsor && form.code.trim().length >= 4 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ce code n'existe pas encore. Vous pouvez continuer sans code.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          disabled={loading}
          onClick={mode === "signup" ? handleSignup : handleLogin}
          className="glow mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:scale-[1.02] disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "signup" ? "Je m'inscris" : "Je me connecte"}
        </button>
      </GlassCard>
    </div>
  );
}

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType }) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-ring">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <input
        {...props}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
