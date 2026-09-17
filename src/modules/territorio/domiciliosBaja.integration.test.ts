import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import {
  cerrarConexion,
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { crearCorregirDomicilio } from "./application/corregirDomicilio";
import { crearDarDeBajaDomicilio } from "./application/darDeBajaDomicilio";
import { DomicilioConResidentesError } from "./domain";
import { residencias } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
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
const corregirDomicilio = crearCorregirDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);
const darDeBajaDomicilio = crearDarDeBajaDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeResidenciasSql,
);

const enTenant = <T>(trabajo: (tx: TransaccionTenant) => Promise<T>) =>
  withTenant(contextoDe().ayuntamientoId, trabajo);

const crearDomicilioDePrueba = async () => {
  const comisaria = await crearLugar("comisaria", "Comisaria baja domicilio");
  const colonia = await crearLugar("colonia", "Colonia baja", comisaria);
  const calle = await crearCalle(comisaria, "Calle 30");
  const { id } = await altaDeDomicilio(
    {
      lugarId: colonia,
      calleId: calle,
      numero: "5",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contextoDe(),
  );

  return { comisaria, colonia, calle, id };
};

describe("baja y correccion de domicilios", () => {
  it("la baja logica esconde la fila de las cuatro lecturas", async () => {
    const { comisaria, calle, id } = await crearDomicilioDePrueba();

    await darDeBajaDomicilio(id, contextoDe());

    const porId = await enTenant((tx) =>
      repositorioDeDomiciliosSql.buscarPorId(tx, id),
    );
    const porLugar = await enTenant((tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, comisaria),
    );
    const porCalle = await enTenant((tx) =>
      repositorioDeDomiciliosSql.porCalle(tx, calle),
    );
    const listado = await enTenant((tx) =>
      repositorioDeDomiciliosSql.listar(tx),
    );

    expect(porId).toBeNull();
    expect(porLugar.map((d) => d.id)).not.toContain(id);
    expect(porCalle.map((d) => d.id)).not.toContain(id);
    expect(listado.map((d) => d.id)).not.toContain(id);
  });

  it("rechaza la baja cuando hay una residencia vigente", async () => {
    const { id } = await crearDomicilioDePrueba();
    const { id: personaId } = await altaDePersona(
      {
        nombres: "Ana",
        primerApellido: "Pech",
        segundoApellido: null,
        curp: null,
      },
      contextoDe(),
    );

    await enTenant((tx) =>
      tx.insert(residencias).values({
        ayuntamientoId: contextoDe().ayuntamientoId,
        personaId,
        domicilioId: id,
        desdeEn: "2026-01-01",
      }),
    );

    await expect(darDeBajaDomicilio(id, contextoDe())).rejects.toBeInstanceOf(
      DomicilioConResidentesError,
    );
  });

  it("corrige los cinco campos y la lectura los devuelve", async () => {
    const { comisaria, colonia, id } = await crearDomicilioDePrueba();
    const otraCalle = await crearCalle(comisaria, "Calle 31");

    await corregirDomicilio(
      {
        id,
        lugarId: colonia,
        calleId: otraCalle,
        numero: "7",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: "Porton azul",
      },
      contextoDe(),
    );

    const fila = await enTenant((tx) =>
      repositorioDeDomiciliosSql.buscarPorId(tx, id),
    );

    expect(fila).toMatchObject({
      lugarId: colonia,
      calleId: otraCalle,
      numero: "7",
      referencia: "Porton azul",
    });
  });
});
