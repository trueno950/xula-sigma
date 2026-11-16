import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S2 de `gestion-municipal`, contra la aplicacion construida y Postgres real:
 * la bandeja se filtra por lugar (una colonia o una localidad del municipio)
 * y por area responsable, y los conteos por estado y por area corresponden a
 * los filtros elegidos.
 *
 * El escenario de `calles.fixture` trae un reporte `RECIBIDO` en la
 * comisaria. Los otros dos -uno en un lugar sin calles y uno ya resuelto sin
 * area- y las areas se siembran por SQL: el alta de un reporte no permite
 * capturar el estado ni el area, y lo que este spec verifica son los filtros,
 * no el alta.
 */

type Sembrado = {
  enComisaria: string;
  enLugarVacio: string;
  resuelto: string;
  lugarAjeno: string;
};

let escenario: Scenario;
let sembrado: Sembrado;

const app = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");
  return postgres(url, { max: 1 });
};

const folioNuevo = (marca: string, nombre: string) =>
  `REP-FILTRO-${marca}-${nombre}`;

const insertarReporte = (
  tx: TransactionSql,
  opciones: {
    folio: string;
    lugarId: string;
    area: string | null;
    estado: string;
    usuarioId: string;
    conCalle: boolean;
  },
) =>
  tx<{ id: string }[]>`
    INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo, estado,
                          area_responsable, lugar_id, calle_id, descripcion,
                          registrado_por_usuario_id)
    VALUES (
      ${MUNICIPIOS.motul.id}, ${opciones.folio}, 2026,
      (SELECT COALESCE(MAX(consecutivo), 0) + 1 FROM reportes WHERE anio = 2026),
      'BACHE', ${opciones.estado}, ${opciones.area}, ${opciones.lugarId},
      ${opciones.conCalle ? escenario.reporteCalleId : null},
      'Reporte del filtro', ${opciones.usuarioId}
    )
    RETURNING id
  `;

const usuarioDeMotul = async (tx: TransactionSql, marca: string) => {
  await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
  const [usuario] = await tx<{ id: string }[]>`
    SELECT id FROM usuarios WHERE email = 'tesoreria@example.com' LIMIT 1
  `;
  await tx`
    UPDATE reportes SET area_responsable = 'OBRAS_PUBLICAS'
     WHERE folio = ${escenario.folio}
  `;
  await insertarReporte(tx, {
    folio: folioNuevo(marca, "VACIO"),
    lugarId: escenario.vacioId,
    area: "ALUMBRADO_PUBLICO",
    estado: "RECIBIDO",
    usuarioId: usuario?.id ?? "",
    conCalle: false,
  });
  await insertarReporte(tx, {
    folio: folioNuevo(marca, "RESUELTO"),
    lugarId: escenario.origenId,
    area: null,
    estado: "RESUELTO",
    usuarioId: usuario?.id ?? "",
    conCalle: true,
  });
};

