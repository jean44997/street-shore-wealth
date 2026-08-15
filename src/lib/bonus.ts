/** Règles métier Street Shore (partagées UI + tests). */
export const BONUS_MULTIPLIER = 3;

/** Bonus offert pour un dépôt (x3 du montant). 5 000 F → 15 000 F. */
export const bonusFor = (amount: number) => Math.max(0, Math.round(amount)) * BONUS_MULTIPLIER;

/** Total crédité sur le solde : dépôt + bonus. 5 000 F → 20 000 F. */
export const creditedFor = (amount: number) => Math.max(0, Math.round(amount)) + bonusFor(amount);

/** Un retrait exige un dépôt validé + 1 filleul rechargé + le minimum. */
export const canWithdraw = (opts: {
  hasDeposited: boolean;
  activeReferrals: number;
  balance: number;
  amount: number;
  min: number;
}) =>
  opts.hasDeposited &&
  opts.activeReferrals >= 1 &&
  opts.amount >= opts.min &&
  opts.amount <= opts.balance;
