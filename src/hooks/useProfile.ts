import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  balance: number;
  invite_code: string;
  referred_by: string | null;
  has_deposited: boolean;
  blocked: boolean;
  created_at: string;
};

export function useProfile(enabled = true) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["profile"],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => {
      await supabase.rpc("process_my_deposits");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  return { ...query, refreshProfile: () => qc.invalidateQueries({ queryKey: ["profile"] }) };
}
