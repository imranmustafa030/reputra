"use client";

import { useState } from "react";
import { Slip } from "@/components/slip";
import { SignupForm, type PlanOption } from "./signup-form";

// Left (on a phone, the top): the opening line of the owner's own review page, set large on
// black, with their business name filling in as they type. Right (below): the slip.
export function SignupEntry({ plan, plans }: { plan: string; plans: PlanOption[] }) {
  const [name, setName] = useState("");
  const shown = name.trim() || "Your business";

  return (
    <>
      <figure className="entry-statement signup-statement" aria-label={`Your review page will open with: Thank you for visiting ${shown}`}>
        <p className="signup-thanks" aria-hidden="true">
          Thank you for visiting
        </p>
        <p className={`signup-name ${name.trim() ? "" : "is-empty"}`} style={{ "--len": Math.max(shown.length, 8) } as React.CSSProperties} aria-hidden="true">
          {shown}
        </p>
        <div className="entry-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 24 24" style={{ "--i": i } as React.CSSProperties}>
              <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" />
            </svg>
          ))}
        </div>
        <figcaption className="entry-caption">This is the page your customers open when they scan your stand or tap your card.</figcaption>
      </figure>

      <Slip className="entry-slip" labelledBy="signup-title">
        <h1 id="signup-title" className="slip-title">
          Create your account
        </h1>
        <p className="slip-lede">Two minutes. You pay on the next step by JazzCash, Easypaisa, Raast or bank transfer.</p>
        <SignupForm plan={plan} plans={plans} onBusiness={setName} />
      </Slip>
    </>
  );
}
