import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// `padron` no reexporta `infrastructure` desde su barrel (verificado en
// `padron/index.ts` y asegurado por `padron/superficiePublica.test.ts`):
// su tabla `personas` es inalcanzable fuera del modulo sin saltarse esa
// frontera. `altaDePersona` es el caso de uso publico que sirve para
// sembrar la persona que necesita esta prueba de reparenteo.
import { altaDePersona } from "@/modules/padron";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearReparentearLugar } from "./application/reparentearLugar";
import { JerarquiaInvalidaError, LugarConDomiciliosError } from "./domain";
import { domicilios, lugares, residencias } from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);

const padreDe = (id: typeof lugares.$inferSelect.id) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .select({ padreId: lugares.padreId })
      .from(lugares)
      .where(eq(lugares.id, id));
    return fila?.padreId;
  });

const xminDe = (tabla: typeof domicilios | typeof residencias, id: string) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .select({ xmin: sql<string>`xmin::text` })
      .from(tabla)
      .where(sql`${tabla.id} = ${id}`);
    return fila?.xmin;
  });

describe("reparentearLugar", () => {
  it("un asentamiento no puede reparentarse bajo una colonia: el rango lo rechaza", async () => {
    const comisaria = await crearLugar("comisaria", "Yotholin");
    const colonia = await crearLugar("colonia", "Colonia X", comisaria);

    await expect(
      reparentearLugar(comisaria, colonia, contextoDe()),
    ).rejects.toBeInstanceOf(JerarquiaInvalidaError);

    const [lugarSinMover] = await withTenant(motul, (tx) =>
      tx
        .select({ padreId: lugares.padreId })
        .from(lugares)
        .where(eq(lugares.id, comisaria)),
    );
    expect(lugarSinMover?.padreId).toBeNull();
  });

  it("rechaza mover a otro asentamiento una colonia con domicilios, sin tocar la colonia, sus domicilios ni sus residencias", async () => {
    const comisariaOrigen = await crearLugar("comisaria", "Comisaria origen");
    const comisariaDestino = await crearLugar("comisaria", "Comisaria destino");
    const colonia = await crearLugar(
      "colonia",
      "Colonia movida",
      comisariaOrigen,
    );
    const domicilioId = await crearDomicilio(colonia, "Calle movida");

    const { id: personaId } = await altaDePersona(
      {
        nombres: "Ana",
        primerApellido: "Chan",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(),
    );
    const [residenciaCreada] = await withTenant(motul, (tx) =>
      tx
        .insert(residencias)
        .values({
          ayuntamientoId: motul,
          personaId,
          domicilioId,
          desdeEn: "2024-01-01",
        })
        .returning({ id: residencias.id }),
    );
    if (!residenciaCreada) throw new Error("La residencia no fue creada.");
    const residencia = residenciaCreada.id;

    const xminDomicilioAntes = await xminDe(domicilios, domicilioId);
    const xminResidenciaAntes = await xminDe(residencias, residencia);

    await expect(
      reparentearLugar(colonia, comisariaDestino, contextoDe()),
    ).rejects.toBeInstanceOf(LugarConDomiciliosError);

    expect(await padreDe(colonia)).toBe(comisariaOrigen);
    expect(await xminDe(domicilios, domicilioId)).toBe(xminDomicilioAntes);
    expect(await xminDe(residencias, residencia)).toBe(xminResidenciaAntes);
  });

  it("una colonia sin domicilios si se mueve a otro asentamiento", async () => {
    const comisariaOrigen = await crearLugar("comisaria", "Origen vacio");
    const comisariaDestino = await crearLugar("comisaria", "Destino vacio");
    const colonia = await crearLugar(
      "colonia",
      "Colonia vacia",
      comisariaOrigen,
    );

    await reparentearLugar(colonia, comisariaDestino, contextoDe());

    expect(await padreDe(colonia)).toBe(comisariaDestino);
  });

  it("dentro del mismo asentamiento una colonia con domicilios se puede volver a colgar", async () => {
    const comisaria = await crearLugar("comisaria", "Mismo asentamiento");
    const colonia = await crearLugar("colonia", "Colonia quieta", comisaria);
    await crearDomicilio(colonia, "Calle quieta");

    await reparentearLugar(colonia, comisaria, contextoDe());

    expect(await padreDe(colonia)).toBe(comisaria);
  });
});
