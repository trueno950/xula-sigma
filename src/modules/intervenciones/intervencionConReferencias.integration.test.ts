import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reportePorId } from "@/modules/reportes";
import { altaDeCalle, altaDeLugar } from "@/modules/territorio";
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
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearIntervencionConReferencias } from "./application/intervencionConReferencias";
import { intervencionPorId } from "./composicion";
import { intervenciones } from "./infrastructure/esquema";
import { crearLectorDeReferenciasPorModulos } from "./infrastructure/lectorDeReferenciasPorModulos";
import { intervencionDe } from "./intervencionDePrueba";
import { registrarReporteDePrueba } from "./reporteVinculadoDePrueba";

/**
 * Contra Postgres real: lo que se prueba es RLS. Un mock del lector no dice
 * si un lugar, una calle o un reporte de Ticul se ven desde Motul.
 */

let gente: GentePorMunicipio;

const lector = crearLectorDeReferenciasPorModulos();
const intervencionConReferencias = crearIntervencionConReferencias(
  intervencionPorId,
  lector,
);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

type Municipio = "motul" | "ticul";

type Referencias = {
  lugarId: string;
  calleId: string;
  reporteId: string;
  folio: string;
};

const sembrarReferencias = async (
  municipio: Municipio,
  nombre: string,
): Promise<Referencias> => {
  const contexto = contextoDe(gente, municipio, "ADMIN_MUNICIPAL");
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre: `Comisaria ${nombre}`, padreId: null },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: `Calle ${nombre}`, lugarId },
    contexto,
  );
  const reporteId = await registrarReporteDePrueba(lugarId, contexto);
  const reporte = await reportePorId(reporteId, contexto);
  if (!reporte) throw new Error("No se pudo leer el reporte sembrado.");

  return { lugarId, calleId, reporteId, folio: reporte.folio };
};

const insertarIntervencion = async (
  municipio: Municipio,
  referencias: Partial<Referencias> & { lugarId: string },
) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId,
          lugarId: referencias.lugarId,
          calleId: referencias.calleId ?? null,
          reporteId: referencias.reporteId ?? null,
          registradoPorUsuarioId: gente[municipio].OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );
  if (!fila) throw new Error("No se pudo sembrar la intervencion.");
  return fila.id;
};

describe("intervencionConReferencias, contra Postgres real", () => {
  it("resuelve lugar, calle y folio de una intervencion de su municipio", async () => {
    const propias = await sembrarReferencias("motul", "Propia");
    const id = await insertarIntervencion("motul", propias);

    const resultado = await intervencionConReferencias(
      id as Parameters<typeof intervencionConReferencias>[0],
      contextoDe(gente, "motul", "OPERADOR"),
    );

    expect(resultado?.referencias).toEqual({
      lugar: "Comisaria Propia (comisaría)",
      calle: "Calle Propia",
      reporte: { id: propias.reporteId, folio: propias.folio },
    });
  });

  it("sin calle ni reporte, esas referencias vuelven null sin consultar", async () => {
    const propias = await sembrarReferencias("motul", "Sola");
    const id = await insertarIntervencion("motul", {
      lugarId: propias.lugarId,
    });

    const resultado = await intervencionConReferencias(
      id as Parameters<typeof intervencionConReferencias>[0],
      contextoDe(gente, "motul", "OPERADOR"),
    );

    expect(resultado?.referencias).toEqual({
      lugar: "Comisaria Sola (comisaría)",
      calle: null,
      reporte: null,
    });
  });

  it("los ids de otro municipio no devuelven ningun nombre", async () => {
    const ajenas = await sembrarReferencias("ticul", "Ajena");

    const referencias = await lector.leer(
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
      ajenas,
    );

    expect(referencias).toEqual({ lugar: null, calle: null, reporte: null });
  });

  it("una intervencion de otro municipio no se resuelve ni deja leer sus nombres", async () => {
    const ajenas = await sembrarReferencias("ticul", "Ajena Ficha");
    const id = await insertarIntervencion("ticul", ajenas);

    const resultado = await intervencionConReferencias(
      id as Parameters<typeof intervencionConReferencias>[0],
      contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
    );

    expect(resultado).toBeNull();
  });
});
