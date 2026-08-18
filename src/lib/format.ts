export const fcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";

export const WAVE_LINK = "https://pay.wave.com/m/M_ci_kUJh8VN9_vsB/c/ci/";
export const WHATSAPP_LINK = "https://wa.me/message/UCSMKJU5WSJWB1";
/** Groupe WhatsApp officiel proposé aux nouveaux inscrits. */
export const WHATSAPP_GROUP =
  "https://chat.whatsapp.com/KZEfiXON7eeEjIPPjBkMBQ?s=cl&p=i&mlu=4";
/** Délai indicatif de traitement d'un retrait. */
export const WITHDRAW_ETA_HOURS = 24;
export const DEPOSIT_MIN = 3000;
export const WITHDRAW_MIN = 2000;
/** Une nouvelle carte cadeau à gratter tous les 2 jours. */
export const SCRATCH_INTERVAL_DAYS = 2;

/** Fin de l'opération cadeaux Street Shore : 1 mois et 7 jours. */
export const EVENT_END = new Date("2026-09-22T00:00:00Z");

export const dt = (v: string | Date) =>
  new Date(v).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
