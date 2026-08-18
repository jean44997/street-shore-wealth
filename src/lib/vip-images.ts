import vip1 from "@/assets/vip/vip1.jpg";
import vip2 from "@/assets/vip/vip2.jpg";
import vip3 from "@/assets/vip/vip3.jpg";
import vip4 from "@/assets/vip/vip4.jpg";
import vip5 from "@/assets/vip/vip5.jpg";
import vip6 from "@/assets/vip/vip6.jpg";
import vip7 from "@/assets/vip/vip7.jpg";
import vip8 from "@/assets/vip/vip8.jpg";

export const VIP_PRODUCTS: Record<number, { img: string; label: string }> = {
  1: { img: vip1, label: "Panneau solaire portable 10 W" },
  2: { img: vip2, label: "Lanterne solaire USB" },
  3: { img: vip3, label: "Station d'énergie solaire mobile" },
  4: { img: vip4, label: "Kit solaire maison + ampoules LED" },
  5: { img: vip5, label: "Panneau monocristallin 450 W" },
  6: { img: vip6, label: "Onduleur hybride solaire" },
  7: { img: vip7, label: "Batterie lithium solaire haute capacité" },
  8: { img: vip8, label: "Mini-ferme solaire Street Shore" },
};

export const vipProduct = (id: number) =>
  VIP_PRODUCTS[id] ?? { img: vip1, label: "Équipement solaire Street Shore" };
