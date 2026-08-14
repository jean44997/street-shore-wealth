export const fcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";

export const WAVE_LINK = "https://pay.wave.com/m/M_ci_kUJh8VN9_vsB/c/ci/";
export const WHATSAPP_LINK = "https://wa.me/message/UCSMKJU5WSJWB1";
export const DEPOSIT_MIN = 5000;
export const WITHDRAW_MIN = 20000;
