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
import { LugarConDependientesError } from "./domain";
import { lugares } from "./infrastructure/esquema";
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

const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);

describe("darDeBajaLugar", () => {
  it("rechaza dar de baja un lugar con hijos activos", async () => {
    const comisaria = await crearLugar("comisaria", "Con hijo activo");
    const sector = await crearLugar("sector", "Sector con hijo", comisaria);
    await crearLugar("manzana", "Manzana activa", sector);

    await expect(darDeBajaLugar(sector, contextoDe())).rejects.toBeInstanceOf(
      LugarConDependientesError,
    );

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, sector)),
    );
    expect(fila?.bajaEn).toBeNull();
  });

  it("rechaza dar de baja un lugar con domicilios colgados", async () => {
    const comisaria = await crearLugar("comisaria", "Con domicilio");
    const sector = await crearLugar(
      "sector",
      "Sector con domicilio",
      comisaria,
    );
    await crearDomicilio(sector, "Calle colgada");

    await expect(darDeBajaLugar(sector, contextoDe())).rejects.toBeInstanceOf(
      LugarConDependientesError,
    );
  });

  it("sin hijos activos ni domicilios colgados, marca bajaEn en la fila real", async () => {
    const comisaria = await crearLugar("comisaria", "Sin dependientes");
    const sector = await crearLugar("sector", "Sector vacio", comisaria);

    await darDeBajaLugar(sector, contextoDe());

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, sector)),
    );
    expect(fila?.bajaEn).toBeInstanceOf(Date);
  });
});
