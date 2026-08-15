-- 1. Schema additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS wave_phone text NOT NULL DEFAULT '';
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '';
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2. Admin allowlist + secret settings
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_emails (email) VALUES ('nonouibet@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('admin_code', 'MARASSE1@@@') ON CONFLICT (key) DO UPDATE SET value = excluded.value;

-- 3. Admin helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_emails a ON lower(a.email) = lower(u.email)
    WHERE u.id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_gate(p_code text, p_email text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ok boolean; v_code text; v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT value INTO v_code FROM public.app_settings WHERE key = 'admin_code';
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  v_ok := public.is_admin()
      AND v_code = p_code
      AND v_email = lower(trim(coalesce(p_email, '')));
  RETURN coalesce(v_ok, false);
END; $$;

-- 4. Deposits: manual review only
CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount bigint)
RETURNS deposits LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dep public.deposits; v_me public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  IF p_amount < 5000 THEN RAISE EXCEPTION 'Le dépôt minimum est de 5 000 F'; END IF;
  INSERT INTO public.deposits (user_id, amount) VALUES (auth.uid(), p_amount) RETURNING * INTO v_dep;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Dépôt en attente de vérification', 'Votre dépôt de ' || p_amount || ' F est enregistré. Ajoutez votre capture Wave, la vérification prend environ 10 minutes.');
  RETURN v_dep;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_deposit_proof(p_amount bigint, p_proof_url text, p_phone text)
RETURNS deposits LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dep public.deposits; v_me public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  IF p_amount < 5000 THEN RAISE EXCEPTION 'Le dépôt minimum est de 5 000 F'; END IF;
  IF coalesce(trim(p_proof_url), '') = '' THEN RAISE EXCEPTION 'Ajoutez la capture de votre paiement Wave'; END IF;
  IF length(trim(coalesce(p_phone, ''))) < 8 THEN RAISE EXCEPTION 'Numéro Wave invalide'; END IF;
  IF EXISTS (SELECT 1 FROM public.deposits WHERE user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'Un dépôt est déjà en cours de vérification';
  END IF;

  INSERT INTO public.deposits (user_id, amount, proof_url, wave_phone)
  VALUES (auth.uid(), p_amount, trim(p_proof_url), trim(p_phone))
  RETURNING * INTO v_dep;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Preuve reçue ✅', 'Votre dépôt de ' || p_amount || ' F est en cours de vérification. Réponse sous 10 minutes.');
  RETURN v_dep;
END; $$;

-- deposits are now credited by an admin only
CREATE OR REPLACE FUNCTION public.process_my_deposits()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT NULL::void; $$;

-- 5. Withdrawal rules
CREATE OR REPLACE FUNCTION public.can_withdraw()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles r
    JOIN public.profiles me ON me.id = r.referred_by
    WHERE me.user_id = auth.uid() AND r.has_deposited
  );
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount bigint, p_number text)
RETURNS withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me public.profiles; v_w public.withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  IF NOT v_me.has_deposited THEN RAISE EXCEPTION 'Rechargez votre compte avant de retirer'; END IF;
  IF NOT public.can_withdraw() THEN
    RAISE EXCEPTION 'Invitez 1 ami avec votre code et attendez sa recharge de 5 000 F pour débloquer le retrait';
  END IF;
  IF p_amount < 20000 THEN RAISE EXCEPTION 'Le retrait minimum est de 20 000 F'; END IF;
  IF p_amount > v_me.balance THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  IF length(trim(coalesce(p_number,''))) < 8 THEN RAISE EXCEPTION 'Numéro Wave invalide'; END IF;

  UPDATE public.profiles SET balance = balance - p_amount WHERE id = v_me.id;
  INSERT INTO public.withdrawals (user_id, amount, wave_number) VALUES (auth.uid(), p_amount, trim(p_number)) RETURNING * INTO v_w;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Retrait lancé 🚀', 'Votre retrait de ' || p_amount || ' F vers ' || trim(p_number) || ' est en cours de traitement.');
  RETURN v_w;
END; $$;

