// The hardware Reputra sells. Every item opens the owner's review page and carries a visible
// "Powered by Reputra" mark. The amount on an order always comes from this list on the server.

export const PRODUCT_KINDS = ["stand", "card", "sticker"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export type Product = {
  kind: ProductKind;
  name: string;
  short: string; // one line under the name
  detail: string; // what it is, for the shop's description
  price: number; // whole rupees
  scan: "qr+nfc" | "nfc"; // how customers open it
  plural: string;
};

export const PRODUCTS: Product[] = [
  {
    kind: "stand",
    name: "Counter stand",
    short: "Acrylic, QR and tap in one",
    detail: "Clear acrylic for the counter. Customers scan the QR code or tap their phone on it.",
    price: 2999,
    scan: "qr+nfc",
    plural: "stands",
  },
  {
    kind: "card",
    name: "Tap card",
    short: "For the bill folder or the till",
    detail: "A card with a hidden NFC chip. Hand it over with the bill and the customer taps their phone on it.",
    price: 1299,
    scan: "nfc",
    plural: "cards",
  },
  {
    kind: "sticker",
    name: "Tap sticker",
    short: "Tables, doors, mirrors",
    detail: "A round sticker with an NFC chip inside. Put one on every table, mirror or reception desk.",
    price: 599,
    scan: "nfc",
    plural: "stickers",
  },
];

export const productOf = (kind: ProductKind) => PRODUCTS.find((p) => p.kind === kind)!;

// Per item, per order: enough for a busy restaurant, small enough to catch a typo.
export const MAX_QTY = 50;

export type CartLine = { kind: ProductKind; qty: number };

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + productOf(l.kind).price * l.qty, 0);
}

// "2 stands, 1 card", in the shop's order.
export function describeItems(lines: CartLine[]) {
  return PRODUCT_KINDS.flatMap((kind) => {
    const qty = lines.find((l) => l.kind === kind)?.qty ?? 0;
    if (!qty) return [];
    const p = productOf(kind);
    return [`${qty} ${qty === 1 ? p.name.split(" ").pop()!.toLowerCase() : p.plural}`];
  }).join(", ");
}
