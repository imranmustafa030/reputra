// How owners reach the Reputra team. Placeholder number until launch (website dummy D01 uses the same one).
export const REPUTRA_WHATSAPP = "923000000000";
export const REPUTRA_EMAIL = "hello@reputra.pk";

export const whatsappLink = (text = "") =>
  `https://wa.me/${REPUTRA_WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
