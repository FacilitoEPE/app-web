import { describe, expect, it, vi } from "vitest";
import { submitValidatedProveedor } from "@/modules/providers/api/proveedor-submission";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import type { ProveedorFormValues } from "@/modules/providers/api/proveedor.dto";

const validInput: ProveedorFormValues = {
  nombres: "Ana",
  apellido: "Pérez",
  tipoDocumento: "DNI",
  nmrDocumento: "12345678",
  identidadDocUrl: "https://example.com/id.pdf",
  zona: "Piura",
  telefono: "987654321",
  email: "ana@example.com",
  codigoLugarProduccion: "42",
  estadoSanidadAgraria: "Registrado",
  identidadDocArchivo: null,
  frutas: [],
};

describe("provider submission", () => {
  it("validates before acquiring the guard or calling the API", async () => {
    const guard = createInFlightGuard();
    const save = vi.fn();
    const validate = vi.fn(() => ({ nombres: "Required" }));

    await expect(submitValidatedProveedor(validInput, validate, guard, save)).resolves.toMatchObject({ status: "invalid" });
    expect(guard.isInFlight).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it("locks concurrent saves and releases the guard after success or failure", async () => {
    const guard = createInFlightGuard();
    let resolveSave!: (value: string) => void;
    const save = vi.fn(() => new Promise<string>((resolve) => { resolveSave = resolve; }));
    const validate = vi.fn(() => ({}));
    const first = submitValidatedProveedor(validInput, validate, guard, save);

    await expect(submitValidatedProveedor(validInput, validate, guard, save)).resolves.toEqual({ status: "busy" });
    expect(save).toHaveBeenCalledTimes(1);
    resolveSave("saved");
    await expect(first).resolves.toEqual({ status: "saved", value: "saved" });
    expect(guard.isInFlight).toBe(false);
  });

  it("releases the guard after a rejected save so the user can retry", async () => {
    const guard = createInFlightGuard();
    const save = vi.fn().mockRejectedValueOnce(new Error("API unavailable")).mockResolvedValueOnce("saved");
    const validate = vi.fn(() => ({}));

    await expect(submitValidatedProveedor(validInput, validate, guard, save)).rejects.toThrow("API unavailable");
    expect(guard.isInFlight).toBe(false);
    await expect(submitValidatedProveedor(validInput, validate, guard, save)).resolves.toEqual({ status: "saved", value: "saved" });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("does not submit while the shared provider mutation lock is held by another operation", async () => {
    const guard = createInFlightGuard();
    const save = vi.fn();
    expect(guard.acquire()).toBe(true);

    await expect(submitValidatedProveedor(validInput, () => ({}), guard, save)).resolves.toEqual({ status: "busy" });
    expect(save).not.toHaveBeenCalled();
    guard.release();
  });
});
