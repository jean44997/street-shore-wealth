
-- 1. Unlock sponsor withdrawal when a referred member's deposit is approved
CREATE OR REPLACE FUNCTION public.admin_review_deposit(p_code text, p_email text, p_id uuid, p_action text, p_note text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    VALUES (d.user_id, 'Dépôt validé 🎉', 'Votre dépôt de ' || d.amount || ' F est validé. ' || v_total || ' F (dépôt + bonus) ont été crédités sur votre solde.'
      || CASE WHEN coalesce(p_note,'') <> '' THEN ' Note de l''équipe : ' || p_note ELSE '' END);

    IF v_me.referred_by IS NOT NULL THEN
      UPDATE public.profiles SET withdraw_unlocked = true WHERE id = v_me.referred_by;
      INSERT INTO public.notifications (user_id, title, body)
      SELECT p.user_id, 'Retrait débloqué 🎁', coalesce(nullif(v_me.full_name,''),'Votre filleul') || ' s''est rechargé avec votre code. Votre retrait est débloqué !'
      FROM public.profiles p WHERE p.id = v_me.referred_by;
    END IF;

  ELSIF p_action = 'reject' THEN
    UPDATE public.deposits SET status = 'rejected', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Dépôt refusé ❌', 'Aucun paiement Wave de ' || d.amount || ' F n''a été retrouvé. Motif : ' || coalesce(nullif(p_note,''), 'aucun motif précisé — contactez le service client.'));

  ELSIF p_action = 'reclaim' THEN
    IF d.status <> 'credited' THEN RAISE EXCEPTION 'Ce dépôt n''a pas été crédité'; END IF;
    UPDATE public.deposits SET status = 'reclaimed', reviewed_at = now(), admin_note = coalesce(p_note,'') WHERE id = d.id;
    UPDATE public.profiles SET balance = greatest(balance - v_total, 0) WHERE id = v_me.id;
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (d.user_id, 'Bonus repris', v_total || ' F ont été retirés de votre solde. Motif : ' || coalesce(nullif(p_note,''), 'vérification anti-fraude.'));
  ELSE
    RAISE EXCEPTION 'Action inconnue';
  END IF;

  INSERT INTO public.admin_audit (admin_email, action, target_profile_id, target_name, target_email, deposit_id, amount, note)
  VALUES (lower(trim(p_email)), p_action, v_me.id, coalesce(v_me.full_name,''), coalesce(v_mail,''), d.id, d.amount, coalesce(p_note,''));
END; $function$;

-- 2. Retroactive unlock for sponsors who already have an active referral
UPDATE public.profiles me
SET withdraw_unlocked = true
WHERE NOT me.withdraw_unlocked
  AND EXISTS (SELECT 1 FROM public.profiles r WHERE r.referred_by = me.id AND r.has_deposited);

-- 3. Status helper for the withdrawal screen
CREATE OR REPLACE FUNCTION public.withdraw_status()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_me public.profiles; v_vip boolean; v_active int; v_invited int; v_pending int; v_unlocked boolean; v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('unlocked', false, 'reason', 'Connectez-vous.'); END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN json_build_object('unlocked', false, 'reason', 'Profil introuvable.'); END IF;

  SELECT EXISTS (SELECT 1 FROM public.investments WHERE user_id = auth.uid()) INTO v_vip;
  SELECT count(*) FILTER (WHERE r.has_deposited), count(*)
    INTO v_active, v_invited
    FROM public.profiles r WHERE r.referred_by = v_me.id;
  SELECT count(*) INTO v_pending FROM public.withdrawals WHERE user_id = auth.uid() AND status = 'pending';

  v_unlocked := v_me.withdraw_unlocked OR v_me.withdraw_no_referral OR v_vip OR v_active > 0;
  v_reason := CASE
    WHEN NOT v_me.has_deposited AND NOT v_unlocked THEN 'Rechargez votre compte pour activer le retrait.'
    WHEN v_me.withdraw_unlocked OR v_active > 0 THEN 'Parrainage validé — retrait débloqué.'
    WHEN v_vip THEN 'Plan VIP actif — retrait libre à tout moment.'
    WHEN v_me.withdraw_no_referral THEN 'Carte cadeau gagnante — retrait sans parrainage.'
    ELSE 'Invitez 1 ami avec votre code : dès que sa recharge est validée, votre retrait s''ouvre.'
  END;

  RETURN json_build_object(
    'unlocked', v_unlocked,
    'reason', v_reason,
    'blocked', v_me.blocked,
    'has_deposited', v_me.has_deposited,
    'vip', v_vip,
    'no_referral', v_me.withdraw_no_referral,
    'flag_unlocked', v_me.withdraw_unlocked,
    'invited', v_invited,
    'active_referrals', v_active,
    'pending_withdrawals', v_pending,
    'balance', v_me.balance
  );
END; $function$;

REVOKE ALL ON FUNCTION public.withdraw_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.withdraw_status() TO authenticated;
