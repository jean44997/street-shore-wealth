import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  Bell,
  History,
  Home,
  LifeBuoy,
  LogOut,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

const nav = [
  { to: "/tableau-de-bord", label: "Solde", icon: Home },
  { to: "/depot", label: "Dépôt", icon: Wallet },
  { to: "/retrait", label: "Retrait", icon: ArrowDownToLine },
  { to: "/amis", label: "Amis", icon: Users },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/notifications", label: "Alertes", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col pb-[5.5rem] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-3 sm:px-5">
          <Link to="/" className="shrink-0">
            <Logo size={32} withText={false} />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "text-primary bg-primary/12" }}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-all duration-300 hover:bg-white/5 hover:text-foreground lg:px-4 lg:text-sm"
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link
              to="/support"
              aria-label="Service client"
              className="glass rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LifeBuoy className="size-4" />
            </Link>
            <button
              onClick={signOut}
              aria-label="Se déconnecter"
              className="glass rounded-full p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-5 sm:py-7 lg:py-9">
        {children}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-2 md:hidden">
        <div className="glass-strong mx-auto flex w-full max-w-lg items-stretch justify-between gap-0.5 rounded-3xl px-1.5 py-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary bg-primary/12" }}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-2 text-[9.5px] leading-none font-semibold text-muted-foreground transition-all duration-300 xs:text-[10.5px]"
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
