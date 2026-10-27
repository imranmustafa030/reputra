import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { markNotesSeen } from "@/app/actions/business";
import { PageHeader } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { toWhatsAppNumber } from "@/lib/format";
import { formatWhen } from "@/lib/labels";
import { getFeedback, SOURCE_LABELS } from "@/lib/stats";
import { SeenMarker } from "./seen-marker";

export const metadata: Metadata = { title: "Private notes" };

export default async function FeedbackPage() {
  const { business } = await requirePaidOwner();
  const notes = await getFeedback(business.id);
  const unread = notes.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Private notes"
        lede={
          notes.length === 0
            ? "What customers tell you directly instead of posting."
            : unread
              ? `${unread} new. A fixed problem, answered quickly, often turns into a good review.`
              : `${notes.length} ${notes.length === 1 ? "note" : "notes"}. A fixed problem, answered quickly, often turns into a good review.`
        }
      />
      {unread > 0 && <SeenMarker action={markNotesSeen} />}

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-control px-6 py-10 text-center">
          <p className="font-medium">No private notes yet</p>
          <p className="mx-auto mt-1.5 max-w-[48ch] text-sm text-muted">
            Your review page has a “Tell the owner privately” option next to the Google button. Anything a customer sends there lands here.
          </p>
        </div>
      ) : (
        <ul className="stagger panel max-w-[860px] px-5 sm:px-6">
          {notes.map((note, i) => {
            const wa = note.phone ? toWhatsAppNumber(note.phone) : null;
            return (
              <li key={note.id} className={`py-5 ${i ? "border-t border-rule" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{note.name || "No name given"}</span>
                  <span className="text-muted">
                    {SOURCE_LABELS[note.source] ?? "Plain link"} ·{" "}
                    <time dateTime={new Date(note.createdAt).toISOString()}>{formatWhen(note.createdAt)}</time>
                  </span>
                  {!note.read && <span className="pill pill-amber">New</span>}
                </div>
                <p className="mt-2 max-w-[70ch] leading-relaxed whitespace-pre-wrap">{note.message}</p>
                {wa && (
                  <a className="btn btn-secondary btn-sm mt-3" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                    <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    Reply on WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
