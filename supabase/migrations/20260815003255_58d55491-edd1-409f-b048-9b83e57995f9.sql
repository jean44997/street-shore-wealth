REVOKE EXECUTE ON FUNCTION public.ensure_profile(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_referrals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_my_deposits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_deposit(bigint) FROM anon;