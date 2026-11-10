import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getFrutaDerivadas } from "@/modules/campaigns/api/campaign.api";

describe("getFrutaDerivadas", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("lee los derivados del ID de fruta provisto y devuelve la respuesta", async () => {
    const derivadas = [{ frutaDerivadaId: 10, name: "Mango Kent", frutaId: 3, createdAt: "", updatedAt: "" }];
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: derivadas } as never);

    await expect(getFrutaDerivadas(3)).resolves.toEqual(derivadas);
    expect(get).toHaveBeenCalledWith("/v1/frutas/3/derivadas");
  });
});
