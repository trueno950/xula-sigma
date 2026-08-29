import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearRenombrarCalle } from "./application/renombrarCalle";
import { NombreDeCalleDuplicadoError } from "./domain";
import { domicilios } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
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

describe("renombrarCalle", () => {
  it("no cambia conteo ni xmin de los domicilios colgados de la calle", async () => {
    const comisaria = await crearLugar("comisaria", "Yotholin renombre");
    const domicilioId = await crearDomicilio(comisaria, "Calle 21");

    const [domicilioAntes] = await withTenant(motul, (tx) =>
      tx
        .select({ calleId: domicilios.calleId, xmin: sql<string>`xmin::text` })
        .from(domicilios)
        .where(eq(domicilios.id, domicilioId)),
    );

    const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);
    await renombrarCalle(
      domicilioAntes!.calleId,
      "Calle Veintiuno",
      contextoDe(),
    );

    const [domicilioDespues] = await withTenant(motul, (tx) =>
      tx
        .select({ calleId: domicilios.calleId, xmin: sql<string>`xmin::text` })
        .from(domicilios)
        .where(eq(domicilios.id, domicilioId)),
    );

    expect(domicilioDespues?.calleId).toBe(domicilioAntes?.calleId);
    expect(domicilioDespues?.xmin).toBe(domicilioAntes?.xmin);
  });

  it("rechaza el mismo nombre en el mismo lugar", async () => {
    const comisaria = await crearLugar("comisaria", "Yotholin duplicado");
    await crearCalle(comisaria, "Calle 21");
    const otraCalleId = await crearCalle(comisaria, "Calle 22");

    const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);

    await expect(
      renombrarCalle(otraCalleId, "Calle 21", contextoDe()),
    ).rejects.toBeInstanceOf(NombreDeCalleDuplicadoError);
  });

  it("el mismo nombre en un lugar distinto convive sin problema", async () => {
    const comisariaA = await crearLugar("comisaria", "Comisaria A");
    const comisariaB = await crearLugar("comisaria", "Comisaria B");
    await crearCalle(comisariaA, "Calle 21");
    const calleEnB = await crearCalle(comisariaB, "Calle otra");

    const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);

    await expect(
      renombrarCalle(calleEnB, "Calle 21", contextoDe()),
    ).resolves.toBeUndefined();
  });
});
