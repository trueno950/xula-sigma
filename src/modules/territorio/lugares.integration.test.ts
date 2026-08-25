import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeLugar } from "./application/altaDeLugar";
import { crearReparentearLugar } from "./application/reparentearLugar";
import {
  comoDomicilioId,
  comoLugarId,
  JerarquiaInvalidaError,
  type LugarId,
} from "./domain";
import {
  calles,
  domicilios,
  lugares,
  residencias,
} from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";

const contextoDe = (): ContextoActual => ({
  ayuntamientoId: motul,
  usuario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rol: "ADMIN_MUNICIPAL",
  },
  origen: "web",
});

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const crearLugar = (
  tipo: (typeof lugares.$inferInsert)["tipo"],
  nombre: string,
  padreId?: LugarId,
) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .insert(lugares)
      .values({ ayuntamientoId: motul, tipo, nombre, padreId })
      .returning({ id: lugares.id });
    return comoLugarId(fila!.id);
  });

const crearDomicilio = (lugarId: LugarId, nombreCalle: string) =>
  withTenant(motul, async (tx) => {
    const [calle] = await tx
      .insert(calles)
      .values({ ayuntamientoId: motul, nombre: nombreCalle, lugarId })
      .returning({ id: calles.id });
    const [domicilio] = await tx
      .insert(domicilios)
      .values({ ayuntamientoId: motul, lugarId, calleId: calle!.id })
      .returning({ id: domicilios.id });
    return comoDomicilioId(domicilio!.id);
  });

describe("subarbol", () => {
  it("un sector con dos manzanas y un domicilio colgado directo del sector devuelve las tres filas", async () => {
    const comisaria = await crearLugar("comisaria", "Dzununcan");
    const sector = await crearLugar("sector", "Sector 3", comisaria);
    await crearLugar("manzana", "Manzana 1", sector);
    await crearLugar("manzana", "Manzana 2", sector);
    await crearDomicilio(sector, "Calle del sector");

    const nodos = await withTenant(motul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, sector),
    );

    expect(nodos).toHaveLength(3);
    expect(nodos.filter((nodo) => nodo.clase === "lugar")).toHaveLength(2);
    expect(nodos.filter((nodo) => nodo.clase === "domicilio")).toHaveLength(1);
  });
});

describe("altaDeLugar", () => {
  it("rechaza un padre dado de baja como si no existiera", async () => {
    const comisaria = await crearLugar("comisaria", "Dzitya");
    const [sector] = await withTenant(motul, async (tx) => {
      const [fila] = await tx
        .insert(lugares)
        .values({
          ayuntamientoId: motul,
          tipo: "sector",
          nombre: "Sector cerrado",
          padreId: comisaria,
        })
        .returning({ id: lugares.id });
      await tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, fila!.id));
      return [comoLugarId(fila!.id)];
    });

    const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);

    await expect(
      altaDeLugar(
        { tipo: "manzana", nombre: "Manzana huerfana", padreId: sector! },
        contextoDe(),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
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
