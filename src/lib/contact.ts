// How owners reach the Reputra team: the founder's WhatsApp (the website uses the same number, public/site.js).
export const REPUTRA_WHATSAPP = "923024625600";
export const REPUTRA_EMAIL = "hello@reputra.pk";

export const whatsappLink = (text = "") =>
  `https://wa.me/${REPUTRA_WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
