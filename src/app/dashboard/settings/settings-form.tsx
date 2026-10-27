"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/business";
import { FormMessage, SubmitButton } from "@/components/form";

type Props = {
  business: { name: string; googleReviewUrl: string; whatsappMessage: string };
  pageUrl: string;
};

export function SettingsForm({ business, pageUrl }: Props) {
  const [state, action] = useActionState(saveSettings, undefined);
  const value = (key: keyof Props["business"]) => state?.values?.[key] ?? business[key];

  return (
    <form action={action} className="panel grid max-w-[720px] gap-6 p-5 md:p-8">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input className="input" id="name" name="name" defaultValue={value("name")} required />
        <p className="hint">
          Your review page: <span className="text-ink">{pageUrl}</span>. The address stays the same, so printed stands keep working.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="googleReviewUrl">Google review link</label>
        <input
          className="input"
          id="googleReviewUrl"
          name="googleReviewUrl"
          type="url"
          inputMode="url"
          defaultValue={value("googleReviewUrl")}
          placeholder="https://g.page/r/…/review"
        />
        <p className="hint">
          In Google Maps, open your business profile, tap “Ask for reviews” (or “Share review form”) and copy the link.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="whatsappMessage">WhatsApp message</label>
        <textarea className="input" id="whatsappMessage" name="whatsappMessage" rows={5} defaultValue={value("whatsappMessage")} required />
        <p className="hint">
          <code>{"{name}"}</code> becomes the customer’s name, <code>{"{business}"}</code> your business name and <code>{"{link}"}</code> your
          review page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending="Saving…">Save changes</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
