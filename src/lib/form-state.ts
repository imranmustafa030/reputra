// What a form's server action returns. `values` hands typed fields back on an error,
// because React resets a form after its action runs. `field` names the first input at fault and
// `errors` holds one message per faulty input, so a form can mark every problem at once.
export type FormState =
  | { error?: string; ok?: string; field?: string; errors?: Record<string, string>; values?: Record<string, string>; n?: number }
  | undefined;

// Every zod issue as { field: message }, first issue per field, in the schema's order.
export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function keep(form: FormData, ...names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(form.get(name) ?? "")]));
}
