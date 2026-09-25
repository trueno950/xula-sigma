import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  esquemaDePayload,
  esquemaDePayloadDeCalle,
  esquemaDePayloadDeIntervencion,
  esquemaDePayloadDeReporte,
  publicarActualizacion,
} from "./notificar";

const ayuntamientoId = "11111111-1111-4111-8111-111111111111" as AyuntamientoId;
const payload = {
  tipo: "calle",
  id: "33333333-3333-4333-8333-333333333333",
  cambio: "estructura",
} as const;

const idDeEntidad = "44444444-4444-4444-8444-444444444444";

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

describe("esquema de payload de reporte", () => {
  it.each(["alta", "estado", "area"])(
    "acepta el cambio %s con exactamente tipo, id y cambio",
    (cambio) => {
      const payloadDeReporte = { tipo: "reporte", id: idDeEntidad, cambio };

      expect(esquemaDePayloadDeReporte.parse(payloadDeReporte)).toEqual(
        payloadDeReporte,
      );
    },
  );

  it.each([
    ["un cambio fuera del vocabulario", { cambio: "cancelacion" }],
    ["un cambio del vocabulario de intervencion", { cambio: "correccion" }],
    ["un cambio del vocabulario de calle", { cambio: "estructura" }],
    ["una clave extra con el tenant", { ayuntamientoId: ayuntamientoId }],
    ["una clave extra con texto libre", { descripcion: "Bache grande" }],
    ["un id que no es UUID", { id: "reporte-1" }],
  ])("rechaza %s", (_caso, alteracion) => {
    const candidato = {
      tipo: "reporte",
      id: idDeEntidad,
      cambio: "alta",
      ...alteracion,
    };

    expect(esquemaDePayloadDeReporte.safeParse(candidato).success).toBe(false);
  });
});

describe("esquema de payload de intervencion", () => {
  it.each(["alta", "estado", "correccion"])(
    "acepta el cambio %s con exactamente tipo, id y cambio",
    (cambio) => {
      const payloadDeIntervencion = {
        tipo: "intervencion",
        id: idDeEntidad,
        cambio,
      };

      expect(
        esquemaDePayloadDeIntervencion.parse(payloadDeIntervencion),
      ).toEqual(payloadDeIntervencion);
    },
  );

  it.each([
    ["un cambio fuera del vocabulario", { cambio: "baja" }],
    ["un cambio del vocabulario de reporte", { cambio: "area" }],
    ["una clave extra con coordenadas", { latitud: 20.9 }],
    ["un id que no es UUID", { id: "intervencion-1" }],
  ])("rechaza %s", (_caso, alteracion) => {
    const candidato = {
      tipo: "intervencion",
      id: idDeEntidad,
      cambio: "alta",
      ...alteracion,
    };

    expect(esquemaDePayloadDeIntervencion.safeParse(candidato).success).toBe(
      false,
    );
  });
});

describe("union de payloads", () => {
  it("el payload de calle sigue valido y no cambia", () => {
    expect(esquemaDePayload.parse(payload)).toEqual(payload);
  });

  it.each([
    { tipo: "reporte", id: idDeEntidad, cambio: "estado" },
    { tipo: "intervencion", id: idDeEntidad, cambio: "correccion" },
  ])("acepta el payload de $tipo", (payloadValido) => {
    expect(esquemaDePayload.parse(payloadValido)).toEqual(payloadValido);
  });

  it.each([
    [
      "un tipo desconocido",
      { tipo: "persona", id: idDeEntidad, cambio: "alta" },
    ],
    [
      "un cambio de calle en un reporte",
      { tipo: "reporte", id: idDeEntidad, cambio: "estructura" },
    ],
    [
      "un cambio de reporte en una calle",
      { tipo: "calle", id: idDeEntidad, cambio: "alta" },
    ],
    [
      "una clave extra en una intervencion",
      { tipo: "intervencion", id: idDeEntidad, cambio: "alta", nombre: "x" },
    ],
  ])("rechaza %s", (_caso, candidato) => {
    expect(esquemaDePayload.safeParse(candidato).success).toBe(false);
  });
});

describe("publicarActualizacion con la union ampliada", () => {
  it.each([
    { tipo: "reporte", id: idDeEntidad, cambio: "area" },
    { tipo: "intervencion", id: idDeEntidad, cambio: "estado" },
  ] as const)(
    "ejecuta pg_notify una vez con un payload de $tipo",
    async (p) => {
      const tx = transaccionFalsa();

      await publicarActualizacion(tx, ayuntamientoId, p);

      expect(tx.execute).toHaveBeenCalledTimes(1);
    },
  );

  it("rechaza un cambio fuera del vocabulario sin ejecutar nada", async () => {
    const tx = transaccionFalsa();
    const invalido = {
      tipo: "reporte",
      id: idDeEntidad,
      cambio: "cancelacion",
    } as unknown as Parameters<typeof publicarActualizacion>[2];

    await expect(
      publicarActualizacion(tx, ayuntamientoId, invalido),
    ).rejects.toThrow();

    expect(tx.execute).not.toHaveBeenCalled();
  });
});
