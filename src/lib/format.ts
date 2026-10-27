// Small pure helpers shared by server and client code.

export function slugify(text: string) {
  return (
    text
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "business"
  );
}

// Pakistani numbers are typed every way: 0300 1234567, +92 300-1234567, 3001234567.
// wa.me wants 923001234567. Returns null when it can't be a mobile number.
export function toWhatsAppNumber(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("03") && digits.length === 11) digits = "92" + digits.slice(1);
  if (digits.startsWith("3") && digits.length === 10) digits = "92" + digits;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

export function fillMessage(template: string, values: { name: string; business: string; link: string }) {
  return template
    .replaceAll("{name}", values.name)
    .replaceAll("{business}", values.business)
    .replaceAll("{link}", values.link)
    .replace(/\s+!/g, "!")
    .trim();
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(date),
  );
}
