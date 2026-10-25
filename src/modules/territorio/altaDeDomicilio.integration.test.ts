import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { ColoniaRequeridaError } from "./domain";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const altaDeDomicilio = crearAltaDeDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);

describe("altaDeDomicilio contra Postgres", () => {
  it("rechaza y no escribe cuando una cabecera tiene colonia activa y no se elige destino", async () => {
    const cabecera = await crearLugar(
      "cabecera",
      "Cabecera con colonia requerida",
    );
    await crearLugar("colonia", "Colonia activa", cabecera);
    const calle = await crearCalle(cabecera, "Calle 77");
    const antes = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porCalle(tx, calle),
    );

    expect(antes).toEqual([]);
    await expect(
      altaDeDomicilio(
        {
          calleId: calle,
          numero: "77",
          entreCalleAId: null,
          entreCalleBId: null,
          referencia: null,
        },
        contextoDe(),
      ),
    ).rejects.toBeInstanceOf(ColoniaRequeridaError);

    const despues = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porCalle(tx, calle),
    );
    expect(despues).toEqual(antes);
  });
});
