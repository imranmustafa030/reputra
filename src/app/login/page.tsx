import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { EntryField } from "@/components/entry-field";
import { Slip } from "@/components/slip";
import { ClimbingRating } from "./climbing-rating";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <EntryField
      tone="amber"
      corner={
        <>
          <span className="hidden sm:inline">New to Reputra? </span>
          <Link href="/signup" className="font-medium underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            Create an account
          </Link>
        </>
      }
    >
      <ClimbingRating />
      <Slip className="entry-slip" labelledBy="login-title">
        <h1 id="login-title" className="slip-title">
          Welcome back
        </h1>
        <p className="slip-lede">See who went on to Google, read private notes, ask on WhatsApp.</p>
        {/* The form reads ?next= from the URL, which is only known at request time. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </Slip>
    </EntryField>
  );
}
