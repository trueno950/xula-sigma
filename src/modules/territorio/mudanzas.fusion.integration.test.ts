import { and, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona, fusionarPersonas } from "@/modules/padron";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaDomicilio } from "./application/darDeBajaDomicilio";
import { crearRegistrarMudanza } from "./application/registrarMudanza";
import { residencias } from "./infrastructure/esquema";
import { crearLectorDePersonasPorPadron } from "./infrastructure/lectorDePersonasPorPadron";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeResidenciasSql } from "./infrastructure/repositorioDeResidenciasSql";
import { contextoDe, crearDomicilio, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registrarMudanza = crearRegistrarMudanza(
  repositorioDeResidenciasSql,
  repositorioDeDomiciliosSql,
  crearLectorDePersonasPorPadron,
);
const darDeBajaDomicilio = crearDarDeBajaDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeResidenciasSql,
);

const personaDePrueba = async (nombres: string) => {
  const { id } = await altaDePersona(
    { nombres, primerApellido: "Uc", segundoApellido: null, curp: null },
    contextoDe(),
  );
  return id;
};

const domicilioDePrueba = async (nombreCalle: string) => {
  const comisaria = await crearLugar("comisaria", `Comisaria ${nombreCalle}`);
  const colonia = await crearLugar(
    "colonia",
    `Colonia ${nombreCalle}`,
    comisaria,
  );
  return crearDomicilio(colonia, nombreCalle);
};

const abiertasDe = (identidades: string[]) =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: residencias.id, domicilioId: residencias.domicilioId })
      .from(residencias)
      .where(
        and(
          inArray(residencias.personaId, identidades),
          isNull(residencias.hastaEn),
        ),
      ),
  );

describe("registrarMudanza despues de una fusion", () => {
  it("cierra la residencia abierta de la perdedora y la de la ganadora, y deja abierta solo la nueva", async () => {
    const perdedora = await personaDePrueba("Perdedora");
    const ganadora = await personaDePrueba("Ganadora");
    const casaDePerdedora = await domicilioDePrueba("Calle Perdedora");
    const casaDeGanadora = await domicilioDePrueba("Calle Ganadora");
    const casaNueva = await domicilioDePrueba("Calle Despues de Fusion");
    await registrarMudanza(perdedora, casaDePerdedora, contextoDe());
    await registrarMudanza(ganadora, casaDeGanadora, contextoDe());
    await fusionarPersonas(perdedora, ganadora, contextoDe());

    const { id } = await registrarMudanza(perdedora, casaNueva, contextoDe());

    await expect(abiertasDe([perdedora, ganadora])).resolves.toEqual([
      { id, domicilioId: casaNueva },
    ]);
  });

  it("despues de la mudanza, el domicilio viejo de la perdedora ya se puede dar de baja", async () => {
    const perdedora = await personaDePrueba("Perdedora baja");
    const ganadora = await personaDePrueba("Ganadora baja");
    const casaDePerdedora = await domicilioDePrueba("Calle Perdedora Baja");
    const casaNueva = await domicilioDePrueba("Calle Nueva Baja");
    await registrarMudanza(perdedora, casaDePerdedora, contextoDe());
    await fusionarPersonas(perdedora, ganadora, contextoDe());

    await registrarMudanza(ganadora, casaNueva, contextoDe());

    await expect(
      darDeBajaDomicilio(casaDePerdedora, contextoDe()),
    ).resolves.toBeUndefined();
    await expect(abiertasDe([perdedora, ganadora])).resolves.toHaveLength(1);
  });
});
