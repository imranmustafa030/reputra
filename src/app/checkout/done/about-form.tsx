"use client";

import { useActionState, useState } from "react";
import { saveDescription } from "@/app/actions/business";
import { FormMessage, SubmitButton } from "@/components/form";
import { AboutField } from "@/app/dashboard/settings/settings-form";

// Asked once, straight after the first payment, while the owner is still here: a line or two
// about the business, so the review page can suggest what customers pick. Settings has it too.
export function AboutForm({ initial }: { initial: string }) {
  const [state, action] = useActionState(saveDescription, undefined);
  const [length, setLength] = useState(initial.length);
  const value = state?.values?.description ?? initial;

  return (
    <form action={action} className="panel mt-8 p-5">
      <h2 className="font-semibold">Tell customers what you’re known for</h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        When a customer leaves a review, we suggest what they can tap (“Tasty karahi”, “Quick service”) and write it up in their words. A line or two
        about your place makes those suggestions yours.
      </p>
      <AboutField value={value} onChange={(v) => setLength(v.length)} length={length} />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <SubmitButton pending="Saving…">Save</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
