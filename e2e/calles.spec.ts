import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { CLAVE, CORREO, MUNICIPIOS, urlDe } from "./municipios";

type Scenario = {
  origenId: string;
  vacioId: string;
  movibleId: string;
  reporteCalleId: string;
  movible: string;
  duplicada: string;
  domicilio: string;
  reporte: string;
};

type IdRow = { id: string };

const marca = Date.now();
const consecutivo = 100000 + (marca % 100000);
const nombres = {
  origen: `Calles origen ${marca}`,
  destino: `Calles destino ${marca}`,
  vacio: `Calles vacio ${marca}`,
  libre: `Calle libre ${marca}`,
  movible: `Calle movible ${marca}`,
  domicilio: `Calle con domicilio ${marca}`,
  reporte: `Calle con reporte ${marca}`,
};

const filaAusente = (nombre: string): never => {
  throw new Error(`Falta fila de ${nombre} en el escenario E2E.`);
};

async function prepararEscenario(): Promise<Scenario> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [usuario = { id: filaAusente("usuario") }] = await tx<
        IdRow[]
      >`SELECT id FROM usuarios WHERE email = ${CORREO} LIMIT 1`;
      const insertarLugar = (tipo: string, nombre: string) =>
        tx<IdRow[]>`
          INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
          VALUES (${MUNICIPIOS.motul.id}, ${tipo}, ${nombre})
          RETURNING id
        `;
      const insertarCalle = (nombre: string, lugarId: string) =>
        tx<IdRow[]>`
          INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
          VALUES (${MUNICIPIOS.motul.id}, ${nombre}, ${lugarId})
          RETURNING id
        `;
      const [origen = { id: filaAusente("origen") }] = await insertarLugar(
        "cabecera",
        nombres.origen,
      );
      const [destino = { id: filaAusente("destino") }] = await insertarLugar(
        "comisaria",
        nombres.destino,
      );
      const [vacio = { id: filaAusente("vacio") }] = await insertarLugar(
        "comisaria",
        nombres.vacio,
      );
      const [movible = { id: filaAusente("movible") }] = await insertarCalle(
        nombres.movible,
        origen.id,
      );
      await insertarCalle(nombres.libre, origen.id);
      await insertarCalle(nombres.libre, destino.id);
      const [domicilio = { id: filaAusente("domicilio") }] =
        await insertarCalle(nombres.domicilio, origen.id);
      await tx`INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id) VALUES (${MUNICIPIOS.motul.id}, ${origen.id}, ${domicilio.id})`;
      const [reporte = { id: filaAusente("reporte") }] = await insertarCalle(
        nombres.reporte,
        origen.id,
      );
      await tx`
        INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo, estado, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
        VALUES (${MUNICIPIOS.motul.id}, ${`REP-E2E-${marca}`}, 2026, ${consecutivo}, 'BACHE', 'RECIBIDO', ${origen.id}, ${reporte.id}, 'Reporte de prueba', ${usuario.id})
      `;
      return {
        origenId: origen.id,
        vacioId: vacio.id,
        movibleId: movible.id,
        reporteCalleId: reporte.id,
        movible: nombres.movible,
        duplicada: nombres.libre,
        domicilio: nombres.domicilio,
        reporte: nombres.reporte,
      };
    });
  } finally {
    await app.end();
  }
}

async function acceder(page: Page) {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contrasenia").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(urlDe("motul"));
}

const territorio = (lugarId: string) =>
  `/territorio?raiz=${lugarId}&nodo=${lugarId}&vista=calles`;

async function abrirCalle(page: Page, lugarId: string, nombre: string) {
  await page.goto(urlDe("motul", territorio(lugarId)));
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
}

test("calles conserva el flujo nativo, los estados vacios y las reglas de baja", async ({
  page,
}) => {
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  const escenario = await prepararEscenario();
  await acceder(page);

  await page.goto(urlDe("motul", territorio(escenario.vacioId)));
  await expect(page.getByText(/no tiene calles todavia/)).toBeVisible();

  await abrirCalle(page, escenario.origenId, escenario.movible);
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Ubicar en el mapa" }).click();
  await expect(page.getByLabel("Latitud")).toBeVisible();
  await expect(page.getByLabel("Longitud")).toBeVisible();
  await page.getByRole("button", { name: "Guardar ubicacion" }).click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("link", { name: "Mover a otro lugar" }).click();
  await page
    .getByLabel("Nuevo lugar")
    .selectOption({ label: `${nombres.destino} (comisaria)` });
  await page.getByRole("button", { name: "Mover calle" }).click();
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/territorio");

  await abrirCalle(page, escenario.origenId, escenario.duplicada);
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Mover a otro lugar" }).click();
  await page
    .getByLabel("Nuevo lugar")
    .selectOption({ label: `${nombres.destino} (comisaria)` });
  await page.getByRole("button", { name: "Mover calle" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ya existe una calle" }),
  ).toBeVisible();

  await abrirCalle(page, escenario.origenId, escenario.domicilio);
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Dar de baja" }).click();
  await page
    .getByRole("button", {
      name: new RegExp(`Dar de baja ${escenario.domicilio}`),
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "tiene domicilios" }),
  ).toBeVisible();

  await abrirCalle(page, escenario.origenId, escenario.reporte);
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Dar de baja" }).click();
  await page
    .getByRole("button", {
      name: new RegExp(`Dar de baja ${escenario.reporte}`),
    })
    .click();
  await page.waitForLoadState("networkidle");
  expect(page.url()).toBe(urlDe("motul", "/territorio"));

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");
  const app = postgres(url, { max: 1 });
  try {
    const auditoria = await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      return tx<
        { accion: string }[]
      >`SELECT accion FROM bitacora WHERE entidad = 'calles' AND entidad_id IN (${escenario.movibleId}, ${escenario.reporteCalleId}) ORDER BY ocurrido_en`;
    });
    expect(auditoria.map((fila) => fila.accion)).toEqual(
      expect.arrayContaining([
        "UBICAR_CALLE",
        "REPARENTEAR_CALLE",
        "BAJA_CALLE",
      ]),
    );
  } finally {
    await app.end();
  }
});
