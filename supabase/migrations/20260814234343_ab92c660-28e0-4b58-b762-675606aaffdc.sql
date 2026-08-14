
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  balance bigint NOT NULL DEFAULT 0,
  invite_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  has_deposited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR id IN (SELECT referred_by FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deposits" ON public.deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  wave_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ensure_profile(p_name text, p_phone text, p_ref_code text)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles;
  v_code text;
  v_ref uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = auth.uid();
  IF FOUND THEN RETURN v_profile; END IF;

  LOOP
    v_code := 'SS' || upper(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = v_code);
  END LOOP;

  IF p_ref_code IS NOT NULL AND length(trim(p_ref_code)) > 0 THEN
    SELECT id INTO v_ref FROM public.profiles WHERE invite_code = upper(trim(p_ref_code));
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, invite_code, referred_by)
  VALUES (auth.uid(), coalesce(p_name, ''), coalesce(p_phone, ''), v_code, v_ref)
  RETURNING * INTO v_profile;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Bienvenue sur Street Shore', 'Rechargez 5 000 F et recevez 15 000 F. Invitez 1 ami pour atteindre 20 000 F.');

  IF v_ref IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body)
    SELECT p.user_id, 'Nouveau filleul', coalesce(p_name, 'Un utilisateur') || ' s''est inscrit avec votre code ' || p.invite_code || '.'
    FROM public.profiles p WHERE p.id = v_ref;
  END IF;

  RETURN v_profile;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount bigint)
RETURNS public.deposits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dep public.deposits;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_amount < 5000 THEN RAISE EXCEPTION 'Le dépôt minimum est de 5 000 F'; END IF;
  INSERT INTO public.deposits (user_id, amount) VALUES (auth.uid(), p_amount) RETURNING * INTO v_dep;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Dépôt en cours de validation', 'Votre dépôt de ' || p_amount || ' F est en cours. Patientez 10 minutes pour recevoir votre bonus.');
  RETURN v_dep;
END; $$;

CREATE OR REPLACE FUNCTION public.process_my_deposits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.deposits;
  v_me public.profiles;
  v_bonus bigint;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;

  FOR d IN SELECT * FROM public.deposits
    WHERE user_id = auth.uid() AND status = 'pending' AND created_at < now() - interval '10 minutes'
  LOOP
    v_bonus := d.amount * 3;
    UPDATE public.deposits SET status = 'credited', credited_at = now() WHERE id = d.id;
    UPDATE public.profiles SET balance = balance + v_bonus, has_deposited = true WHERE id = v_me.id;

    INSERT INTO public.notifications (user_id, title, body)
    VALUES (auth.uid(), 'Bonus crédité', v_bonus || ' F ont été ajoutés à votre solde.');

    IF NOT v_me.has_deposited AND v_me.referred_by IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + 5000 WHERE id = v_me.referred_by;
      INSERT INTO public.notifications (user_id, title, body)
      SELECT p.user_id, 'Bonus parrainage +5 000 F', v_me.full_name || ' s''est rechargé avec votre code. Vous avez reçu 5 000 F.'
      FROM public.profiles p WHERE p.id = v_me.referred_by;
    END IF;
    v_me.has_deposited := true;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount bigint, p_number text)
RETURNS public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me public.profiles; v_w public.withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF p_amount < 20000 THEN RAISE EXCEPTION 'Le retrait minimum est de 20 000 F'; END IF;
  IF p_amount > v_me.balance THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  IF length(trim(coalesce(p_number,''))) < 8 THEN RAISE EXCEPTION 'Numéro Wave invalide'; END IF;

  UPDATE public.profiles SET balance = balance - p_amount WHERE id = v_me.id;
  INSERT INTO public.withdrawals (user_id, amount, wave_number) VALUES (auth.uid(), p_amount, trim(p_number)) RETURNING * INTO v_w;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Retrait demandé', 'Votre retrait de ' || p_amount || ' F vers ' || trim(p_number) || ' est en cours de traitement.');
  RETURN v_w;
END; $$;

CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE (full_name text, created_at timestamptz, has_deposited boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.full_name, r.created_at, r.has_deposited
  FROM public.profiles r
  JOIN public.profiles me ON me.id = r.referred_by
  WHERE me.user_id = auth.uid()
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.referrer_name(p_code text)
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT full_name FROM public.profiles WHERE invite_code = upper(trim(p_code)) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.referrer_name(text) TO anon, authenticated;
