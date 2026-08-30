import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearReimprimirConstancia } from "./application/reimprimirConstancia";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { reimpresiones } from "./infrastructure/esquema";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Rebanada 6, contra Postgres real (design.md de `constancias-oficios`,
 * seccion 10): el ciclo de vida de `reimprimirConstancia` en aislamiento
 * -cuantas filas deja, quien puede llamarla-. El freeze de
 * `plantillaVersion` vive en `pdfDeConstancia.integration.test.ts` -es
 * comportamiento de `pdfDeConstancia`, no de `reimprimirConstancia`-, y la
 * interaccion con `cancelarConstancia` -incluida la carrera con dos
 * conexiones reales- vive en `cancelarConstancia.integration.test.ts`
 * (limite de 200 lineas por archivo, `AGENTS.md`).
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
const reimprimirConstancia = crearReimprimirConstancia(
  repositorioDeConstanciasSql,
);

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

const emitirParaPersonaDePrueba = async (nombres: string) => {
  const admin = actor("ADMIN_MUNICIPAL");
  const { personaId } = await titularConResidenciaVigente(nombres, admin);
  await configurarFirmaDePrueba(admin);

  return emitirConstancia(personaId, actor("OPERADOR"));
};

describe("reimprimir dos veces deja dos filas independientes", () => {
  it("cada reimpresion queda con su propio motivo, usuario y momento, sin modificar la anterior", async () => {
    const id = await emitirParaPersonaDePrueba("DosReimpresiones");

    const primeraId = await reimprimirConstancia(
      id,
      "EXTRAVIO",
      actor("OPERADOR"),
    );
    const segundaId = await reimprimirConstancia(
      id,
      "DETERIORO",
      actor("ADMIN_MUNICIPAL"),
    );

    expect(primeraId).not.toBe(segundaId);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(reimpresiones).where(eq(reimpresiones.constanciaId, id)),
    );

    expect(filas).toHaveLength(2);
    const porMotivo = Object.fromEntries(
      filas.map((fila) => [fila.motivo, fila]),
    );
    expect(porMotivo.EXTRAVIO?.usuarioId).toBe(gente.motul.OPERADOR);
    expect(porMotivo.DETERIORO?.usuarioId).toBe(gente.motul.ADMIN_MUNICIPAL);
  });

  it("el conteo de reimpresiones nunca decrece: xula_app no tiene GRANT de UPDATE ni DELETE sobre la tabla", async () => {
    const id = await emitirParaPersonaDePrueba("SinUpdateNiDelete");
    await reimprimirConstancia(id, "EXTRAVIO", actor("OPERADOR"));

    const antes = await withTenant(motul, (tx) =>
      tx.select().from(reimpresiones).where(eq(reimpresiones.constanciaId, id)),
    );
    expect(antes).toHaveLength(1);

    const motivoUpdate = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(
          sql`UPDATE reimpresiones SET motivo = 'DETERIORO' WHERE constancia_id = ${id}`,
        ),
      ),
    );
    expect(motivoUpdate).toMatch(/permission denied/i);

    const motivoDelete = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(sql`DELETE FROM reimpresiones WHERE constancia_id = ${id}`),
      ),
    );
    expect(motivoDelete).toMatch(/permission denied/i);

    const despues = await withTenant(motul, (tx) =>
      tx.select().from(reimpresiones).where(eq(reimpresiones.constanciaId, id)),
    );
    expect(despues).toHaveLength(1);
    expect(despues[0]?.motivo).toBe("EXTRAVIO");
  });
});

describe("un OPERADOR reimprime sin necesitar puedeAdministrarDocumentos", () => {
  it("un OPERADOR reimprime con solo puedeEscribir, sin la regla de administracion", async () => {
    const id = await emitirParaPersonaDePrueba("OperadorReimprime");

    const reimpresionId = await reimprimirConstancia(
      id,
      "EXTRAVIO",
      actor("OPERADOR"),
    );

    expect(reimpresionId).toBeDefined();
  });
});
