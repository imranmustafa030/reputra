// What a form's server action returns. `values` hands typed fields back on an error,
// because React resets a form after its action runs.
export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

export function keep(form: FormData, ...names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(form.get(name) ?? "")]));
}
