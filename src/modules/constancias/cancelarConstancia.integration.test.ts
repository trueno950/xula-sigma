import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCancelarConstancia } from "./application/cancelarConstancia";
import { crearConstanciaPorId } from "./application/constanciaPorId";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearListarConstancias } from "./application/listarConstancias";
import { crearReimprimirConstancia } from "./application/reimprimirConstancia";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { DocumentoCanceladoError } from "./domain";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { reimpresiones } from "./infrastructure/esquema";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Rebanada 6, contra Postgres real (design.md de `constancias-oficios`,
 * seccion 10): efecto de `cancelarConstancia` sobre el historial y su
 * interaccion con `reimprimirConstancia`, incluida la carrera entre las dos
 * con una segunda conexion real. El ciclo de vida de `reimprimirConstancia`
 * en aislamiento -dos filas independientes, freeze de plantilla, guarda de
 * rol- vive en `reimprimirConstancia.integration.test.ts` (limite de 200
 * lineas por archivo, `AGENTS.md`).
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
const cancelarConstancia = crearCancelarConstancia(repositorioDeConstanciasSql);
const constanciaPorId = crearConstanciaPorId(repositorioDeConstanciasSql);
const listarConstancias = crearListarConstancias(repositorioDeConstanciasSql);

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

describe("cancelar bloquea la reimpresion y no borra el historial", () => {
  it("cancelar una constancia y luego intentar reimprimirla -> DocumentoCanceladoError", async () => {
    const id = await emitirParaPersonaDePrueba("Cancelada");

    await cancelarConstancia(id, "ERROR_DE_CAPTURA", actor("ADMIN_MUNICIPAL"));

    await expect(
      reimprimirConstancia(id, "EXTRAVIO", actor("OPERADOR")),
    ).rejects.toBeInstanceOf(DocumentoCanceladoError);
  });

  it("emitir una constancia nueva para la misma persona tras cancelar la anterior deja folio distinto y conserva el historial", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "MismaPersonaDosVeces",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    const primeraId = await emitirConstancia(personaId, actor("OPERADOR"));
    await cancelarConstancia(primeraId, "DATOS_INCORRECTOS", admin);
    const segundaId = await emitirConstancia(personaId, actor("OPERADOR"));

    const primera = await constanciaPorId(primeraId, admin);
    const segunda = await constanciaPorId(segundaId, admin);

    expect(primera?.folio).not.toBe(segunda?.folio);
    expect(primera?.canceladaEn).not.toBeNull();
    expect(primera?.motivoCancelacion).toBe("DATOS_INCORRECTOS");
    expect(segunda?.canceladaEn).toBeNull();

    const listado = await listarConstancias(admin);
    const folios = listado.map((constancia) => constancia.folio);
    expect(folios).toContain(primera?.folio);
    expect(folios).toContain(segunda?.folio);
  });
});

describe("reimprimir y cancelar concurrentes, con una segunda conexion independiente", () => {
  it("una cancelacion que confirma mientras reimprimir espera el lock deja DocumentoCanceladoError, no una reimpresion huerfana", async () => {
    // Prueba real de la correccion de GGA en PR #40: sin `SELECT ... FOR
    // UPDATE` en `bloquearPorId`, esta cancelacion paralela podria confirmar
    // entre la lectura de `canceladaEn` de `reimprimirConstancia` y su
    // `INSERT` en `reimpresiones`, dejando una fila de reimpresion para un
    // documento ya cancelado. Mismo mecanismo de dos conexiones que T6 de
    // `folio.integration.test.ts` -sin el, `reimprimirConstancia` resolveria
    // antes de que la cancelacion paralela suelte el lock, y esta prueba
    // pasaria en falso.
    const id = await emitirParaPersonaDePrueba("CarreraReimprimirCancelar");

    let liberarParalela: () => void = () => {};
    const puedeConfirmar = new Promise<void>((resolve) => {
      liberarParalela = resolve;
    });

    const paralela = enTransaccionParalela(motul, async (tx) => {
      await tx`
        UPDATE constancias
           SET cancelada_en = now(),
               cancelada_por_usuario_id = ${gente.motul.ADMIN_MUNICIPAL},
               motivo_cancelacion = 'ERROR_DE_CAPTURA'
         WHERE id = ${id} AND cancelada_en IS NULL
      `;

      // Se queda abierta -sin COMMIT- hasta que el test decida soltarla.
      await puedeConfirmar;
    });

    // Le da tiempo a la paralela de terminar su UPDATE y tomar el lock
    // antes de disparar la reimpresion real.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reimpresion = reimprimirConstancia(id, "EXTRAVIO", actor("OPERADOR"));

    const PENDIENTE = Symbol("pendiente");
    const resultadoDeLaCarrera = await Promise.race([
      reimpresion
        .then(() => "resuelto" as const)
        .catch(() => "rechazado" as const),
      new Promise((resolve) => setTimeout(() => resolve(PENDIENTE), 300)),
    ]);

    expect(resultadoDeLaCarrera).toBe(PENDIENTE);

    liberarParalela();
    await paralela;

    await expect(reimpresion).rejects.toBeInstanceOf(DocumentoCanceladoError);

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(reimpresiones).where(eq(reimpresiones.constanciaId, id)),
    );
    expect(filas).toHaveLength(0);
  });
});
