import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearCancelarConstancia } from "./application/cancelarConstancia";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import { crearPdfDeConstancia } from "./application/pdfDeConstancia";
import { crearReimprimirConstancia } from "./application/reimprimirConstancia";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { lectorDeAyuntamientoSql } from "./infrastructure/lectorDeAyuntamientoSql";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { renderizadorReactPdf } from "./infrastructure/renderizadorReactPdf";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";
import { textoDePdf } from "./textoDePdfDePrueba";

/**
 * El PDF real de una constancia cancelada, contra Postgres: la marca sale
 * del estado de la fila, no de quien pide el PDF. El render de la marca
 * en si -posicion, texto, prioridad sobre la reimpresion- lo cubre
 * `ConstanciaDeVecindadV1.test.tsx`; aca se prueba que el estado llega.
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

describe("el PDF de una constancia cancelada", () => {
  it("vigente no lleva marca; cancelada la lleva y conserva el folio y los datos", async () => {
    const id = await emitirParaPersonaDePrueba("Cancelable");
    const admin = actor("ADMIN_MUNICIPAL");

    const antes = await pdfDeConstancia({ id }, admin);
    expect(textoDePdf(antes.bytes)).not.toContain("CANCELADA");

    await cancelarConstancia(id, "ERROR_DE_CAPTURA", admin);

    const despues = await pdfDeConstancia({ id }, admin);
    const texto = textoDePdf(despues.bytes);
    expect(texto).toContain("CANCELADA");
    expect(texto).toContain(despues.folio);
    expect(despues.folio).toBe(antes.folio);
  });

  it("una reimpresion acreditada antes de cancelar tampoco esquiva la marca", async () => {
    const id = await emitirParaPersonaDePrueba("ReimpresaYCancelada");
    const admin = actor("ADMIN_MUNICIPAL");
    const reimpresionId = await reimprimirConstancia(
      id,
      "EJEMPLAR_ADICIONAL",
      actor("OPERADOR"),
    );
    await cancelarConstancia(id, "DATOS_INCORRECTOS", admin);

    const { bytes } = await pdfDeConstancia({ id, reimpresionId }, admin);

    expect(textoDePdf(bytes)).toContain("CANCELADA");
  });

  it("el PDF de una constancia cancelada de otro municipio sigue dando NoEncontradoError", async () => {
    const id = await emitirParaPersonaDePrueba("CanceladaAjena");
    await cancelarConstancia(id, "ERROR_DE_CAPTURA", actor("ADMIN_MUNICIPAL"));

    await expect(
      pdfDeConstancia({ id }, contextoDe(gente, "ticul", "ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
