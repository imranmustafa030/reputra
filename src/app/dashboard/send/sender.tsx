"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { logWhatsAppSent } from "@/app/actions/business";
import { fillMessage, parseContacts, toWhatsAppNumber } from "@/lib/format";

type Props = { template: string; business: string; link: string };

// Two ways to ask: one customer at a time, or a pasted list worked through one tap per
// customer. Either way WhatsApp opens on this phone and the owner presses send there.
// Numbers live only on this screen; only the count of requests is recorded.
export function WhatsAppSender(props: Props) {
  const [mode, setMode] = useState<"one" | "list">("one");
  const [preview, setPreview] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="panel p-5 sm:p-6">
        <div className="segmented" role="radiogroup" aria-label="How many customers">
          <label>
            <input type="radio" name="mode" checked={mode === "one"} onChange={() => setMode("one")} />
            One customer
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === "list"} onChange={() => setMode("list")} />
            Paste a list
          </label>
        </div>
        <div key={mode} className="enter mt-6">
          {mode === "one" ? <One {...props} onName={setPreview} /> : <List {...props} />}
        </div>
      </div>

      <section className="panel p-5 sm:p-6" aria-label="Message preview">
        <p className="text-sm text-muted">What the customer receives</p>
        <div className="mt-3 rounded-2xl rounded-tl-md bg-[oklch(95%_0.04_150)] p-4 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap">
          {fillMessage(props.template, { name: preview.trim(), business: props.business, link: props.link })}
        </div>
        <p className="mt-4 text-sm text-muted">
          Numbers aren’t saved anywhere. Reputra only counts how many requests went out.
        </p>
      </section>
    </div>
  );
}

function open(number: string, message: string) {
  // Open first, synchronously, so the browser doesn't treat it as a popup; the count is recorded alongside.
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  logWhatsAppSent().catch(() => {});
}

function One({ template, business, link, onName }: Props & { onName: (name: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(0);
  const number = toWhatsAppNumber(phone);
  const showPhoneError = phone.replace(/\D/g, "").length >= 10 && !number;

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!number) return;
    open(number, fillMessage(template, { name: name.trim(), business, link }));
    setSent((n) => n + 1);
    setName("");
    setPhone("");
    onName("");
  }

  return (
    <form onSubmit={send} className="grid gap-4">
      <div>
        <label className="label" htmlFor="customer-name">
          Customer’s name <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          className="input"
          id="customer-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onName(e.target.value);
          }}
          autoComplete="off"
          placeholder="Ali"
        />
      </div>
      <div>
        <label className="label" htmlFor="customer-phone">
          WhatsApp number
        </label>
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
        <p id="phone-hint" className={`hint ${showPhoneError ? "text-negative" : ""}`}>
          {showPhoneError ? "That doesn’t look like a mobile number." : "Any format works: 0300 1234567 or +92 300 1234567."}
        </p>
      </div>
      <button type="submit" className="btn w-full sm:w-auto sm:justify-self-start" disabled={!number}>
        <Send aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Open WhatsApp
      </button>
      {sent > 0 && (
        <p aria-live="polite" className="text-sm text-positive">
          {sent === 1 ? "1 request" : `${sent} requests`} sent from this screen. Ready for the next customer.
        </p>
      )}
    </form>
  );
}

function List({ template, business, link }: Props) {
  const [text, setText] = useState("");
  const [queue, setQueue] = useState<{ name: string; number: string; sent: boolean }[] | null>(null);
  const [skipped, setSkipped] = useState(0);

  if (!queue) {
    const { contacts } = parseContacts(text);
    return (
      <div className="grid gap-4">
        <div>
          <label className="label" htmlFor="list">
            Paste names and numbers, one customer per line
          </label>
          <textarea
            id="list"
            className="input font-mono text-sm"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Ali 0300 1234567\nSana, 0321-7654321\n03451122334"}
          />
          <p className="hint">Copy a column from Excel, your billing software or a chat. The name is optional.</p>
        </div>
        <button
          type="button"
          className="btn sm:justify-self-start"
          disabled={contacts.length === 0}
          onClick={() => {
            const parsed = parseContacts(text);
            setQueue(parsed.contacts.map((c) => ({ ...c, sent: false })));
            setSkipped(parsed.skipped);
          }}
        >
          {contacts.length ? `Make a list of ${contacts.length}` : "Make a list"}
        </button>
      </div>
    );
  }

  const done = queue.filter((c) => c.sent).length;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="num font-medium">{done}</span> <span className="text-muted">of</span> <span className="num font-medium">{queue.length}</span>{" "}
          <span className="text-muted">asked</span>
          {skipped > 0 && <span className="text-muted"> · {skipped} lines had no number</span>}
        </p>
        <button type="button" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => setQueue(null)}>
          Start over
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${(done / queue.length) * 100}%` }} />
      </div>
      <ul className="mt-4 max-h-[420px] overflow-y-auto">
        {queue.map((c, i) => (
          <li key={c.number} className={`flex min-h-14 items-center gap-3 py-2 ${i ? "border-t border-rule" : ""}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium">{c.name || "Customer"}</span>
              <span className="num block text-xs text-muted">+{c.number}</span>
            </span>
            {c.sent ? (
              <span className="pill pill-positive pop">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                Opened
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  open(c.number, fillMessage(template, { name: c.name, business, link }));
                  setQueue((q) => q!.map((x) => (x.number === c.number ? { ...x, sent: true } : x)));
                }}
              >
                Ask
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
