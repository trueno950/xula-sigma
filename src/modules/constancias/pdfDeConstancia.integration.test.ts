import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearConstanciaPorId } from "./application/constanciaPorId";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearPdfDeConstancia } from "./application/pdfDeConstancia";
import { crearReimprimirConstancia } from "./application/reimprimirConstancia";
import { esquemaDeSnapshot } from "./application/validacionDeSnapshot";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { PlantillaDesconocidaError } from "./domain";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { constancias } from "./infrastructure/esquema";
import { lectorDeAyuntamientoSql } from "./infrastructure/lectorDeAyuntamientoSql";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { renderizadorReactPdf } from "./infrastructure/renderizadorReactPdf";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * Rebanada 6, contra Postgres real (design.md de `constancias-oficios`,
 * seccion 10): `pdfDeConstancia` resuelve `plantillaVersion` de la fila que
 * ya tiene, no de `VERSION_ACTUAL` -el freeze que hace cumplir la decision
 * 12-. Extraido de `reimprimirConstancia.integration.test.ts` (limite de
 * 200 lineas por archivo, `AGENTS.md`): esta prueba es sobre
 * `pdfDeConstancia`, no sobre `reimprimirConstancia`.
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
const constanciaPorId = crearConstanciaPorId(repositorioDeConstanciasSql);
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
