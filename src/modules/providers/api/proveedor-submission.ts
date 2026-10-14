import { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import type { ProveedorFormValues, ProveedorInput } from "@/modules/providers/api/proveedor.dto";
import type { ProveedorFieldErrors } from "@/modules/providers/api/proveedor.validation";
import { toProveedorPayload } from "@/modules/providers/api/proveedor.validation";

export type ProveedorSubmissionResult<T> =
  | { status: "invalid"; errors: ProveedorFieldErrors }
  | { status: "busy" }
  | { status: "saved"; value: T };

export async function submitValidatedProveedor<T>(
  values: ProveedorFormValues,
  validate: (values: ProveedorFormValues) => ProveedorFieldErrors,
  guard: ReturnType<typeof createInFlightGuard>,
  save: (input: ProveedorInput) => Promise<T>,
  onStart?: () => void,
): Promise<ProveedorSubmissionResult<T>> {
  const errors = validate(values);
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };
  if (!guard.acquire()) return { status: "busy" };
  try {
    onStart?.();
    return { status: "saved", value: await save(toProveedorPayload(values)) };
  } finally {
    guard.release();
  }
}
