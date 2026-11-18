import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S4, S5 y S6 de `constancias-ux` sobre la pantalla de emision, contra la
 * aplicacion construida: la busqueda de la persona es un GET nativo y se
 * puede pedir en frio, la hoja que se aprueba antes de confirmar dice el
 * texto de la plantilla, y el aviso del tiempo de residencia esta a la vista.
 *
 * S10: el envio sigue siendo el POST nativo del formulario -sin
 * `"use client"`-, asi que la ultima prueba emite de verdad y verifica que la
 * constancia exista.
 */

type IdRow = { id: string };

type TitularSembrado = {
  personaId: string;
  nombre: string;
  apellido: string;
  calle: string;
  dadoDeBajaId: string;
  dadoDeBajaApellido: string;
};

const exigir = <T>(fila: T | undefined, concepto: string): T => {
  if (!fila) throw new Error(`Falta fila de ${concepto} en el escenario.`);
  return fila;
};

/**
 * Siembra un titular con residencia vigente y su vecino dado de baja, mas el
 * bloque de firma del municipio. `desde_en` es relativo a hoy: la duracion
 * del aviso se calcula al renderizar, y una fecha fija haria que la prueba
 * dijera otra cosa cada mes.
 */
async function sembrarTitular(): Promise<TitularSembrado> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de constancias.");

  const marca = randomBytes(4).toString("hex");
  const apellido = `Xocoyol${marca}`;
  const dadoDeBajaApellido = `Xocoyol${marca}baja`;
  const calle = `Calle Emision ${marca}`;
  const app = postgres(url, { max: 1 });

  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;

      await tx`
        INSERT INTO configuracion_de_documentos (ayuntamiento_id, datos)
        VALUES (${MUNICIPIOS.motul.id}, ${tx.json({
          firmanteNombre: "Maria Poot Canul",
          firmanteCargo: "Secretaria Municipal",
        })})
        ON CONFLICT (ayuntamiento_id) DO UPDATE SET datos = excluded.datos
      `;

      // `comisaria` y no `cabecera`: `lugares_una_cabecera` solo admite una
      // raiz viva por municipio y `calles.spec.ts` ya se queda con ella.
      const [asentamiento] = await tx<IdRow[]>`
        INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
        VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${`Comisaria Emision ${marca}`})
        RETURNING id
      `;
      const lugarId = exigir(asentamiento, "asentamiento").id;
      const [colonia] = await tx<IdRow[]>`
        INSERT INTO lugares (ayuntamiento_id, tipo, nombre, padre_id)
        VALUES (${MUNICIPIOS.motul.id}, 'colonia', ${`Colonia Emision ${marca}`}, ${lugarId})
        RETURNING id
      `;
      const [via] = await tx<IdRow[]>`
        INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
        VALUES (${MUNICIPIOS.motul.id}, ${calle}, ${lugarId})
        RETURNING id
      `;
      const calleId = exigir(via, "calle").id;

      const [domicilio] = await tx<IdRow[]>`
        INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
        VALUES (${MUNICIPIOS.motul.id}, ${exigir(colonia, "colonia").id}, ${calleId}, '101')
        RETURNING id
      `;

      const [titular] = await tx<IdRow[]>`
        INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, nombre_normalizado)
        VALUES (${MUNICIPIOS.motul.id}, 'Jose Armando', ${apellido}, ${`jose armando ${apellido}`.toLowerCase()})
        RETURNING id
      `;
      const personaId = exigir(titular, "titular").id;

      await tx`
        INSERT INTO residencias (ayuntamiento_id, persona_id, domicilio_id, desde_en)
        VALUES (${MUNICIPIOS.motul.id}, ${personaId}, ${exigir(domicilio, "domicilio").id},
          CURRENT_DATE - 40)
      `;

      const [deBaja] = await tx<IdRow[]>`
        INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, nombre_normalizado, baja_en)
        VALUES (${MUNICIPIOS.motul.id}, 'Maria', ${dadoDeBajaApellido},
          ${`maria ${dadoDeBajaApellido}`.toLowerCase()}, now())
        RETURNING id
      `;

      return {
        personaId,
        nombre: "Jose Armando",
        apellido,
        calle,
        dadoDeBajaId: exigir(deBaja, "persona dada de baja").id,
        dadoDeBajaApellido,
      };
    });
  } finally {
    await app.end();
  }
}

