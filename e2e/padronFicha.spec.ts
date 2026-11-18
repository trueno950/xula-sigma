import { randomBytes } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S8-S12 de `padron-ux` en la ficha de una persona: las pestañas como
 * enlaces con estado en la URL, el acordeón de acciones, la corrección de
 * datos, la baja y la fusión alcanzables, y nada debajo de la barra
 * inferior del teléfono.
 *
 * Se siembra a mano -y no por la aplicación- porque el escenario necesita a
 * la vez una persona con residencia vigente, una corregible, una de baja y
 * dos personas parecidas entre sí para que la fusión tenga candidatas.
 */
type Escenario = {
  conResidenciaId: string;
  aCorregirId: string;
  aDarDeBajaId: string;
  fusionableId: string;
  duplicadaId: string;
  nombreDe: (persona: "conResidencia" | "aCorregir" | "aDarDeBaja") => string;
  filaDeLaBaja: string;
  etiquetaDeLaDuplicada: string;
};

let escenario: Escenario;

const conBase = async <T>(
  consulta: (tx: TransactionSql) => Promise<T>,
): Promise<Awaited<T>> => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de la ficha.");

  const app = postgres(url, { max: 1 });
  try {
    return (await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      return consulta(tx);
    })) as Awaited<T>;
  } finally {
    await app.end();
  }
};

const insertarPersona = async (
  tx: TransactionSql,
  nombres: string,
  primerApellido: string,
  segundoApellido: string | null,
): Promise<string> => {
  const completo = `${nombres} ${primerApellido} ${segundoApellido ?? ""}`;
  const [fila] = await tx<{ id: string }[]>`
    INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, segundo_apellido, nombre_normalizado)
    VALUES (
      ${MUNICIPIOS.motul.id}, ${nombres}, ${primerApellido}, ${segundoApellido},
      ${completo.trim().toLowerCase()}
    )
    RETURNING id
  `;
  if (!fila) throw new Error("No se pudo sembrar la persona.");
  return fila.id;
};

test.beforeAll(async () => {
  const marca = randomBytes(3).toString("hex");

  escenario = await conBase(async (tx) => {
    const [asentamiento] = await tx<{ id: string }[]>`
      INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
      VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${`Asentamiento ficha ${marca}`})
      RETURNING id
    `;
    if (!asentamiento) throw new Error("No se pudo sembrar el asentamiento.");

    const [calle] = await tx<{ id: string }[]>`
      INSERT INTO calles (ayuntamiento_id, lugar_id, nombre)
      VALUES (${MUNICIPIOS.motul.id}, ${asentamiento.id}, ${`Calle ficha ${marca}`})
      RETURNING id
    `;
    if (!calle) throw new Error("No se pudo sembrar la calle.");

    const [domicilio] = await tx<{ id: string }[]>`
      INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
      VALUES (${MUNICIPIOS.motul.id}, ${asentamiento.id}, ${calle.id}, '20')
      RETURNING id
    `;
    if (!domicilio) throw new Error("No se pudo sembrar el domicilio.");

    const conResidenciaId = await insertarPersona(
      tx,
      `Ficha${marca}`,
      "Conresidencia",
      null,
    );
    await tx`
      INSERT INTO residencias (ayuntamiento_id, persona_id, domicilio_id, desde_en)
      VALUES (${MUNICIPIOS.motul.id}, ${conResidenciaId}, ${domicilio.id}, '2026-01-15')
    `;

    const fusionableId = await insertarPersona(
      tx,
      `Fusionable${marca}`,
      "Prueba",
      null,
    );
    const duplicadaId = await insertarPersona(
      tx,
      `Fusionable${marca}`,
      "Prueba",
      "Duplicada",
    );

    return {
      conResidenciaId,
      aCorregirId: await insertarPersona(
        tx,
        `Corregible${marca}`,
        "Antes",
        null,
      ),
      aDarDeBajaId: await insertarPersona(tx, `Baja${marca}`, "Persona", null),
      fusionableId,
      duplicadaId,
      filaDeLaBaja: `Persona, Baja${marca}`,
      nombreDe: (persona) =>
        persona === "conResidencia"
          ? `Ficha${marca} Conresidencia`
          : persona === "aCorregir"
            ? `Corregible${marca} Antes`
            : `Baja${marca} Persona`,
      etiquetaDeLaDuplicada: `Fusionable${marca} Prueba Duplicada · Sin CURP`,
    };
  });
});

