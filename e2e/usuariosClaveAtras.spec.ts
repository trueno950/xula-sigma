import { randomUUID } from "node:crypto";
import { expect, type Page, type Response, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S4 de `usuarios-seguridad` en el navegador, que es el único lugar donde se
 * puede probar: con JavaScript, salir de `/usuarios` sin pulsar «Ya la anoté»
 * y volver con «Atrás» **no** vuelve a pintar la contraseña temporal.
 *
 * El router de Next guarda el payload de la ruta y lo reutiliza al volver
 * (`node_modules/next/dist/docs/01-app/04-glossary.md:47`, Next 16.3.1), así
 * que lo que se afirma acá es sobre lo que viaja: el payload de la pantalla no
 * lleva la contraseña —la isla se la pide al Route Handler— y por eso «Atrás»
 * encuentra el estado «ya no se puede mostrar» en vez de la clave.
 *
 * No se espera `networkidle`: el panel mantiene abierto el stream de
 * `/eventos`, así que la red nunca queda ociosa.
 */

const NOMBRE = "Operadora de Mostrador";

const correoNuevo = () => `clave-atras-${randomUUID()}@example.com`;

const avisoDe = (page: Page, encabezado: string) =>
  page.getByRole("region", { name: encabezado });

/** La clave está en el segundo párrafo de la tarjeta: el primero la titula. */
const claveDe = async (page: Page) =>
  (
    await avisoDe(page, "Contraseña temporal").locator("p").nth(1).innerText()
  ).trim();

/**
 * Los cuerpos que el router recibe para `/usuarios`: la respuesta de la
 * Server Action y el payload que pide después. Es el material que se guarda en
 * la caché del router, así que es exactamente lo que no puede llevar la clave.
 */
const capturarLosPayloads = (page: Page, cuerpos: string[]): void => {
  page.on("response", (respuesta: Response) => {
    const peticion = respuesta.request();
    const esDelRouter =
      peticion.headers().rsc === "1" || peticion.headers()["next-action"];

    if (!esDelRouter || !respuesta.url().includes("/usuarios")) return;

    void respuesta
      .text()
      .then((cuerpo) => cuerpos.push(cuerpo))
      .catch(() => {});
  });
};

/** Un acceso por test y la ventana de ritmo por correo es de cinco intentos. */
test.beforeEach(liberarVentanaDeRitmo);

test("con JavaScript, volver con «Atrás» no vuelve a pintar la contraseña temporal (S4)", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios/alta"));
  await page.getByLabel("Nombre completo").fill(NOMBRE);
  await page.getByLabel("Correo").fill(correoNuevo());
  await page.getByLabel("Rol").selectOption("OPERADOR");

  const payloads: string[] = [];
  capturarLosPayloads(page, payloads);

  await page.getByRole("button", { name: "Dar de alta" }).click();

  const clave = await claveDe(page);
  expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);

  // Lo que el router guarda —y por lo tanto lo que puede restaurar sin pedir
  // nada— no lleva la contraseña: la trajo el `POST` de la isla.
  await expect.poll(() => payloads.length).toBeGreaterThan(0);
  expect(payloads.join("\n")).not.toContain(clave);

  // La operadora se va sin pulsar «Ya la anoté», como dice la spec. El enlace
  // del panel es una navegación del router, no una recarga: es la caché la
  // que está en juego.
  await page.getByRole("link", { name: "Padrón" }).click();
  await expect(page).toHaveURL(/\/padron/);
  expect(payloads.join("\n")).not.toContain(clave);

  await page.goBack();

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByText(clave)).toHaveCount(0);
  await expect(avisoDe(page, "Contraseña temporal")).toHaveCount(0);
  // Y dice por qué: es el mismo estado que la recarga sin JavaScript (S11).
  await expect(
    page.getByText(
      `La contraseña temporal de ${NOMBRE} ya no se puede mostrar.`,
    ),
  ).toBeVisible();
});
