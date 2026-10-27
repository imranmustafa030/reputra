import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth";
import { formatDate, toWhatsAppNumber } from "@/lib/format";
import { getFeedback, SOURCE_LABELS } from "@/lib/stats";

export const metadata: Metadata = { title: "Private notes" };

export default async function FeedbackPage() {
  const { business } = await requireOwner();
  const notes = await getFeedback(business.id);

  return (
    <>
      <PageHeader
        title="Private notes"
        lede="What customers chose to tell you directly instead of posting. Reply quickly: a fixed problem often turns into a good review."
      />
      {notes.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-medium">No private notes yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-sm text-stone">
            Every review page has a “Tell the owner privately” option. Anything sent there appears here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => {
            const wa = note.phone ? toWhatsAppNumber(note.phone) : null;
            return (
              <li key={note.id} className="panel p-5 md:p-6">
                <p className="leading-relaxed whitespace-pre-wrap">{note.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone">
                  <span className="font-medium text-ink">{note.name || "Anonymous"}</span>
                  <span>{SOURCE_LABELS[note.source] ?? "Direct link"}</span>
                  <time dateTime={new Date(note.createdAt).toISOString()}>{formatDate(note.createdAt)}</time>
                  {wa && (
                    <a className="ml-auto font-medium text-ink underline underline-offset-4" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                      Reply on WhatsApp
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