const abrirFicha = (page: Page, personaId: string) =>
  page.goto(urlDe("motul", `/padron/${personaId}`));

const pliegue = (page: Page, texto: string) =>
  page.locator("summary", { hasText: texto });

const bajaDeLaPersona = () =>
  conBase(async (tx) => {
    const [fila] = await tx<{ bajaEn: Date | null }[]>`
      SELECT baja_en AS "bajaEn" FROM personas
       WHERE id = ${escenario.aDarDeBajaId}
    `;
    return fila?.bajaEn ?? null;
  });

test("la ficha abre en Residencias y las pestañas son enlaces con su estado en la URL", async ({
  page,
}, info) => {
  await accederAMotul(page);
  await abrirFicha(page, escenario.conResidenciaId);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: escenario.nombreDe("conResidencia"),
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Residencias" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Historial de residencias" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vigente", { exact: true }).first(),
  ).toBeVisible();

  await info.attach("ficha-nueva-1440.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("link", { name: "Administrar" }).click();

  await expect(page).toHaveURL(/\?pestana=administrar$/);
  await expect(
    page.getByRole("heading", { name: "Administrar la ficha" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Administrar" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await pliegue(page, "Corregir datos…").click();
  await expect(page.getByLabel("Primer apellido")).toBeVisible();

  await info.attach("ficha-nueva-administrar-1440.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("sin JavaScript las pestañas siguen navegando", async ({ browser }) => {
  const conSesion = await browser.newContext();
  const paginaConSesion = await conSesion.newPage();
  await accederAMotul(paginaConSesion);
  const estadoDeSesion = await conSesion.storageState();
  await conSesion.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estadoDeSesion,
  });
  const page = await contexto.newPage();

  try {
    await page.goto(
      urlDe(
        "motul",
        `/padron/${escenario.conResidenciaId}?pestana=administrar`,
      ),
    );
    await expect(
      page.getByRole("heading", { name: "Administrar la ficha" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Residencias" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/padron/${escenario.conResidenciaId}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Historial de residencias" }),
    ).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("abrir un pliegue de Administrar cierra el otro", async ({ page }) => {
  await accederAMotul(page);
  await abrirFicha(page, escenario.conResidenciaId);
  await page.getByRole("link", { name: "Administrar" }).click();

  await pliegue(page, "Corregir datos…").click();
  await expect(page.getByLabel("Primer apellido")).toBeVisible();
  await expect(page.getByLabel("Domicilio", { exact: true })).toBeHidden();

  await pliegue(page, "Dar de baja…").click();

  await expect(page.getByLabel("Primer apellido")).toBeHidden();
  await expect(page.getByRole("button", { name: "Dar de baja" })).toBeVisible();
});

test("corregir los datos guarda y vuelve a la ficha con lo guardado", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirFicha(page, escenario.aCorregirId);
  await page.getByRole("link", { name: "Administrar" }).click();
  await pliegue(page, "Corregir datos…").click();

  await page.getByLabel("Primer apellido").fill("Despues");
  await Promise.all([
    page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === "POST" &&
        new URL(respuesta.url()).pathname ===
          `/padron/${escenario.aCorregirId}`,
    ),
    page.getByRole("button", { name: "Guardar cambios" }).click(),
  ]);

  await expect
    .poll(() =>
      conBase(async (tx) => {
        const [fila] = await tx<{ primerApellido: string }[]>`
          SELECT primer_apellido AS "primerApellido" FROM personas
           WHERE id = ${escenario.aCorregirId}
        `;
        return fila?.primerApellido ?? null;
      }),
    )
    .toBe("Despues");

  await expect(page).toHaveURL(/\?pestana=administrar$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: escenario.nombreDe("aCorregir").replace("Antes", "Despues"),
    }),
  ).toBeVisible();
});

test("dar de baja saca a la persona del listado del padrón", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/padron?q=${escenario.filaDeLaBaja}`));
  // `exact` porque S3 de `padron-ux` repite la busqueda en la linea de
  // resultado y en el chip: las tres apariciones son el mismo texto.
  await expect(
    page.getByText(escenario.filaDeLaBaja, { exact: true }),
  ).toBeVisible();

  await abrirFicha(page, escenario.aDarDeBajaId);
  await page.getByRole("link", { name: "Administrar" }).click();
  await pliegue(page, "Dar de baja…").click();

  await expect(
    page.getByText(
      /Se da de baja a Baja\w* Persona del padrón.*Su historial de residencias se conserva\./,
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Dar de baja" }).click();
  await page.waitForURL(/\/padron$/);

  // La misma búsqueda que la encontraba ya no devuelve a nadie: el padrón
  // excluye a quien tiene la baja puesta.
  await page.goto(urlDe("motul", `/padron?q=${escenario.filaDeLaBaja}`));
  await expect(page.getByText("Sin resultados para")).toBeVisible();
  expect(await bajaDeLaPersona()).not.toBeNull();
});

test("la fusión se alcanza desde la ficha y elige la duplicada por nombre", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirFicha(page, escenario.fusionableId);
  await page.getByRole("link", { name: "Administrar" }).click();
  await pliegue(page, "Fusionar con otra persona…").click();

  const select = page.getByLabel(
    "Persona a fusionar (queda marcada, no se borra)",
  );
  // Las personas parecidas son varias; la de esta corrida es una sola.
  expect(await select.locator("option").count()).toBeGreaterThan(1);
  await expect(
    select
      .locator("option")
      .filter({ hasText: escenario.etiquetaDeLaDuplicada }),
  ).toHaveCount(1);
  await select.selectOption({ label: escenario.etiquetaDeLaDuplicada });

  await Promise.all([
    page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === "POST" &&
        new URL(respuesta.url()).pathname ===
          `/padron/${escenario.fusionableId}`,
    ),
    page.getByRole("button", { name: "Fusionar" }).click(),
  ]);

  await expect
    .poll(() =>
      conBase(async (tx) => {
        const [fila] = await tx<{ fusionadaEn: Date | null }[]>`
          SELECT fusionada_en AS "fusionadaEn" FROM personas
           WHERE id = ${escenario.duplicadaId}
        `;
        return fila?.fusionadaEn ?? null;
      }),
    )
    .not.toBeNull();
});

test("a 390px nada de la ficha queda debajo de la barra inferior", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await accederAMotul(page);
  await abrirFicha(page, escenario.conResidenciaId);
  await page.getByRole("link", { name: "Administrar" }).click();
  await pliegue(page, "Dar de baja…").click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const barra = page.getByRole("navigation", { name: "Navegación principal" });
  const ultimo = page.getByRole("button", { name: "Dar de baja" });
  await expect(ultimo).toBeVisible();

  const cajaDeLaBarra = await barra.boundingBox();
  const cajaDelUltimo = await ultimo.boundingBox();
  if (!cajaDeLaBarra || !cajaDelUltimo)
    throw new Error("La barra inferior o el botón no se dibujaron.");

  expect(cajaDelUltimo.y + cajaDelUltimo.height).toBeLessThanOrEqual(
    cajaDeLaBarra.y,
  );

  await info.attach("ficha-nueva-390.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
