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
 * `buscar` contra Postgres real (`design.md`, "Buscador"): confirma que el
 * `ILIKE` sobre `folio` y el acceso jsonb `datos->'titular'->>'nombreCompleto'`
 * (`listadoDeConstanciasSql.ts`) de verdad encuentran filas, algo que un
 * mock de `RepositorioDeConstancias` no puede probar. `listar` con filtro
 * de `estado` confirma la traduccion de `canceladaEn` en el mismo viaje.
 */

let gente: GentePorMunicipio;

const emitirConstancia = crearEmitirConstancia(
  repositorioDeConstanciasSql,
  contadorDeFoliosSql,
  repositorioDeDocumentosSql,
  crearLectorDeTitularesPorPadron,
  crearLectorDeDireccionesPorTerritorio,
);
const buscarConstancias = crearBuscarConstancias(repositorioDeConstanciasSql);
const listarConstancias = crearListarConstancias(repositorioDeConstanciasSql);
const cancelarConstancia = crearCancelarConstancia(repositorioDeConstanciasSql);

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

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

describe("buscarConstancias contra Postgres real", () => {
  it("encuentra por folio", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "BuscarPorFolio",
      admin,
    );
    await configurarFirmaDePrueba(admin);
    const id = await emitirConstancia(personaId, actor("OPERADOR"));
    const emitida = await listarConstancias({}, admin);
    const folio = emitida.constancias.find((c) => c.id === id)?.folio;
    expect(folio).toBeDefined();

    const resultado = await buscarConstancias(folio!.slice(0, 6), admin);

    expect(resultado.constancias.map((c) => c.id)).toContain(id);
  });

  it("encuentra por el nombre del titular congelado en el snapshot", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "Xochitl Balam",
      admin,
    );
    await configurarFirmaDePrueba(admin);
    const id = await emitirConstancia(personaId, actor("OPERADOR"));

    const resultado = await buscarConstancias("Balam", admin);

    expect(resultado.constancias.map((c) => c.id)).toContain(id);
  });

  it("una busqueda sin coincidencias no revienta, devuelve lista vacia", async () => {
    const admin = actor("ADMIN_MUNICIPAL");

    const resultado = await buscarConstancias(
      "no-existe-ningun-titular-con-este-nombre",
      admin,
    );

    expect(resultado.constancias).toEqual([]);
  });
});

describe("listarConstancias con filtro de estado contra Postgres real", () => {
  it("VIGENTE trae solo lo no cancelado, CANCELADA solo lo cancelado", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId: personaVigente } = await titularConResidenciaVigente(
      "PermaneceVigente",
      admin,
    );
    const { personaId: personaCancelada } = await titularConResidenciaVigente(
      "SeraCancelada",
      admin,
    );
    await configurarFirmaDePrueba(admin);
    const idVigente = await emitirConstancia(personaVigente, actor("OPERADOR"));
    const idCancelada = await emitirConstancia(
      personaCancelada,
      actor("OPERADOR"),
    );
    await cancelarConstancia(idCancelada, "DATOS_INCORRECTOS", admin);

    const vigentes = await listarConstancias({ estado: "VIGENTE" }, admin);
    const canceladas = await listarConstancias({ estado: "CANCELADA" }, admin);

    expect(vigentes.constancias.map((c) => c.id)).toContain(idVigente);
    expect(vigentes.constancias.map((c) => c.id)).not.toContain(idCancelada);
    expect(canceladas.constancias.map((c) => c.id)).toContain(idCancelada);
    expect(canceladas.constancias.map((c) => c.id)).not.toContain(idVigente);
  });
});
