export const fcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";

export const WAVE_LINK = "https://pay.wave.com/m/M_ci_kUJh8VN9_vsB/c/ci/";
export const WHATSAPP_LINK = "https://wa.me/message/UCSMKJU5WSJWB1";
export const DEPOSIT_MIN = 5000;
export const WITHDRAW_MIN = 20000;

/** Fin de l'opération cadeaux Street Shore : 1 mois et 7 jours. */
export const EVENT_END = new Date("2026-09-22T00:00:00Z");

export const dt = (v: string | Date) =>
  new Date(v).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
