"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/app/actions/auth";
import { saveSettings } from "@/app/actions/business";
import { FormMessage, SubmitButton } from "@/components/form";
import { fillMessage } from "@/lib/format";
import { CATEGORY_NAMES } from "@/lib/labels";

type Business = { name: string; category: string; city: string; googleReviewUrl: string; whatsappMessage: string };

// Settings in rows: what a section is on the left, its fields on the right. One Save for the business.
export function SettingsForm({ business, pageUrl, waLink }: { business: Business; pageUrl: string; waLink: string }) {
  const [state, action] = useActionState(saveSettings, undefined);
  const value = (key: keyof Business) => state?.values?.[key] ?? business[key];
  const [message, setMessage] = useState(business.whatsappMessage);

  return (
    <form action={action} className="max-w-[1080px]">
      <Row title="Business" description="Shown at the top of your review page and in WhatsApp messages.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              Business name
            </label>
            <input className="input" id="name" name="name" defaultValue={value("name")} required />
          </div>
          <div>
            <label className="label" htmlFor="category">
              Type of business
            </label>
            <select className="input" id="category" name="category" defaultValue={value("category")}>
              {Object.entries(CATEGORY_NAMES).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">
              City
            </label>
            <input className="input" id="city" name="city" defaultValue={value("city")} required />
          </div>
        </div>
        <p className="hint">
          Review page: <span className="font-mono text-ink">{pageUrl}</span>. This address never changes, so printed stands keep working.
        </p>
      </Row>

      <Row id="google" title="Google review link" description="Where “Review us on Google” takes your customers.">
        <label className="label" htmlFor="googleReviewUrl">
          Link
        </label>
        <input
          className="input"
          id="googleReviewUrl"
          name="googleReviewUrl"
          type="url"
          inputMode="url"
          defaultValue={value("googleReviewUrl")}
          placeholder="https://g.page/r/…/review"
        />
        <ol className="mt-3 grid list-decimal gap-1 pl-5 text-sm text-muted marker:text-faint">
          <li>Open Google Maps and find your business.</li>
          <li>Tap “Ask for reviews” or “Share review form” (in your Business Profile).</li>
          <li>Copy the link and paste it here.</li>
        </ol>
      </Row>

      <Row id="message" title="WhatsApp message" description="Sent when you ask a customer from Ask on WhatsApp.">
        <label className="label" htmlFor="whatsappMessage">
          Message
        </label>
        <textarea
          className="input"
          id="whatsappMessage"
          name="whatsappMessage"
          rows={5}
          defaultValue={value("whatsappMessage")}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <p className="hint">
          <code className="font-mono">{"{name}"}</code> becomes the customer’s name, <code className="font-mono">{"{business}"}</code> your business
          name and <code className="font-mono">{"{link}"}</code> your review page.
        </p>
        <p className="mt-4 text-sm text-muted">Preview, for a customer named Ali</p>
        <div className="mt-2 rounded-2xl rounded-tl-md bg-[oklch(95%_0.04_150)] p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {fillMessage(message, { name: "Ali", business: value("name"), link: waLink })}
        </div>
      </Row>

      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-edge pt-6 lg:pl-[calc(min(36%,340px)+48px)]">
        <FormMessage state={state} />
        <SubmitButton pending="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="mt-10 max-w-[1080px] border-t border-edge">
      <Row title="Password" description="Changing it logs you out on every other phone and computer." last>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="current">
              Current password
            </label>
            <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              New password
            </label>
            <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              New password again
            </label>
            <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <SubmitButton pending="Changing…" className="btn btn-secondary btn-sm">
            Change password
          </SubmitButton>
          <FormMessage state={state} />
        </div>
      </Row>
    </form>
  );
}

function Row({ id, title, description, children, last }: { id?: string; title: string; description: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section id={id} className={`grid scroll-mt-6 gap-4 py-7 lg:grid-cols-[min(36%,340px)_minmax(0,1fr)] lg:gap-12 ${last ? "" : "border-b border-edge"} first:pt-0`}>
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
