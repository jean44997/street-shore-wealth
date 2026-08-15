CREATE TABLE IF NOT EXISTS public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_email text NOT NULL,
  action text NOT NULL,
  target_profile_id uuid,
  target_name text NOT NULL DEFAULT '',
  target_email text NOT NULL DEFAULT '',
  deposit_id uuid,
  amount bigint NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT ''
);
GRANT ALL ON public.admin_audit TO service_role;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_gate(p_code text, p_email text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_code text; v_email text;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));
  IF v_email = '' THEN RETURN false; END IF;
  SELECT value INTO v_code FROM public.app_settings WHERE key = 'admin_code';
  RETURN coalesce(
    v_code = p_code AND EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = v_email),
    false);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_stats(p_code text, p_email text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v json;
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT json_build_object(
    'members', (SELECT count(*) FROM public.profiles),
    'rechargers', (SELECT count(*) FROM public.profiles WHERE has_deposited),
    'blocked', (SELECT count(*) FROM public.profiles WHERE blocked),
    'deposits_pending', (SELECT count(*) FROM public.deposits WHERE status = 'pending'),
    'deposits_ok', (SELECT count(*) FROM public.deposits WHERE status = 'credited'),
    'total_deposited', (SELECT coalesce(sum(amount),0) FROM public.deposits WHERE status = 'credited'),
    'total_credited', (SELECT coalesce(sum(amount*4),0) FROM public.deposits WHERE status = 'credited'),
    'total_withdrawn', (SELECT coalesce(sum(amount),0) FROM public.withdrawals)
  ) INTO v;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_review_deposit(p_code text, p_email text, p_id uuid, p_action text, p_note text DEFAULT ''::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.deposits; v_me public.profiles; v_total bigint; v_mail text;
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dépôt introuvable'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = d.user_id;
  v_total := d.amount * 4;
  SELECT email::text INTO v_mail FROM auth.users WHERE id = d.user_id;

  IF p_action = 'approve' THEN
    IF d.status = 'credited' THEN RAISE EXCEPTION 'Dépôt déjà crédité'; END IF;
    UPDATE public.deposits SET status = 'credited', credited_at = now(), reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    UPDATE public.profiles SET balance = balance + v_total, has_deposited = true WHERE id = v_me.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Dépôt validé 🎉', 'Votre dépôt de ' || d.amount || ' F est validé. ' || v_total || ' F (dépôt + bonus) ont été crédités sur votre solde.');

    IF NOT v_me.has_deposited AND v_me.referred_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body)
      SELECT p.user_id, 'Retrait débloqué 🎁', coalesce(v_me.full_name,'Votre filleul') || ' s''est rechargé avec votre code. Votre retrait est débloqué !'
      FROM public.profiles p WHERE p.id = v_me.referred_by;
    END IF;

  ELSIF p_action = 'reject' THEN
    UPDATE public.deposits SET status = 'rejected', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Dépôt refusé ❌', 'Aucun paiement Wave de ' || d.amount || ' F n''a été retrouvé. ' || coalesce(nullif(p_note,''), 'Contactez le service client.'));

  ELSIF p_action = 'reclaim' THEN
    IF d.status <> 'credited' THEN RAISE EXCEPTION 'Ce dépôt n''a pas été crédité'; END IF;
    UPDATE public.deposits SET status = 'reclaimed', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    UPDATE public.profiles SET balance = greatest(balance - v_total, 0) WHERE id = v_me.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Bonus repris', v_total || ' F ont été retirés de votre solde suite à une vérification.');
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;

  INSERT INTO public.admin_audit (admin_email, action, target_profile_id, target_name, target_email, deposit_id, amount, note)
  VALUES (lower(trim(p_email)), p_action, v_me.id, coalesce(v_me.full_name,''), coalesce(v_mail,''), d.id, d.amount, coalesce(p_note,''));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_blocked(p_code text, p_email text, p_profile_id uuid, p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_p public.profiles; v_mail text;
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.profiles SET blocked = p_blocked WHERE id = p_profile_id RETURNING * INTO v_p;
  SELECT email::text INTO v_mail FROM auth.users WHERE id = v_p.user_id;
  INSERT INTO public.admin_audit (admin_email, action, target_profile_id, target_name, target_email, note)
  VALUES (lower(trim(p_email)), CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END, v_p.id, coalesce(v_p.full_name,''), coalesce(v_mail,''), '');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_audit_list(p_code text, p_email text)
RETURNS SETOF public.admin_audit LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.admin_gate(p_code, p_email) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  RETURN QUERY SELECT * FROM public.admin_audit ORDER BY created_at DESC LIMIT 500;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_gate(text,text), public.admin_stats(text,text), public.admin_deposits(text,text), public.admin_members(text,text), public.admin_review_deposit(text,text,uuid,text,text), public.admin_set_blocked(text,text,uuid,boolean), public.admin_audit_list(text,text) TO anon, authenticated;