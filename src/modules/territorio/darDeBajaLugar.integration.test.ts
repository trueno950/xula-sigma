import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaLugar } from "./application/darDeBajaLugar";
import {
  LugarConCallesError,
  LugarConDependientesError,
  LugarConZonasError,
} from "./domain";
import { calles, lugares } from "./infrastructure/esquema";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilio,
  crearLugar,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);

const bajaDe = (id: typeof lugares.$inferSelect.id) =>
  withTenant(motul, async (tx) => {
    const [fila] = await tx
      .select({ bajaEn: lugares.bajaEn })
      .from(lugares)
      .where(eq(lugares.id, id));
    return fila?.bajaEn;
  });

describe("darDeBajaLugar", () => {
  it("rechaza dar de baja un lugar con hijos activos", async () => {
    const comisaria = await crearLugar("comisaria", "Con hijo activo");
    const colonia = await crearLugar("colonia", "Colonia con hijo", comisaria);
    await crearLugar("colonia", "Colonia activa", colonia);

    await expect(darDeBajaLugar(colonia, contextoDe())).rejects.toBeInstanceOf(
      LugarConDependientesError,
    );

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, colonia)),
    );
    expect(fila?.bajaEn).toBeNull();
  });

  it("rechaza dar de baja un lugar con domicilios colgados", async () => {
    const comisaria = await crearLugar("comisaria", "Con domicilio");
    const colonia = await crearLugar(
      "colonia",
      "Colonia con domicilio",
      comisaria,
    );
    await crearDomicilio(colonia, "Calle colgada");

    await expect(darDeBajaLugar(colonia, contextoDe())).rejects.toBeInstanceOf(
      LugarConDependientesError,
    );
  });

  it("sin hijos activos ni domicilios colgados, marca bajaEn en la fila real", async () => {
    const comisaria = await crearLugar("comisaria", "Sin dependientes");
    const colonia = await crearLugar("colonia", "Colonia vacia", comisaria);

    await darDeBajaLugar(colonia, contextoDe());

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, colonia)),
    );
    expect(fila?.bajaEn).toBeInstanceOf(Date);
  });

  it("rechaza dar de baja un asentamiento con calles activas", async () => {
    const comisaria = await crearLugar("comisaria", "Con calle activa");
    await crearCalle(comisaria, "Calle viva");

    await expect(
      darDeBajaLugar(comisaria, contextoDe()),
    ).rejects.toBeInstanceOf(LugarConCallesError);
    expect(await bajaDe(comisaria)).toBeNull();
  });

  it("una calle dada de baja no impide la baja del asentamiento", async () => {
    const comisaria = await crearLugar("comisaria", "Con calle de baja");
    const calleId = await crearCalle(comisaria, "Calle cerrada");
    await withTenant(motul, (tx) =>
      tx
        .update(calles)
        .set({ bajaEn: new Date() })
        .where(eq(calles.id, calleId)),
    );

    await darDeBajaLugar(comisaria, contextoDe());

    expect(await bajaDe(comisaria)).toBeInstanceOf(Date);
  });

  it("rechaza dar de baja un asentamiento con zonas activas", async () => {
    const comisaria = await crearLugar("comisaria", "Con zona activa");
    await withTenant(motul, (tx) =>
      tx
        .insert(zonas)
        .values({ ayuntamientoId: motul, lugarId: comisaria, nombre: "Zona" }),
    );

    await expect(
      darDeBajaLugar(comisaria, contextoDe()),
    ).rejects.toBeInstanceOf(LugarConZonasError);
    expect(await bajaDe(comisaria)).toBeNull();
  });
});