-- 6. Admin operations
CREATE OR REPLACE FUNCTION public.admin_deposits(p_code text, p_email text)
RETURNS TABLE(
  id uuid, created_at timestamptz, amount bigint, status text, proof_url text,
  wave_phone text, admin_note text, reviewed_at timestamptz,
  profile_id uuid, full_name text, phone text, email text, invite_code text,
  sponsor_code text, balance bigint, blocked boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT d.id, d.created_at, d.amount, d.status, d.proof_url, d.wave_phone, d.admin_note, d.reviewed_at,
         p.id, p.full_name, p.phone, u.email::text, p.invite_code, s.invite_code, p.balance, p.blocked
  FROM public.deposits d
  JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.profiles s ON s.id = p.referred_by
  LEFT JOIN auth.users u ON u.id = d.user_id
  ORDER BY (d.status = 'pending') DESC, d.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_stats(p_code text, p_email text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v json;
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT json_build_object(
    'members', (SELECT count(*) FROM public.profiles),
    'recharged', (SELECT count(*) FROM public.profiles WHERE has_deposited),
    'blocked', (SELECT count(*) FROM public.profiles WHERE blocked),
    'pending', (SELECT count(*) FROM public.deposits WHERE status = 'pending'),
    'approved', (SELECT count(*) FROM public.deposits WHERE status = 'credited'),
    'rejected', (SELECT count(*) FROM public.deposits WHERE status = 'rejected'),
    'cash_in', (SELECT coalesce(sum(amount),0) FROM public.deposits WHERE status = 'credited'),
    'bonus_out', (SELECT coalesce(sum(amount*3),0) FROM public.deposits WHERE status = 'credited'),
    'withdraw_total', (SELECT coalesce(sum(amount),0) FROM public.withdrawals),
    'balance_total', (SELECT coalesce(sum(balance),0) FROM public.profiles)
  ) INTO v;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_review_deposit(p_code text, p_email text, p_id uuid, p_action text, p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deposits; v_me public.profiles; v_bonus bigint;
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dépôt introuvable'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = d.user_id;
  v_bonus := d.amount * 3;

  IF p_action = 'approve' THEN
    IF d.status = 'credited' THEN RAISE EXCEPTION 'Dépôt déjà crédité'; END IF;
    UPDATE public.deposits SET status = 'credited', credited_at = now(), reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    UPDATE public.profiles SET balance = balance + v_bonus, has_deposited = true WHERE id = v_me.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Dépôt validé 🎉', 'Votre dépôt de ' || d.amount || ' F est validé. ' || v_bonus || ' F ont été crédités sur votre solde.');

    IF NOT v_me.has_deposited AND v_me.referred_by IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + 5000 WHERE id = v_me.referred_by;
      INSERT INTO public.notifications (user_id, title, body)
      SELECT p.user_id, 'Bonus parrainage +5 000 F 🎁', coalesce(v_me.full_name,'Votre filleul') || ' s''est rechargé avec votre code. Votre retrait est débloqué !'
      FROM public.profiles p WHERE p.id = v_me.referred_by;
    END IF;

  ELSIF p_action = 'reject' THEN
    UPDATE public.deposits SET status = 'rejected', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Dépôt refusé ❌', 'Aucun paiement Wave de ' || d.amount || ' F n''a été retrouvé. ' || coalesce(nullif(p_note,''), 'Contactez le service client.'));

  ELSIF p_action = 'reclaim' THEN
    IF d.status <> 'credited' THEN RAISE EXCEPTION 'Ce dépôt n''a pas été crédité'; END IF;
    UPDATE public.deposits SET status = 'reclaimed', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    UPDATE public.profiles SET balance = greatest(balance - v_bonus, 0) WHERE id = v_me.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Bonus repris', v_bonus || ' F ont été retirés de votre solde suite à une vérification.');
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_blocked(p_code text, p_email text, p_profile_id uuid, p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.profiles SET blocked = p_blocked WHERE id = p_profile_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_members(p_code text, p_email text)
RETURNS TABLE(
  profile_id uuid, full_name text, phone text, email text, invite_code text,
  sponsor_code text, balance bigint, has_deposited boolean, blocked boolean,
  referrals bigint, active_referrals bigint, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.phone, u.email::text, p.invite_code, s.invite_code, p.balance,
         p.has_deposited, p.blocked,
         (SELECT count(*) FROM public.profiles r WHERE r.referred_by = p.id),
         (SELECT count(*) FROM public.profiles r WHERE r.referred_by = p.id AND r.has_deposited),
         p.created_at
  FROM public.profiles p
  LEFT JOIN public.profiles s ON s.id = p.referred_by
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END; $$;

-- 7. Execution grants
REVOKE EXECUTE ON FUNCTION public.admin_gate(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_deposits(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_stats(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_members(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_deposit(text, text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_blocked(text, text, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_deposit_proof(bigint, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_withdraw() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- 8. Storage policies for deposit proofs
CREATE POLICY "own proof upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'preuves-depot' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own proof read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'preuves-depot' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "own proof delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'preuves-depot' AND (storage.foldername(name))[1] = auth.uid()::text);