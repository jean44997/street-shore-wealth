CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount bigint, p_number text)
 RETURNS withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me public.profiles; v_w public.withdrawals; v_vip boolean; v_active int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_me.blocked THEN RAISE EXCEPTION 'Votre compte est bloqué. Contactez le service client.'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.investments WHERE user_id = auth.uid()) INTO v_vip;
  SELECT count(*) INTO v_active FROM public.profiles r WHERE r.referred_by = v_me.id AND r.has_deposited;

  IF v_vip AND v_active < 1 THEN
    RAISE EXCEPTION 'Membre VIP : parrainez au moins 1 ami (jusqu''à 3) qui recharge 5 000 F pour prouver que votre compte est actif et débloquer le retrait immédiat sans frais';
  END IF;

  IF NOT v_me.withdraw_unlocked AND NOT v_vip THEN
    IF NOT v_me.has_deposited THEN RAISE EXCEPTION 'Rechargez votre compte avant de retirer'; END IF;
    IF NOT (v_me.withdraw_no_referral OR v_active > 0) THEN
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

CREATE OR REPLACE FUNCTION public.withdraw_status()
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me public.profiles; v_vip boolean; v_active int; v_invited int; v_pending int; v_unlocked boolean; v_reason text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('unlocked', false, 'reason', 'Connectez-vous.'); END IF;
  SELECT * INTO v_me FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN json_build_object('unlocked', false, 'reason', 'Profil introuvable.'); END IF;
  SELECT EXISTS (SELECT 1 FROM public.investments WHERE user_id = auth.uid()) INTO v_vip;
  SELECT count(*) FILTER (WHERE r.has_deposited), count(*) INTO v_active, v_invited
    FROM public.profiles r WHERE r.referred_by = v_me.id;
  SELECT count(*) INTO v_pending FROM public.withdrawals WHERE user_id = auth.uid() AND status = 'pending';

  IF v_vip THEN
    v_unlocked := v_active > 0;
    v_reason := CASE WHEN v_active > 0
      THEN 'Membre VIP actif (' || least(v_active,3) || '/3 filleuls) — retrait immédiat et sans frais.'
      ELSE 'Membre VIP : parrainez 1 à 3 amis qui rechargent 5 000 F pour prouver que votre compte est actif et débloquer le retrait immédiat sans frais.' END;
  ELSE
    v_unlocked := v_me.withdraw_unlocked OR v_me.withdraw_no_referral OR v_active > 0;
    v_reason := CASE
      WHEN NOT v_me.has_deposited AND NOT v_unlocked THEN 'Rechargez votre compte pour activer le retrait.'
      WHEN v_me.withdraw_unlocked OR v_active > 0 THEN 'Parrainage validé — retrait débloqué.'
      WHEN v_me.withdraw_no_referral THEN 'Carte cadeau gagnante — retrait sans parrainage.'
      ELSE 'Invitez 1 ami avec votre code : dès que sa recharge est validée, votre retrait s''ouvre.' END;
  END IF;

  RETURN json_build_object('unlocked', v_unlocked, 'reason', v_reason, 'blocked', v_me.blocked,
    'has_deposited', v_me.has_deposited, 'vip', v_vip, 'no_referral', v_me.withdraw_no_referral,
    'flag_unlocked', v_me.withdraw_unlocked, 'invited', v_invited, 'active_referrals', v_active,
    'pending_withdrawals', v_pending, 'balance', v_me.balance);
END; $function$;