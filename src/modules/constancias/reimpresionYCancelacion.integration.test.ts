import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  enTransaccionParalela,
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCancelarConstancia } from "./application/cancelarConstancia";
import { crearConstanciaPorId } from "./application/constanciaPorId";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearListarConstancias } from "./application/listarConstancias";
import { crearPdfDeConstancia } from "./application/pdfDeConstancia";
import { crearReimprimirConstancia } from "./application/reimprimirConstancia";
import { esquemaDeSnapshot } from "./application/validacionDeSnapshot";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { DocumentoCanceladoError, PlantillaDesconocidaError } from "./domain";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { constancias, reimpresiones } from "./infrastructure/esquema";
import { lectorDeAyuntamientoSql } from "./infrastructure/lectorDeAyuntamientoSql";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { renderizadorReactPdf } from "./infrastructure/renderizadorReactPdf";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Rebanada 6, contra Postgres real (design.md de `constancias-oficios`,
 * seccion 10): reimpresion y cancelacion sobre las tablas de la Fase 2.
 * `emision.integration.test.ts` cubre el snapshot congelado; este archivo
 * cubre el ciclo de vida posterior a la emision.
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
const pdfDeConstancia = crearPdfDeConstancia(
  repositorioDeConstanciasSql,
  lectorDeAyuntamientoSql,
  renderizadorReactPdf,
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

describe("plantillaVersion queda congelada en lo que la fila ya tiene", () => {
  it("una fila con una plantillaVersion que ya no esta registrada no se resuelve contra la version vigente", async () => {
    // Simula el escenario de design.md ("VERSION_ACTUAL avanza"): esta
    // rebanada solo registra una version de plantilla
    // (`domain/tipoDeDocumento.ts`, `VERSION_ACTUAL.VECINDAD ===
    // "vecindad-v1"`), asi que no existe una v2 real contra la cual emitir.
    // La fila se inserta a mano con una version vieja que YA no esta en
    // `PLANTILLAS` -el equivalente de "quedo atras cuando la version
    // vigente avanzo"-: si `pdfDeConstancia` recalculara la version desde
    // `VERSION_ACTUAL` en vez de leer la columna, esto renderizaria con
    // "vecindad-v1" y el test fallaria en vez de lanzar.
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "VersionVieja",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .insert(constancias)
        .values({
          ayuntamientoId: motul,
          tipo: "VECINDAD",
          folio: "VEC-2026-090001",
          anio: 2026,
          consecutivo: 90001,
          codigoVerificacion: "0000000000000000",
          personaId,
          datos: esquemaDeSnapshot.parse({
            titular: { nombreCompleto: "Version Vieja Poot" },
            direccion: {
              texto: "Calle de VersionVieja #10",
              residenciaId: "residencia-1",
              desdeEn: "2024-01-01",
            },
            firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
          }),
          plantillaVersion: "vecindad-v0-descontinuada",
          emitidaPorUsuarioId: gente.motul.OPERADOR,
        })
        .returning({ id: constancias.id }),
    );
    const id = fila!.id;

    await expect(pdfDeConstancia({ id }, admin)).rejects.toBeInstanceOf(
      PlantillaDesconocidaError,
    );
  });

  it("una constancia emitida normalmente sigue resolviendo su version tras una reimpresion", async () => {
    const id = await emitirParaPersonaDePrueba("VersionCongelada");
    await reimprimirConstancia(id, "EJEMPLAR_ADICIONAL", actor("OPERADOR"));

    const constancia = await constanciaPorId(id, actor("ADMIN_MUNICIPAL"));
    expect(constancia?.plantillaVersion).toBe("vecindad-v1");

    const { bytes } = await pdfDeConstancia({ id }, actor("ADMIN_MUNICIPAL"));
    expect(Buffer.from(bytes).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

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