const lugarDeTicul = async (tx: TransactionSql, marca: string) => {
  await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.ticul.id}, true)`;
  const [lugar] = await tx<{ id: string }[]>`
    INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
    VALUES (${MUNICIPIOS.ticul.id}, 'comisaria', ${`Comisaria ajena ${marca}`})
    RETURNING id
  `;
  return lugar?.id ?? "";
};

const sembrarFiltros = async (): Promise<Sembrado> => {
  const marca = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const conexion = await app();

  try {
    const lugarAjeno = await conexion.begin(async (tx) => {
      await usuarioDeMotul(tx, marca);
      return lugarDeTicul(tx, marca);
    });

    return {
      enComisaria: escenario.folio,
      enLugarVacio: folioNuevo(marca, "VACIO"),
      resuelto: folioNuevo(marca, "RESUELTO"),
      lugarAjeno,
    };
  } finally {
    await conexion.end();
  }
};

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
  sembrado = await sembrarFiltros();
});

test.beforeEach(liberarVentanaDeRitmo);

const conteos = (page: Parameters<typeof accederAMotul>[0]) =>
  page.getByRole("region", { name: "Conteos de reportes" });

const porEstado = (page: Parameters<typeof accederAMotul>[0]) =>
  conteos(page).getByRole("list", { name: "Conteo por estado" });

const porArea = (page: Parameters<typeof accederAMotul>[0]) =>
  conteos(page).getByRole("list", { name: "Conteo por área" });

/** El unico parrafo de la tarjeta es el total, debajo de su encabezado. */
const total = (page: Parameters<typeof accederAMotul>[0]) =>
  conteos(page).getByRole("paragraph");

const fila = (page: Parameters<typeof accederAMotul>[0], folio: string) =>
  page.getByRole("link", { name: new RegExp(folio) });

const aplicar = async (
  page: Parameters<typeof accederAMotul>[0],
  consulta: string,
) => {
  await page.goto(urlDe("motul", `/reportes${consulta}`));
};

test("el lugar y el área filtran la bandeja y los conteos acompañan", async ({
  page,
}) => {
  await accederAMotul(page);

  // Por lugar: la comisaría del escenario. Los conteos se afirman acotados a
  // sus lugares y no sobre el municipio entero: otro spec siembra en Motul
  // durante la misma corrida y un total absoluto seria una prueba fragil.
  await aplicar(page, `?lugar=${escenario.origenId}`);
  await expect(fila(page, sembrado.enComisaria)).toBeVisible();
  await expect(fila(page, sembrado.resuelto)).toBeVisible();
  await expect(fila(page, sembrado.enLugarVacio)).toHaveCount(0);
  await expect(porEstado(page)).toContainText("Recibido 1");
  await expect(porEstado(page)).toContainText("Resuelto 1");
  await expect(porEstado(page)).toContainText("En atención 0");
  await expect(porArea(page)).toContainText("Obras públicas 1");
  await expect(porArea(page)).toContainText("Sin asignar 1");
  await expect(total(page)).toHaveText("2");

  // Por área, dentro del mismo lugar: una sola fila y un solo renglón de área.
  await aplicar(page, `?lugar=${escenario.origenId}&area=OBRAS_PUBLICAS`);
  await expect(fila(page, sembrado.enComisaria)).toBeVisible();
  await expect(fila(page, sembrado.resuelto)).toHaveCount(0);
  await expect(porArea(page)).toContainText("Obras públicas 1");
  await expect(porArea(page)).not.toContainText("Sin asignar");
  await expect(total(page)).toHaveText("1");

  // El lugar sin calles, con su propio conteo: el filtro de lugar no es el
  // de la comisaria de arriba.
  await aplicar(page, `?lugar=${escenario.vacioId}`);
  await expect(fila(page, sembrado.enLugarVacio)).toBeVisible();
  await expect(fila(page, sembrado.enComisaria)).toHaveCount(0);
  await expect(porArea(page)).toContainText("Alumbrado público 1");
  await expect(total(page)).toHaveText("1");

  // Y el mismo par de filtros por el formulario, para probar que los dos
  // `<select>` viajan en un solo GET.
  await aplicar(page, "");
  await page
    .getByRole("combobox", { name: "Lugar" })
    .selectOption(escenario.origenId);
  await page
    .getByRole("combobox", { name: "Área" })
    .selectOption("OBRAS_PUBLICAS");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(
    new RegExp(`lugar=${escenario.origenId}&area=OBRAS_PUBLICAS`),
  );
  await expect(page.getByText("Lugar:")).toBeVisible();
  await expect(page.getByText("Área: Obras públicas")).toBeVisible();
});

test("un lugar de otro municipio no muestra nada ajeno ni vacía la bandeja", async ({
  page,
}) => {
  await accederAMotul(page);
  await aplicar(page, `?lugar=${sembrado.lugarAjeno}`);

  // El id no pertenece a los lugares del municipio: no entra como filtro.
  await expect(fila(page, sembrado.enComisaria)).toBeVisible();
  await expect(fila(page, sembrado.enLugarVacio)).toBeVisible();
  await expect(page.getByText("Lugar:")).toHaveCount(0);
});
