import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Street Shore" },
      {
        name: "description",
        content:
          "Suivez vos alertes Street Shore : bonus crédités, nouveaux filleuls et retraits en cours.",
      },
      { property: "og:title", content: "Notifications Street Shore" },
      { property: "og:description", content: "Bonus, filleuls et retraits en temps réel." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { session } = useRequireAuth();

  const { data: items, refetch } = useQuery({
    queryKey: ["notifications"],
    enabled: !!session,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, refetch]);

  useEffect(() => {
    if (items?.some((n) => !n.read)) {
      supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false)
        .then(() => undefined);
    }
  }, [items]);

  return (
    <AppShell>
      <h1 className="rise text-3xl font-extrabold">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bonus crédités, nouveaux filleuls et retraits.
      </p>

      <div className="mt-6 space-y-3">
        {(items ?? []).length === 0 && (
          <GlassCard className="text-sm text-muted-foreground">
            Aucune notification pour l'instant.
          </GlassCard>
        )}
        {(items ?? []).map((n) => (
          <GlassCard key={n.id} className="rise flex items-start gap-3">
            <div className="glass rounded-2xl p-2.5">
              <BellRing className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-bold">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString("fr-FR")}
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
