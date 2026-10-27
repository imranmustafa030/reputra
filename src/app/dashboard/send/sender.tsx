"use client";

import { useState } from "react";
import { logWhatsAppSent } from "@/app/actions/business";
import { fillMessage, toWhatsAppNumber } from "@/lib/format";

export function WhatsAppSender({ template, business, link }: { template: string; business: string; link: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(0);

  const number = toWhatsAppNumber(phone);
  const message = fillMessage(template, { name: name.trim(), business, link });
  const showPhoneError = phone.replace(/\D/g, "").length >= 10 && !number;

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!number) return;
    // Open first, synchronously, so the browser doesn't treat it as a popup; the count is recorded alongside.
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    logWhatsAppSent().catch(() => {});
    setSent((n) => n + 1);
    setName("");
    setPhone("");
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={send} className="panel grid content-start gap-5 p-5 md:p-6">
        <div>
          <label className="label" htmlFor="customer-name">Customer’s name</label>
          <input className="input" id="customer-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="Ali" />
        </div>
        <div>
          <label className="label" htmlFor="customer-phone">WhatsApp number</label>
          <input
            className="input"
            id="customer-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="off"
            placeholder="0300 1234567"
            aria-invalid={showPhoneError}
            aria-describedby="phone-hint"
            required
          />
          <p id="phone-hint" className={`hint ${showPhoneError ? "text-danger" : ""}`}>
            {showPhoneError ? "That doesn't look like a mobile number." : "Any format works: 0300 1234567 or +92 300 1234567."}
          </p>
        </div>
        <button type="submit" className="btn btn-gold w-full" disabled={!number}>
          Open WhatsApp
        </button>
        {sent > 0 && (
          <p aria-live="polite" className="text-sm text-growth">
            {sent === 1 ? "1 request sent" : `${sent} requests sent`} this session. Ready for the next customer.
          </p>
        )}
      </form>

      <section className="panel p-5 md:p-6" aria-label="Message preview">
        <p className="text-sm text-stone">What the customer receives</p>
        <div className="mt-4 rounded-2xl rounded-tl-sm bg-[oklch(93%_0.05_150)] p-4 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap text-ink">
          {message}
        </div>
        <p className="mt-4 text-sm text-stone">Change the wording in Settings.</p>
      </section>
    </div>
  );
}
