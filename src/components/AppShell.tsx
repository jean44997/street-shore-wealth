import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDownToLine, Bell, Home, LogOut, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

const nav = [
  { to: "/tableau-de-bord", label: "Solde", icon: Home },
  { to: "/depot", label: "Dépôt", icon: Wallet },
  { to: "/retrait", label: "Retrait", icon: ArrowDownToLine },
  { to: "/amis", label: "Amis", icon: Users },
  { to: "/notifications", label: "Alertes", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/">
            <Logo size={34} />
          </Link>
          <button
            onClick={signOut}
            aria-label="Se déconnecter"
            className="glass rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
        <div className="glass-strong mx-auto flex max-w-3xl items-center justify-between rounded-3xl px-2 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary bg-primary/10" }}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-muted-foreground transition-all duration-300"
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
