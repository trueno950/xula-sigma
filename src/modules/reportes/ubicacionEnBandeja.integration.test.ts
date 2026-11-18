import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import {
  buscarReportes,
  detalleDeReporte,
  listarReportes,
} from "./composicion";
import { reportes } from "./infrastructure/esquema";
import {
  type Municipio,
  reporteEn,
  sembrarTerritorio,
  type Territorio,
} from "./ubicacionDePrueba";

/**
 * S4 y S11 de `reportes-ux`, contra Postgres real: los nombres de lugar,
 * calle y domicilio los resuelve `territorio` bajo su propia RLS, asi que un
 * puerto mockeado no puede demostrar que el nombre que llega a la bandeja es
 * el del municipio de la sesion y no el de otro. Los dos municipios tienen
 * nombres distintos a proposito: cualquier fuga se lee en la asercion.
 */

let gente: GentePorMunicipio;
const territorio = {} as Record<Municipio, Territorio>;

const actor = (
  municipio: Municipio,
  rol: "ADMIN_MUNICIPAL" | "OPERADOR" | "CONSULTA",
) => contextoDe(gente, municipio, rol);

const registrar = (
  municipio: Municipio,
  ubicacion: {
    calleId?: string | null;
    domicilioId?: string;
    descripcion?: string;
  },
) =>
  reporteEn({ gente, municipio, territorio: territorio[municipio], ubicacion });

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  territorio.motul = await sembrarTerritorio({
    gente,
    municipio: "motul",
    etiqueta: "Ubicacion",
  });
  territorio.ticul = await sembrarTerritorio({
    gente,
    municipio: "ticul",
    etiqueta: "Ajena",
  });
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, folios_de_reportes, reportes, movimientos_de_reportes, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("la bandeja dice donde ocurrio cada reporte", () => {
  it("nombra el lugar, la calle y la raiz del territorio de un reporte por «Lugar y calle»", async () => {
    const id = await registrar("motul", { calleId: territorio.motul.calle });

    const { reportes: filas } = await listarReportes(
      {},
      actor("motul", "CONSULTA"),
    );
    const fila = filas.find((reporte) => String(reporte.id) === String(id));

    expect(fila?.ubicacion).toEqual({
      modo: "CALLE",
      lugar: "Colonia Ubicacion",
      calleId: String(territorio.motul.calle),
      calle: "Calle Ubicacion",
      domicilio: null,
      raizId: String(territorio.motul.comisaria),
    });
  });

  it("muestra la etiqueta del domicilio de un reporte por «Domicilio registrado»", async () => {
    await registrar("motul", { domicilioId: territorio.motul.domicilio });

    const { reportes: filas } = await listarReportes(
      {},
      actor("motul", "CONSULTA"),
    );

    expect(filas[0]?.ubicacion).toMatchObject({
      modo: "DOMICILIO",
      domicilio: "Calle Ubicacion #42, Colonia Ubicacion",
      calle: "Calle Ubicacion",
      raizId: String(territorio.motul.comisaria),
    });
  });

  it("no inventa calle para un reporte capturado solo con el lugar", async () => {
    await registrar("motul", {});

    const { reportes: filas } = await listarReportes(
      {},
      actor("motul", "CONSULTA"),
    );

    expect(filas[0]?.ubicacion).toMatchObject({
      modo: "CALLE",
      lugar: "Colonia Ubicacion",
      calle: null,
      calleId: null,
    });
  });

  it("la busqueda trae la misma ubicacion que el listado", async () => {
    await registrar("motul", {
      calleId: territorio.motul.calle,
      descripcion: "Bache junto a la cancha de usos multiples",
    });

    const { reportes: filas } = await buscarReportes(
      "cancha de usos multiples",
      actor("motul", "CONSULTA"),
    );

    expect(filas[0]?.ubicacion?.calle).toBe("Calle Ubicacion");
  });

  it("los nombres de otro municipio nunca aparecen", async () => {
    await registrar("ticul", { calleId: territorio.ticul.calle });
    await registrar("motul", { calleId: territorio.motul.calle });

    const { reportes: filas } = await listarReportes(
      {},
      actor("motul", "CONSULTA"),
    );
    const nombres = filas.map((reporte) => JSON.stringify(reporte.ubicacion));

    expect(nombres).toHaveLength(1);
    expect(nombres[0]).not.toContain("Ajena");
    expect(nombres[0]).toContain("Colonia Ubicacion");
  });
});

describe("el detalle de un reporte", () => {
  it("trae la ubicacion y la fecha de registro civil de Merida", async () => {
    const id = await registrar("motul", { calleId: territorio.motul.calle });
    // 21:00 del 31 de diciembre en Merida: en UTC ya es el 1 de enero.
    await withTenant(actor("motul", "CONSULTA").ayuntamientoId, (tx) =>
      tx
        .update(reportes)
        .set({ registradoEn: new Date("2026-01-01T03:00:00Z") })
        .where(eq(reportes.id, id)),
    );

    const detalle = await detalleDeReporte(id, actor("motul", "CONSULTA"));

    expect(detalle?.fechaDeRegistro).toBe("2025-12-31");
    expect(detalle?.ubicacion).toEqual({
      modo: "CALLE",
      lugar: "Colonia Ubicacion",
      calleId: String(territorio.motul.calle),
      calle: "Calle Ubicacion",
      domicilio: null,
      raizId: String(territorio.motul.comisaria),
    });
  });

  it("un reporte de otro municipio se lee como inexistente, sin nombres ajenos", async () => {
    const ajeno = await registrar("ticul", {
      calleId: territorio.ticul.calle,
    });

    await expect(
      detalleDeReporte(ajeno, actor("motul", "CONSULTA")),
    ).resolves.toBeNull();
    await expect(
      detalleDeReporte(ajeno, actor("ticul", "CONSULTA")),
    ).resolves.toMatchObject({
      ubicacion: { lugar: "Colonia Ajena", calle: "Calle Ajena" },
    });
  });
});