let titular: TitularSembrado;

test.beforeAll(async () => {
  titular = await sembrarTitular();
});

/** El buscador vive en la propia pantalla: sin persona elegida ya no es un callejon. */
test("sin persona elegida la pantalla busca en el padron con un GET nativo", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/constancias/emitir"));

  const formulario = page.locator('form[method="get"]');

  await expect(formulario).toHaveCount(1);
  await expect(formulario.locator('input[name="q"]')).toHaveCount(1);
  await expect(formulario.getByLabel("Buscar persona")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver el padrón completo" }),
  ).toBeVisible();

  await page.goto(urlDe("motul", `/constancias/emitir?q=${titular.apellido}`));

  const resultado = page.getByRole("link", {
    name: new RegExp(titular.apellido),
  });
  await expect(resultado).toHaveCount(1);
  await expect(resultado).toHaveAttribute(
    "href",
    `/constancias/emitir?personaId=${titular.personaId}`,
  );
});

/**
 * A quien esta dado de baja no se le puede emitir: tampoco se ofrece. Los dos
 * apellidos comparten el prefijo, asi que la busqueda trae al titular vivo
 * -con el queda probado que la lista se pinto- y deja fuera al de baja.
 */
test("el buscador no ofrece a quien esta dado de baja", async ({ page }) => {
  await accederAMotul(page);
  await page.goto(
    urlDe("motul", `/constancias/emitir?q=${titular.dadoDeBajaApellido}`),
  );

  await expect(page.locator(`a[href*="${titular.personaId}"]`)).toHaveCount(1);
  await expect(page.locator(`a[href*="${titular.dadoDeBajaId}"]`)).toHaveCount(
    0,
  );
  await expect(page.getByText(titular.dadoDeBajaApellido)).toHaveCount(0);
});

/** S5 y S6: la hoja que se va a imprimir, y cuanto lleva la persona ahi. */
test("con persona elegida se ve la hoja y el aviso del tiempo de residencia", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(
    urlDe("motul", `/constancias/emitir?personaId=${titular.personaId}`),
  );

  const hoja = page.getByRole("article");

  await expect(hoja).toHaveCount(1);
  await expect(hoja).toContainText("Constancia de vecindad");
  await expect(hoja).toContainText("Quien suscribe hace constar que");
  await expect(hoja).toContainText(titular.apellido);
  await expect(hoja).toContainText(titular.calle);
  await expect(hoja).toContainText("Maria Poot Canul");
  await expect(hoja).toContainText("Secretaria Municipal");

  const aviso = page.getByText(/Reside ahí desde el/);

  await expect(aviso).toContainText("El sistema no aplica un periodo mínimo");
  // La duracion se calcula contra hoy, asi que se fija su forma y no su
  // valor: 40 dias atras siempre cae en «1 mes y N días».
  await expect(aviso).toContainText(/1 mes y \d+ días/);
});

/** S10: la emision sigue siendo el POST nativo del formulario. */
test("el formulario de emision sigue emitiendo sin JavaScript de por medio", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(
    urlDe("motul", `/constancias/emitir?personaId=${titular.personaId}`),
  );

  await page.getByRole("button", { name: "Emitir constancia" }).click();

  await page.waitForURL(/\/constancias\/[0-9a-f-]{36}$/);

  const constancia = await leerConstanciaDelTitular(titular.personaId);

  expect(constancia?.folio).toMatch(/^VEC-\d{4}-\d{6}$/);
  expect(constancia?.nombreDelTitular).toContain(titular.apellido);
});

/** La constancia guardada, leida por SQL: lo que el navegador dice y lo que quedo. */
async function leerConstanciaDelTitular(
  personaId: string,
): Promise<{ folio: string; nombreDelTitular: string } | null> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de constancias.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [fila] = await tx<{ folio: string; nombreDelTitular: string }[]>`
        SELECT folio, datos->'titular'->>'nombreCompleto' AS "nombreDelTitular"
          FROM constancias
         WHERE persona_id = ${personaId}
         ORDER BY emitida_en DESC
         LIMIT 1
      `;
      return fila ?? null;
    });
  } finally {
    await app.end();
  }
}
