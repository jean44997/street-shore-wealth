-- ============ ADMIN GATE ============
CREATE OR REPLACE FUNCTION public.admin_gate(p_code text, p_email text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_code text; v_email text;
BEGIN
  v_email := lower(trim(coalesce(p_email, '')));
  IF v_email = '' THEN RETURN false; END IF;
  SELECT value INTO v_code FROM public.app_settings WHERE key = 'admin_code';
  RETURN coalesce(
    lower(trim(coalesce(v_code,''))) = lower(trim(coalesce(p_code,'')))
    AND EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(trim(a.email)) = v_email),
    false);
END; $function$;

-- ============ PROFILE FLAGS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS withdraw_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdraw_no_referral boolean NOT NULL DEFAULT false;

-- ============ SCRATCH CARDS ============
CREATE TABLE IF NOT EXISTS public.scratch_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize text,
  amount bigint NOT NULL DEFAULT 0,
  scratched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scratch_cards TO authenticated;
GRANT ALL ON public.scratch_cards TO service_role;
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own scratch cards" ON public.scratch_cards;
CREATE POLICY "own scratch cards" ON public.scratch_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.my_scratch_card()
 RETURNS public.scratch_cards LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.scratch_cards;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v FROM public.scratch_cards WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
  IF FOUND AND (v.scratched_at IS NULL OR v.created_at > now() - interval '2 days') THEN
    RETURN v;
  END IF;
  INSERT INTO public.scratch_cards (user_id) VALUES (auth.uid()) RETURNING * INTO v;
  RETURN v;
END; $function$;

CREATE OR REPLACE FUNCTION public.scratch_card(p_id uuid)
 RETURNS public.scratch_cards LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v public.scratch_cards; v_me public.profiles; r double precision; v_prize text; v_amount bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  SELECT * INTO v FROM public.scratch_cards WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carte introuvable'; END IF;
  IF v.scratched_at IS NOT NULL THEN RETURN v; END IF;

  r := random();
  IF r < 0.20 THEN
    v_prize := 'jackpot_libre'; v_amount := 20000;
    UPDATE public.profiles SET balance = balance + 20000, withdraw_unlocked = true, withdraw_no_referral = true WHERE id = v_me.id;
  ELSIF r < 0.50 THEN
    v_prize := 'retrait_sans_ami'; v_amount := 0;
    UPDATE public.profiles SET withdraw_no_referral = true WHERE id = v_me.id;
  ELSIF r < 0.75 THEN
    v_prize := 'rien'; v_amount := 0;
  ELSIF r < 0.875 THEN
    v_prize := 'bonus'; v_amount := 2000;
    UPDATE public.profiles SET balance = balance + 2000 WHERE id = v_me.id;
  ELSE
    v_prize := 'bonus'; v_amount := 1000;
    UPDATE public.profiles SET balance = balance + 1000 WHERE id = v_me.id;
  END IF;

  UPDATE public.scratch_cards SET prize = v_prize, amount = v_amount, scratched_at = now() WHERE id = v.id RETURNING * INTO v;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(),
    CASE v_prize
      WHEN 'jackpot_libre' THEN 'Jackpot 🎉'
      WHEN 'retrait_sans_ami' THEN 'Retrait débloqué 🔓'
      WHEN 'bonus' THEN 'Bonus carte cadeau 🎁'
      ELSE 'Carte cadeau grattée' END,
    CASE v_prize
      WHEN 'jackpot_libre' THEN '20 000 F crédités et retirables immédiatement, sans dépôt ni parrainage.'
      WHEN 'retrait_sans_ami' THEN 'Dès votre recharge, vous pourrez retirer vos 20 000 F sans ajouter d''ami.'
      WHEN 'bonus' THEN v_amount || ' F ont été ajoutés à votre solde.'
      ELSE 'Pas de chance cette fois. Nouvelle carte dans 2 jours !' END);
  RETURN v;
END; $function$;

