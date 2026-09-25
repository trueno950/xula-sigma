import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

type Recursos = { personaId: string; lugarId: string };

type Sembrado = { propio: Recursos; ajeno: Recursos };

const sembrarEn = async (
  tx: postgres.TransactionSql,
  municipio: keyof typeof MUNICIPIOS,
  marca: string,
): Promise<Recursos> => {
  const { id } = MUNICIPIOS[municipio];
  await tx`SELECT set_config('app.tenant', ${id}, true)`;
  const [persona] = await tx<{ id: string }[]>`
    INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, nombre_normalizado)
    VALUES (${id}, ${`Ajena ${marca}`}, 'Prueba', ${`ajena ${marca} prueba`})
    RETURNING id
  `;
  const [lugar] = await tx<{ id: string }[]>`
    INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
    VALUES (${id}, 'comisaria', ${`Comisaria ${marca}`})
    RETURNING id
  `;

  if (!persona || !lugar) throw new Error("Falta la siembra de recursos.");

  return { personaId: persona.id, lugarId: lugar.id };
};

async function sembrar(): Promise<Sembrado> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const marca = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => ({
      propio: await sembrarEn(tx, "motul", `motul-${marca}`),
      ajeno: await sembrarEn(tx, "ticul", `ticul-${marca}`),
    }));
  } finally {
    await app.end();
  }
}

let recursos: Sembrado;

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  recursos = await sembrar();
});

/**
 * El estado HTTP, no lo que se ve: la pantalla "No encontramos eso" salia
 * igual con 200 (Next ya habia enviado la cabecera cuando `notFound()`
 * corria, dentro del limite de `loading.tsx`) y ninguna asercion sobre el
 * contenido lo distingue. Un buscador o un chequeo de salud leen el estado.
 */
const estadoDe = async (
  page: Page,
  ruta: string,
): Promise<number | undefined> =>
  (await page.goto(urlDe("motul", ruta)))?.status();

test("la ficha de una persona da 404 si es de otro municipio o no existe", async ({
  page,
}) => {
  await accederAMotul(page);

  expect(await estadoDe(page, `/padron/${recursos.ajeno.personaId}`)).toBe(404);
  expect(await estadoDe(page, `/padron/${randomUUID()}`)).toBe(404);
  expect(await estadoDe(page, `/padron/${recursos.propio.personaId}`)).toBe(
    200,
  );
});

test("territorio con una raiz de otro municipio o inexistente da 404", async ({
  page,
}) => {
  await accederAMotul(page);

  expect(
    await estadoDe(page, `/territorio?raiz=${recursos.ajeno.lugarId}`),
  ).toBe(404);
  expect(await estadoDe(page, `/territorio?raiz=${randomUUID()}`)).toBe(404);
  expect(
    await estadoDe(page, `/territorio?raiz=${recursos.propio.lugarId}`),
  ).toBe(200);
  expect(await estadoDe(page, "/territorio")).toBe(200);
});
