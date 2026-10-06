import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Street Shore" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte Street Shore." },
      { property: "og:title", content: "Réinitialiser le mot de passe — Street Shore" },
      { property: "og:description", content: "Définissez un nouveau mot de passe et reconnectez-vous." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pwd.length < 6) {
      toast.error("6 caractères minimum.");
      return;
    }
    if (pwd !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour ! Bienvenue 🌊");
    navigate({ to: "/tableau-de-bord" });
  };

  const input = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground";

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/auth" search={{ ref: undefined }} className="glass rounded-full p-2.5">
          <ArrowLeft className="size-4" />
        </Link>
        <Logo size={34} />
      </div>
      <GlassCard strong className="rise">
        <KeyRound className="mb-3 size-8 text-gold" />
        <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Vérification du lien… Si rien ne se passe, redemandez un e-mail depuis « Mot de passe oublié ».
          </p>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {[
                [pwd, setPwd, "Nouveau mot de passe"],
                [confirm, setConfirm, "Confirmer le mot de passe"],
              ].map(([v, s, p]) => (
                <div key={p as string} className="glass flex items-center gap-3 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder={p as string}
                    value={v as string}
                    onChange={(e) => (s as (x: string) => void)(e.target.value)}
                    className={input}
                  />
                </div>
              ))}
            </div>
            <button
              disabled={loading}
              onClick={submit}
              className="glow mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Enregistrer et me connecter
            </button>
          </>
        )}
      </GlassCard>
    </div>
  );
}
