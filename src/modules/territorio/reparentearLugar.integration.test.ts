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
import { JerarquiaInvalidaError } from "./domain";
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

describe("reparentearLugar", () => {
  it("una colonia no puede reparentarse a su propio sector: el rango lo rechaza (ciclo de largo 2)", async () => {
    const comisaria = await crearLugar("comisaria", "Yotholin");
    const colonia = await crearLugar("colonia", "Colonia X", comisaria);
    const sector = await crearLugar("sector", "Sector Y", colonia);

    const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);

    await expect(
      reparentearLugar(colonia, sector, contextoDe()),
    ).rejects.toBeInstanceOf(JerarquiaInvalidaError);

    const [lugarSinMover] = await withTenant(motul, (tx) =>
      tx
        .select({ padreId: lugares.padreId })
        .from(lugares)
        .where(eq(lugares.id, colonia)),
    );
    expect(lugarSinMover?.padreId).toBe(comisaria);
  });

  it("reparentear no toca conteo ni xmin de domicilios/residencias, y el subarbol del nuevo padre los incluye", async () => {
    const comisariaOrigen = await crearLugar("comisaria", "Comisaria origen");
    const comisariaDestino = await crearLugar("comisaria", "Comisaria destino");
    const sector = await crearLugar("sector", "Sector movido", comisariaOrigen);
    const manzana = await crearLugar("manzana", "Manzana movida", sector);
    const domicilioId = await crearDomicilio(manzana, "Calle movida");

    const { id: personaId } = await altaDePersona(
      {
        nombres: "Ana",
        primerApellido: "Chan",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(),
    );
    await withTenant(motul, (tx) =>
      tx.insert(residencias).values({
        ayuntamientoId: motul,
        personaId,
        domicilioId,
        desdeEn: "2024-01-01",
      }),
    );

    const xminDeDomicilio = (id: typeof domicilios.$inferSelect.id) =>
      withTenant(motul, async (tx) => {
        const [fila] = await tx
          .select({ xmin: sql<string>`xmin::text` })
          .from(domicilios)
          .where(eq(domicilios.id, id));
        return fila?.xmin;
      });
    const xminDeResidencia = (id: typeof residencias.$inferSelect.id) =>
      withTenant(motul, async (tx) => {
        const [fila] = await tx
          .select({ xmin: sql<string>`xmin::text` })
          .from(residencias)
          .where(eq(residencias.id, id));
        return fila?.xmin;
      });

    const conteoDomicilios = () =>
      withTenant(motul, (tx) =>
        tx.select().from(domicilios).where(eq(domicilios.lugarId, manzana)),
      );
    const conteoResidencias = () =>
      withTenant(motul, (tx) =>
        tx
          .select()
          .from(residencias)
          .where(eq(residencias.domicilioId, domicilioId)),
      );

    const domiciliosAntes = await conteoDomicilios();
    const residenciasAntes = await conteoResidencias();
    const xminDomicilioAntes = await xminDeDomicilio(domicilioId);
    const xminResidenciaAntes = await xminDeResidencia(residenciasAntes[0]!.id);

    const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);
    await reparentearLugar(sector, comisariaDestino, contextoDe());

    const domiciliosDespues = await conteoDomicilios();
    const residenciasDespues = await conteoResidencias();
    const xminDomicilioDespues = await xminDeDomicilio(domicilioId);
    const xminResidenciaDespues = await xminDeResidencia(
      residenciasAntes[0]!.id,
    );

    expect(domiciliosDespues).toHaveLength(domiciliosAntes.length);
    expect(residenciasDespues).toHaveLength(residenciasAntes.length);
    expect(xminDomicilioDespues).toBe(xminDomicilioAntes);
    expect(xminResidenciaDespues).toBe(xminResidenciaAntes);

    const subarbolNuevoPadre = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, comisariaDestino),
    );
    expect(
      subarbolNuevoPadre.some(
        (nodo) => nodo.clase === "domicilio" && nodo.id === domicilioId,
      ),
    ).toBe(true);
  });
});
