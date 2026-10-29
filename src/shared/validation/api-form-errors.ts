import { ZodError } from "zod";

export type FormFieldErrors = Record<string, string | undefined>;

export function getZodFieldErrors(error: ZodError): FormFieldErrors {
  return error.issues.reduce<FormFieldErrors>((errors, issue) => {
    const key = issue.path.join(".") || "_form";
    errors[key] ??= issue.message;
    return errors;
  }, {});
}

/** Extracts Nest/class-validator 400 messages and maps backend DTO properties to UI field names. */
export function getBadRequestFieldErrors(
  error: unknown,
  backendToFormField: Record<string, string>,
): FormFieldErrors {
  const body = asRecord(error);
  const messages = Array.isArray(body?.message)
    ? body.message.filter((message): message is string => typeof message === "string")
    : typeof body?.message === "string" ? [body.message] : [];
  const result: FormFieldErrors = {};
  const fields = asRecord(body?.fieldErrors);
  if (fields && Object.keys(fields).length) {
    for (const [property, message] of Object.entries(fields)) {
      if (typeof message !== 'string') continue;
      const field = backendToFormField[property] ?? '_form';
      result[field] = result[field] ? `${result[field]} ${message}` : message;
    }
    return result;
  }

  for (const message of messages) {
    const property = Object.keys(backendToFormField).find((key) =>
      new RegExp(`(^|[^\\w])${escapeRegExp(key)}([^\\w]|$)`, "i").test(message),
    );
    const field = property ? backendToFormField[property] : "_form";
    result[field] = result[field] ? `${result[field]} ${message}` : message;
  }

  if (!messages.length) {
    const fallback = typeof body?.error === "string" ? body.error : "La solicitud contiene datos no válidos.";
    result._form = fallback;
  }
  return result;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