-- ============ VIP PLANS ============
CREATE TABLE IF NOT EXISTS public.vip_plans (
  id smallint PRIMARY KEY,
  name text NOT NULL,
  tier text NOT NULL,
  price bigint NOT NULL,
  daily_income bigint NOT NULL,
  days integer NOT NULL DEFAULT 150,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_plans TO anon, authenticated;
GRANT ALL ON public.vip_plans TO service_role;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans publics" ON public.vip_plans;
CREATE POLICY "plans publics" ON public.vip_plans FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.vip_plans (id, tier, name, price, daily_income, days) VALUES
 (1,'VIP1','Shore Starter',3000,750,150),
 (2,'VIP2','Shore Bronze',10000,2550,150),
 (3,'VIP3','Shore Argent',20000,5200,150),
 (4,'VIP4','Shore Or',45000,11925,150),
 (5,'VIP5','Shore Platine',100000,27000,150),
 (6,'VIP6','Shore Diamant',200000,55000,150),
 (7,'VIP7','Shore Élite',400000,112000,150),
 (8,'VIP8','Shore Légende',800000,240000,150)
ON CONFLICT (id) DO UPDATE SET tier=EXCLUDED.tier, name=EXCLUDED.name, price=EXCLUDED.price, daily_income=EXCLUDED.daily_income, days=EXCLUDED.days;

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id smallint NOT NULL REFERENCES public.vip_plans(id),
  price bigint NOT NULL,
  daily_income bigint NOT NULL,
  days integer NOT NULL,
  days_claimed integer NOT NULL DEFAULT 0,
  last_claim_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own investments" ON public.investments;
CREATE POLICY "own investments" ON public.investments FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.buy_vip(p_plan_id smallint)
 RETURNS public.investments LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_plan public.vip_plans; v_me public.profiles; v_inv public.investments;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  SELECT * INTO v_plan FROM public.vip_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan introuvable'; END IF;
  IF v_me.balance < v_plan.price THEN RAISE EXCEPTION 'Solde insuffisant : rechargez votre compte'; END IF;

  UPDATE public.profiles SET balance = balance - v_plan.price WHERE id = v_me.id;
  INSERT INTO public.investments (user_id, plan_id, price, daily_income, days)
  VALUES (auth.uid(), v_plan.id, v_plan.price, v_plan.daily_income, v_plan.days)
  RETURNING * INTO v_inv;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Plan ' || v_plan.tier || ' activé 🚀',
    v_plan.name || ' vous rapporte ' || v_plan.daily_income || ' F par jour pendant ' || v_plan.days || ' jours.');
  RETURN v_inv;
END; $function$;

CREATE OR REPLACE FUNCTION public.claim_vip_income()
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_inv public.investments; v_days integer; v_total bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  FOR v_inv IN SELECT * FROM public.investments WHERE user_id = auth.uid() AND active LOOP
    v_days := floor(extract(epoch FROM (now() - v_inv.last_claim_at)) / 86400)::int;
    v_days := least(v_days, v_inv.days - v_inv.days_claimed);
    IF v_days > 0 THEN
      v_total := v_total + v_days * v_inv.daily_income;
      UPDATE public.investments
        SET days_claimed = days_claimed + v_days,
            last_claim_at = last_claim_at + (v_days || ' days')::interval,
            active = (days_claimed + v_days) < days
        WHERE id = v_inv.id;
    END IF;
  END LOOP;
  IF v_total > 0 THEN
    UPDATE public.profiles SET balance = balance + v_total WHERE user_id = auth.uid();
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (auth.uid(), 'Revenus VIP encaissés 💰', v_total || ' F de revenus quotidiens ont été crédités sur votre solde.');
  END IF;
  RETURN v_total;
END; $function$;

-- ============ DEPOT / RETRAIT ============
CREATE OR REPLACE FUNCTION public.submit_deposit_proof(p_amount bigint, p_proof_url text, p_phone text)
 RETURNS deposits LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_dep public.deposits; v_me public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  IF p_amount < 3000 THEN RAISE EXCEPTION 'Le dépôt minimum est de 3 000 F'; END IF;
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
END; $function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount bigint, p_number text)
 RETURNS withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me public.profiles; v_w public.withdrawals; v_vip boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.investments WHERE user_id = auth.uid()) INTO v_vip;

  IF NOT v_me.withdraw_unlocked THEN
    IF NOT v_me.has_deposited THEN RAISE EXCEPTION 'Rechargez votre compte avant de retirer'; END IF;
    IF NOT (v_me.withdraw_no_referral OR v_vip OR public.can_withdraw()) THEN
      RAISE EXCEPTION 'Invitez 1 ami avec votre code et attendez sa recharge pour débloquer le retrait';
    END IF;
  END IF;

  IF p_amount < 2000 THEN RAISE EXCEPTION 'Le retrait minimum est de 2 000 F'; END IF;
  IF p_amount > v_me.balance THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  IF length(trim(coalesce(p_number,''))) < 8 THEN RAISE EXCEPTION 'Numéro Wave invalide'; END IF;

  UPDATE public.profiles SET balance = balance - p_amount WHERE id = v_me.id;
  INSERT INTO public.withdrawals (user_id, amount, wave_number) VALUES (auth.uid(), p_amount, trim(p_number)) RETURNING * INTO v_w;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (auth.uid(), 'Retrait lancé 🚀', 'Votre retrait de ' || p_amount || ' F vers ' || trim(p_number) || ' est en cours de traitement.');
  RETURN v_w;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.my_scratch_card() FROM anon;
REVOKE EXECUTE ON FUNCTION public.scratch_card(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.buy_vip(smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_vip_income() FROM anon;