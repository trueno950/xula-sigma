import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

type Recursos = {
  personaId: string;
  lugarId: string;
  calleId: string;
  domicilioId: string;
};

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

  return {
    personaId: persona.id,
    lugarId: lugar.id,
    ...(await sembrarCalleYDomicilio(tx, id, lugar.id, marca)),
  };
};

const sembrarCalleYDomicilio = async (
  tx: postgres.TransactionSql,
  ayuntamientoId: string,
  lugarId: string,
  marca: string,
) => {
  const [calle] = await tx<{ id: string }[]>`
    INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
    VALUES (${ayuntamientoId}, ${`Calle ${marca}`}, ${lugarId})
    RETURNING id
  `;
  if (!calle) throw new Error("Falta la siembra de recursos.");

  const [domicilio] = await tx<{ id: string }[]>`
    INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id)
    VALUES (${ayuntamientoId}, ${lugarId}, ${calle.id})
    RETURNING id
  `;
  if (!domicilio) throw new Error("Falta la siembra de recursos.");

  return {
    calleId: calle.id,
    domicilioId: domicilio.id,
  };
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

test("territorio responde 404 HTTP para nodo, calle y domicilio ajenos", async ({
  page,
}) => {
  await accederAMotul(page);

  const estadosAjenos = [
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.ajeno.lugarId}`,
    ),
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.propio.lugarId}&calle=${recursos.ajeno.calleId}`,
    ),
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.propio.lugarId}&domicilio=${recursos.ajeno.domicilioId}`,
    ),
  ];
  const estadosPropios = [
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.propio.lugarId}`,
    ),
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.propio.lugarId}&calle=${recursos.propio.calleId}`,
    ),
    await estadoDe(
      page,
      `/territorio?raiz=${recursos.propio.lugarId}&nodo=${recursos.propio.lugarId}&domicilio=${recursos.propio.domicilioId}`,
    ),
  ];

  expect(estadosAjenos).toEqual([404, 404, 404]);
  expect(estadosPropios).toEqual([200, 200, 200]);
});
