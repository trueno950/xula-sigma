import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { esquemaDePayloadDeCalle, publicarActualizacion } from "./notificar";

const ayuntamientoId = "11111111-1111-4111-8111-111111111111" as AyuntamientoId;
const payload = {
  tipo: "calle",
  id: "33333333-3333-4333-8333-333333333333",
  cambio: "estructura",
} as const;

const transaccionFalsa = () =>
  ({ execute: vi.fn() }) as unknown as TransaccionTenant;

describe("esquema de payload de calle", () => {
  it("acepta exactamente los tres campos del contrato", () => {
    expect(esquemaDePayloadDeCalle.parse(payload)).toEqual(payload);
  });

  it("rechaza un campo faltante", () => {
    const sinCambio = { tipo: payload.tipo, id: payload.id };

    expect(esquemaDePayloadDeCalle.safeParse(sinCambio).success).toBe(false);
  });

  it("rechaza un campo extra aunque los tres validos esten", () => {
    const conNombre = { ...payload, nombre: "Calle 21" };

    expect(esquemaDePayloadDeCalle.safeParse(conNombre).success).toBe(false);
  });

  it("rechaza un id que no es UUID", () => {
    const conIdInvalido = { ...payload, id: "calle-1" };

    expect(esquemaDePayloadDeCalle.safeParse(conIdInvalido).success).toBe(
      false,
    );
  });
});

describe("publicarActualizacion", () => {
  it("valida y ejecuta pg_notify una vez en la transaccion recibida", async () => {
    const tx = transaccionFalsa();

    await publicarActualizacion(tx, ayuntamientoId, payload);

    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it("rechaza un payload invalido sin ejecutar nada", async () => {
    const tx = transaccionFalsa();
    const invalido = { ...payload, extra: true } as unknown as typeof payload;

    await expect(
      publicarActualizacion(tx, ayuntamientoId, invalido),
    ).rejects.toThrow();

    expect(tx.execute).not.toHaveBeenCalled();
  });
});
