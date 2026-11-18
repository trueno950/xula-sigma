import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearBuscarConstancias } from "./application/buscarConstancias";
import { crearCancelarConstancia } from "./application/cancelarConstancia";
import { crearConstanciaPorId } from "./application/constanciaPorId";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearListarConstancias } from "./application/listarConstancias";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Modelo de lectura del listado y del detalle contra Postgres real
 * (`constancias-ux`, S1/S2/S7/S8): el titular que pinta cada fila, la
 * busqueda por nombre sin acentos y el estado mas el `personaId` del
 * detalle. Lo que un mock del repositorio no puede probar es que el
 * snapshot jsonb de verdad traiga el nombre, ni que la normalizacion del
 * `LIKE` coincida con la del padron.
 */

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

const emitirConstancia = crearEmitirConstancia(
  repositorioDeConstanciasSql,
  contadorDeFoliosSql,
  repositorioDeDocumentosSql,
  crearLectorDeTitularesPorPadron,
  crearLectorDeDireccionesPorTerritorio,
);
const listarConstancias = crearListarConstancias(repositorioDeConstanciasSql);
const buscarConstancias = crearBuscarConstancias(repositorioDeConstanciasSql);
const constanciaPorId = crearConstanciaPorId(repositorioDeConstanciasSql);
const cancelarConstancia = crearCancelarConstancia(repositorioDeConstanciasSql);

const emitirParaTitular = async (nombres: string) => {
  const admin = actor("ADMIN_MUNICIPAL");
  const { personaId } = await titularConResidenciaVigente(nombres, admin);
  await configurarFirmaDePrueba(admin);

  return {
    personaId,
    id: await emitirConstancia(personaId, actor("OPERADOR")),
  };
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE folios_de_documentos, constancias, reimpresiones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("listado con el titular de cada fila", () => {
  it("cada fila trae el nombre del titular congelado en el snapshot", async () => {
    const { id } = await emitirParaTitular("Filomena");

    const listado = await listarConstancias({}, actor("ADMIN_MUNICIPAL"));

    expect(
      listado.constancias.find((c) => c.id === id)?.nombreDelTitular,
    ).toContain("Filomena");
  });

  it("la busqueda por nombre ignora acentos, igual que el padron", async () => {
    const { id } = await emitirParaTitular("José");

    const resultado = await buscarConstancias("jose", actor("ADMIN_MUNICIPAL"));

    expect(resultado.constancias.map((c) => c.id)).toContain(id);
  });

  it("la enie sigue siendo letra propia: «pena» no encuentra a «Peña»", async () => {
    await emitirParaTitular("Peña");

    const resultado = await buscarConstancias("pena", actor("ADMIN_MUNICIPAL"));

    expect(resultado.constancias).toEqual([]);
  });
});

describe("detalle con estado y titular", () => {
  it("una constancia vigente se lee VIGENTE y trae el personaId del titular", async () => {
    const { personaId, id } = await emitirParaTitular("Genoveva");

    const constancia = await constanciaPorId(id, actor("ADMIN_MUNICIPAL"));

    expect(constancia?.estado).toBe("VIGENTE");
    expect(constancia?.personaId).toBe(personaId);
  });

  it("una cancelada se lee CANCELADA con la fecha y el motivo de la cancelacion", async () => {
    const { id } = await emitirParaTitular("Delfina");

    await cancelarConstancia(
      id,
      "SOLICITUD_DEL_INTERESADO",
      actor("ADMIN_MUNICIPAL"),
    );
    const constancia = await constanciaPorId(id, actor("ADMIN_MUNICIPAL"));

    expect(constancia?.estado).toBe("CANCELADA");
    expect(constancia?.canceladaEn).toBeInstanceOf(Date);
    expect(constancia?.motivoCancelacion).toBe("SOLICITUD_DEL_INTERESADO");
  });
});
