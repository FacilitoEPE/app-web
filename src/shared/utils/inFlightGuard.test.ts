import { describe, expect, it } from "vitest";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";

describe("createInFlightGuard", () => {
  it("allows one operation at a time and can be released", () => {
    const guard = createInFlightGuard();

    expect(guard.acquire()).toBe(true);
    expect(guard.isInFlight).toBe(true);
    expect(guard.acquire()).toBe(false);

    guard.release();
    expect(guard.isInFlight).toBe(false);
    expect(guard.acquire()).toBe(true);
  });
});
