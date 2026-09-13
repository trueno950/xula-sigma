import { describe, expect, it } from "vitest";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { canalDeTenant } from "./canales";

describe("canalDeTenant", () => {
  it("deriva el canal del tenant con el formato canonico", () => {
    const motul = comoAyuntamientoId("11111111-1111-4111-8111-111111111111");

    expect(canalDeTenant(motul)).toBe(
      "xula_sse_11111111-1111-4111-8111-111111111111",
    );
  });

  it("dos tenants distintos no comparten canal", () => {
    const motul = comoAyuntamientoId("11111111-1111-4111-8111-111111111111");
    const ticul = comoAyuntamientoId("22222222-2222-4222-8222-222222222222");

    expect(canalDeTenant(motul)).not.toBe(canalDeTenant(ticul));
  });
});
