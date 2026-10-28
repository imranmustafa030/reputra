"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/actions/business";
import { FormMessage, SubmitButton } from "@/components/form";
import { fillMessage } from "@/lib/format";
import type { GooglePlace } from "@/lib/google";
import { CATEGORY_NAMES } from "@/lib/labels";
import { GoogleConnect } from "./google-connect";

type Business = {
  name: string;
  category: string;
  city: string;
  googleReviewUrl: string;
  googlePlace: GooglePlace | null;
  whatsappMessage: string;
  description: string;
  introAnimation: boolean;
};
type TextKey = Exclude<keyof Business, "introAnimation" | "googlePlace" | "googleReviewUrl">;

// Settings in rows: what a section is on the left, its fields on the right. One Save for the business.
export function SettingsForm({
  business,
  pageUrl,
  waLink,
  google,
}: {
  business: Business;
  pageUrl: string;
  waLink: string;
  google: { search: boolean; account: boolean };
}) {
  const [state, action] = useActionState(saveSettings, undefined);
  const value = (key: TextKey) => state?.values?.[key] ?? business[key];
  const [message, setMessage] = useState(business.whatsappMessage);
  const [intro, setIntro] = useState(business.introAnimation);
  const [about, setAbout] = useState(business.description);
  const previewHref = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}preview=1`;

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

      <Row id="about" title="About your business" description="A line or two, in your own words. Your review page uses it to suggest what customers can pick when they write their review.">
        <AboutField value={value("description")} onChange={setAbout} length={about.length} />
      </Row>

      <Row id="google" title="Google review link" description="Where “Review us on Google” takes your customers.">
        <GoogleConnect url={business.googleReviewUrl} place={business.googlePlace} search={google.search} account={google.account} />
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

      <Row id="opening" title="Opening animation" description="What a customer sees for the first few seconds after scanning your stand or tapping your card.">
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            role="switch"
            name="introAnimation"
            checked={intro}
            onChange={(e) => setIntro(e.target.checked)}
            className="switch mt-0.5"
          />
          <span>
            <span className="block font-medium">{intro ? "On" : "Off"}</span>
            <span className="mt-1 block text-sm text-muted">
              {intro
                ? "Your page opens with a two-second film of the Reputra tap card, then your name, then the stars. It plays once per visit, customers can tap to skip it, and it never plays on phones set to reduce motion or to save data."
                : "Your page opens straight on the stars."}
            </span>
          </span>
        </label>
        <a href={previewHref} target="_blank" rel="noopener" className="link mt-4 inline-flex text-sm">
          Preview your page
        </a>
      </Row>

      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-edge pt-6 lg:pl-[calc(min(36%,340px)+48px)]">
        <FormMessage state={state} />
        <SubmitButton pending="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}

export const ABOUT_MAX = 400;
export const ABOUT_EXAMPLE = "For example: Family restaurant in Gulberg since 2015. Known for our chicken karahi, fresh naan and quick service. Indoor seating and parking.";

export function AboutField({ value, onChange, length, autoFocus }: { value: string; onChange: (v: string) => void; length: number; autoFocus?: boolean }) {
  return (
    <>
      <label className="label" htmlFor="description">
        Description
      </label>
      <textarea
        className="input"
        id="description"
        name="description"
        rows={3}
        maxLength={ABOUT_MAX}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ABOUT_EXAMPLE}
        aria-describedby="description-hint"
        autoFocus={autoFocus}
      />
      <p id="description-hint" className="hint flex justify-between gap-4">
        <span>What you’re known for: dishes, services, the place. Customers only see the picks, never this text.</span>
        <span className={`num shrink-0 ${length > ABOUT_MAX - 40 ? "text-ink" : ""}`}>
          {length}/{ABOUT_MAX}
        </span>
      </p>
    </>
  );
}

export function Row({ id, title, description, children, last }: { id?: string; title: string; description: string; children: React.ReactNode; last?: boolean }) {
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
