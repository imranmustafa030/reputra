"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Check, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { changePassword } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form";
import { strength } from "@/components/text-field";
import type { FormState } from "@/lib/form-state";

type Mode = "idle" | "editing" | "done";
type Field = "current" | "password" | "confirm";

const EXPO = [0.16, 1, 0.3, 1] as const;
const STRENGTH = ["Too short", "Okay", "Good", "Strong", "Very strong"];

// The three states take turns in one place: the new one rises in while the old one fades out
// faster, and the box between them eases to the new height.
const swap: Variants = {
  enter: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: EXPO,
      staggerChildren: 0.05,
      delayChildren: 0.06,
    },
  },
  leave: {
    opacity: 0,
    y: -4,
    filter: "blur(2px)",
    transition: { duration: 0.18, ease: "easeIn" },
  },
};
const rise: Variants = {
  enter: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } },
};

// Settings' password row. Closed, it says when the password last changed and offers one button;
// open, three stacked boxes that say what they need while you type; done, a drawn tick and the
// promise that every other phone and computer is signed out.
export function PasswordForm({
  email,
  changed,
}: {
  email: string;
  changed: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [values, setValues] = useState<Record<Field, string>>({
    current: "",
    password: "",
    confirm: "",
  });
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({});
  const [general, setGeneral] = useState("");
  const [stamp, setStamp] = useState(0); // a new one per round of problems, so each shakes again
  const refs = {
    current: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  };
  const openButton = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  const [, action] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await changePassword(prev, form);
    if (result?.ok) {
      setMode("done");
      setValues({ current: "", password: "", confirm: "" });
    } else if (result?.error) {
      const field = result.field as Field | undefined;
      if (field && field in refs) {
        report({ [field]: result.error });
      } else {
        setGeneral(result.error);
        setStamp((s) => s + 1);
      }
    }
    return result;
  }, undefined);

  // Opened, the whole form scrolls into view once it has grown (the row sits at the foot of the page).
  // Back from it (Cancel, Escape or done), the cursor returns to the button that opened it.
  useEffect(() => {
    if (mode === "editing") {
      opened.current = true;
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timer = setTimeout(
        () =>
          box.current?.scrollIntoView({
            block: "nearest",
            behavior: still ? "auto" : "smooth",
          }),
        460,
      );
      return () => clearTimeout(timer);
    }
    if (opened.current) openButton.current?.focus();
  }, [mode]);

  function report(found: Partial<Record<Field, string>>) {
    setProblems(found);
    setGeneral("");
    setStamp((s) => s + 1);
    const first = (["current", "password", "confirm"] as const).find(
      (f) => found[f],
    );
    if (first) requestAnimationFrame(() => refs[first].current?.focus());
  }

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (problems[field]) setProblems((p) => ({ ...p, [field]: undefined })); // fixing it clears it
    setGeneral("");
  }

  function open() {
    setProblems({});
    setGeneral("");
    setMode("editing");
  }

  function close() {
    setValues({ current: "", password: "", confirm: "" });
    setMode("idle");
  }

  // Checked here first, so a plain slip never makes a round trip; the server checks again.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const found: Partial<Record<Field, string>> = {};
    if (!values.current) found.current = "Enter your current password.";
    if (values.password.length < 8)
      found.password = "Use at least 8 characters.";
    else if (values.password === values.current)
      found.password = "Pick a new password, not your current one.";
    if (!found.password && values.confirm !== values.password)
      found.confirm = values.confirm
        ? "This doesn’t match the new password."
        : "Type the new password again.";
    if (Object.keys(found).length) {
      e.preventDefault();
      report(found);
    }
  }

  const level = strength(values.password);
  const longEnough = values.password.length >= 8;
  const different =
    values.password.length > 0 && values.password !== values.current;
  const matches =
    values.confirm.length > 0 && values.confirm === values.password;
  const astray =
    !matches &&
    values.confirm.length >= values.password.length &&
    values.confirm.length > 0;

  return (
    <div ref={box} className="scroll-mb-6">
      <AutoHeight>
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === "editing" ? (
            <motion.form
              key="editing"
              action={action}
              onSubmit={onSubmit}
              onKeyDown={(e) => e.key === "Escape" && close()}
              noValidate
              variants={swap}
              initial="enter"
              animate="shown"
              exit="leave"
              className="max-w-[440px]"
            >
              {/* Lets a password manager file the new password under the right login. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={email}
                readOnly
                hidden
              />

              <motion.div variants={rise}>
                <PasswordBox
                  id="current"
                  label="Current password"
                  autoComplete="current-password"
                  value={values.current}
                  onValue={(v) => set("current", v)}
                  problem={problems.current}
                  stamp={stamp}
                  inputRef={refs.current}
                  autoFocus
                />
              </motion.div>

              <motion.div variants={rise} className="mt-5">
                <PasswordBox
                  id="password"
                  label="New password"
                  autoComplete="new-password"
                  value={values.password}
                  onValue={(v) => set("password", v)}
                  problem={problems.password}
                  stamp={stamp}
                  inputRef={refs.password}
                  describedBy="password-rules"
                />
                <div
                  className="pw-meter"
                  data-level={values.password ? level : 0}
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={4}
                  aria-valuenow={values.password ? level : 0}
                  aria-label={`Password strength: ${values.password ? STRENGTH[level] : "empty"}`}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={values.password && i <= level ? "is-on" : ""}
                    />
                  ))}
                  <span className="pw-word">
                    {values.password ? STRENGTH[level] : ""}
                  </span>
                </div>
                <ul
                  id="password-rules"
                  className="mt-2.5 grid gap-1.5 text-[0.8125rem]"
                >
                  <Rule met={longEnough}>At least 8 characters</Rule>
                  <Rule met={different && values.current.length > 0}>
                    Different from your current password
                  </Rule>
                </ul>
              </motion.div>

              <motion.div variants={rise} className="mt-5">
                <PasswordBox
                  id="confirm"
                  label="New password again"
                  autoComplete="new-password"
                  value={values.confirm}
                  onValue={(v) => set("confirm", v)}
                  problem={problems.confirm}
                  stamp={stamp}
                  inputRef={refs.confirm}
                  ok={matches}
                  note={
                    astray
                      ? "Doesn’t match yet."
                      : matches
                        ? "Matches."
                        : undefined
                  }
                  noteTone={matches ? "positive" : "muted"}
                />
              </motion.div>

              <motion.div
                variants={rise}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <SubmitButton
                  pending="Changing…"
                  className="btn btn-sm max-sm:w-full"
                >
                  Change password
                </SubmitButton>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm max-sm:w-full"
                  onClick={close}
                >
                  Cancel
                </button>
                {general && (
                  <p
                    key={`${general}-${stamp}`}
                    aria-live="polite"
                    className="shake flex items-center gap-1.5 text-sm text-negative"
                  >
                    <TriangleAlert
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      strokeWidth={2}
                    />
                    {general}
                  </p>
                )}
              </motion.div>
            </motion.form>
          ) : (
            <motion.div
              key={mode}
              variants={swap}
              initial="enter"
              animate="shown"
              exit="leave"
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4"
            >
              {mode === "done" ? (
                <motion.div
                  variants={rise}
                  className="flex min-w-0 items-start gap-3"
                  role="status"
                >
                  <DrawnTick />
                  <div className="min-w-0">
                    <p className="font-medium text-positive-ink">
                      Password changed
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      Every other phone and computer is signed out. You stay
                      logged in here.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div variants={rise} className="min-w-0">
                  <p
                    aria-label="Password set"
                    className="text-xl leading-6 tracking-[0.18em] text-ink-3 select-none"
                  >
                    ••••••••••
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{changed}</p>
                </motion.div>
              )}
              <motion.div variants={rise} className="max-sm:w-full">
                <button
                  ref={openButton}
                  type="button"
                  className="btn btn-secondary btn-sm max-sm:w-full"
                  onClick={open}
                >
                  {mode === "done" ? "Change again" : "Change password"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoHeight>
    </div>
  );
}

// A dashboard-sized password box (44px, like every input here) with show and hide inside it,
// a tick when it's right, and its problem or note on the line below.
function PasswordBox({
  id,
  label,
  value,
  onValue,
  problem,
  stamp,
  inputRef,
  ok,
  note,
  noteTone = "muted",
  describedBy,
  ...input
}: {
  id: Field;
  label: string;
  value: string;
  onValue: (v: string) => void;
  problem?: string;
  stamp: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  ok?: boolean;
  note?: string;
  noteTone?: "muted" | "positive";
  describedBy?: string;
} & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "autoComplete" | "autoFocus"
>) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={shown ? "text" : "password"}
          className="input pr-[84px]"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-invalid={problem ? true : undefined}
          aria-describedby={[`${id}-note`, describedBy]
            .filter(Boolean)
            .join(" ")}
          spellCheck={false}
          autoCapitalize="off"
          {...input}
        />
        <span className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          <AnimatePresence>
            {ok && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 520, damping: 28 },
                }}
                exit={{
                  scale: 0.6,
                  opacity: 0,
                  transition: { duration: 0.12 },
                }}
                className="grid size-9 place-items-center text-positive"
              >
                <Check
                  aria-hidden="true"
                  className="size-[18px]"
                  strokeWidth={2.75}
                />
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
            onClick={() => setShown((s) => !s)}
            aria-label={
              shown
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            aria-pressed={shown}
          >
            {shown ? (
              <EyeOff
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={1.75}
              />
            ) : (
              <Eye
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={1.75}
              />
            )}
          </button>
        </span>
      </div>
      <p
        id={`${id}-note`}
        aria-live="polite"
        className="min-h-0 text-sm empty:hidden"
      >
        {problem ? (
          <span
            key={`${problem}-${stamp}`}
            className="shake mt-1.5 flex items-center gap-1.5 font-medium text-negative"
          >
            <TriangleAlert
              aria-hidden="true"
              className="size-4 shrink-0"
              strokeWidth={2.25}
            />
            {problem}
          </span>
        ) : note ? (
          <span
            className={`mt-1.5 block ${noteTone === "positive" ? "font-medium text-positive" : "text-muted"}`}
          >
            {note}
          </span>
        ) : null}
      </p>
    </div>
  );
}

// One requirement under the new password: a hollow ring that fills with a tick once it's met.
function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 transition-colors duration-200 ${met ? "text-positive-ink" : "text-muted"}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-4 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-200 ${
          met ? "border-positive bg-positive" : "border-control bg-sheet"
        }`}
      >
        <AnimatePresence initial={false}>
          {met && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                transition: { type: "spring", stiffness: 600, damping: 26 },
              }}
              exit={{ scale: 0, transition: { duration: 0.1 } }}
            >
              <Check className="size-2.5 text-white" strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {children}
      <span className="sr-only">{met ? "(done)" : "(not yet)"}</span>
    </li>
  );
}

// The tick draws itself once, the way a pen would.
function DrawnTick() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-0.5 size-6 shrink-0 text-positive"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: 0.35,
          transition: { duration: 0.5, ease: EXPO, delay: 0.1 },
        }}
      />
      <motion.path
        d="m7.5 12.5 3 3 6-6.5"
        initial={{ pathLength: 0 }}
        animate={{
          pathLength: 1,
          transition: { duration: 0.36, ease: EXPO, delay: 0.38 },
        }}
      />
    </svg>
  );
}

// Eases its height to whatever its content measures, so a state change grows or shrinks the row
// instead of jumping. A little inner padding keeps focus rings from being clipped.
function AutoHeight({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0]?.blockSize ?? el.offsetHeight),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div
      className="relative -m-1 overflow-hidden"
      animate={{ height }}
      transition={{ duration: 0.42, ease: EXPO }}
    >
      <div ref={inner} className="relative p-1">
        {children}
      </div>
    </motion.div>
  );
}
