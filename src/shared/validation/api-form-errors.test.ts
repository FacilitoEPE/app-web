import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getBadRequestFieldErrors, getZodFieldErrors } from "@/shared/validation/api-form-errors";

describe("API form errors", () => {
  it("maps Zod issues to the corresponding input field", () => {
    const result = z.object({ email: z.string().email("Correo inválido") }).safeParse({ email: "bad" });
    if (result.success) throw new Error("expected validation error");
    expect(getZodFieldErrors(result.error)).toEqual({ email: "Correo inválido" });
  });

  it("maps Nest bad request messages to frontend fields", () => {
    expect(getBadRequestFieldErrors({ statusCode: 400, message: ["correoCorporativo must be an email"] }, {
      correoCorporativo: "email",
    })).toEqual({ email: "correoCorporativo must be an email" });
  });

  it("keeps unrecognized bad request messages as a form-level error", () => {
    expect(getBadRequestFieldErrors({ statusCode: 400, message: ["Invalid request"] }, {})).toEqual({
      _form: "Invalid request",
    });
  });

  it("handles 413 Request Entity Too Large error gracefully", () => {
    expect(getBadRequestFieldErrors("<html>413 Request Entity Too Large</html>", {})).toEqual({
      _form: "El archivo adjunto supera el tamaño máximo permitido (máx. 10 MB).",
    });

    expect(getBadRequestFieldErrors({ statusCode: 413, error: "Payload Too Large" }, {})).toEqual({
      _form: "El archivo adjunto supera el tamaño máximo permitido (máx. 10 MB).",
    });
  });
});
