import { randomUUID } from "node:crypto";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * El listado agrupado por rol de
 * `design/usuarios-listado/02-agrupado-por-rol.html` (S2 a S5 y S13-S14 de
 * `usuarios-ux`) en el navegador, que es el único lugar donde se pueden
 * probar tres cosas: que el acordeón nativo sea exclusivo, que el aviso de la
 * baja se muestre una sola vez —incluso sin JavaScript, donde no hay nada más
 * que lo pueda limpiar— y que recargar no lo repita.
 *
 * Las cuentas se siembran en la base y no por el alta del panel: lo que se
 * prueba acá es el listado, y cuatro altas por la UI tardan más que todo el
 * resto del test junto.
 */

const MOTUL = comoAyuntamientoId(MUNICIPIOS.motul.id);
const CLAVE = "clave-larga-y-buena";

const marca = () => randomUUID().slice(0, 8);

type Sembrada = { id: string; nombre: string; correo: string };

const sembrar = async (
  nombre: string,
  rol: "OPERADOR" | "CONSULTA",
  semilla: string,
): Promise<Sembrada> => {
  const correo = `listado-${semilla}-${randomUUID()}@example.com`;
  const { id } = await withTenant(MOTUL, (tx) =>
    altaDePersona(tx, MOTUL, { nombre, email: correo, clave: CLAVE, rol }),
  );

  return { id, nombre, correo };
};

const filaDe = (page: Page, correo: string) =>
  page.getByRole("listitem").filter({ hasText: correo });

/** El `<li>` de una cuenta y su `<details>`: el acordeón que es la fila. */
const acordeon = (page: Page, correo: string) =>
  filaDe(page, correo).locator("details");

/** S2: la cuenta entera es el acordeón, así que hay que abrirla antes. */
const abrirCuenta = async (page: Page, correo: string) => {
  await filaDe(page, correo).locator("summary").click();
};

// Un acceso por test y la ventana de ritmo por correo es de cinco intentos.
test.beforeEach(liberarVentanaDeRitmo);

const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

test("el listado agrupa por rol, cuenta, y cada cuenta es su propio acordeón", async ({
  page,
}) => {
  const semilla = marca();
  const primera = await sembrar(`Rosa Poot ${semilla}`, "OPERADOR", semilla);
  const segunda = await sembrar(
    `Wilberth Canul ${semilla}`,
    "OPERADOR",
    semilla,
  );
  await sembrar(`Pedro Uicab ${semilla}`, "CONSULTA", semilla);

  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios"));

  // S4: el conteo y el orden están escritos. Los tres números van anclados
  // porque los encabezados de cada grupo dicen «2 cuentas activas».
  await expect(page.getByText(/^\d+ cuentas$/)).toBeVisible();
  await expect(page.getByText(/^\d+ activas$/)).toBeVisible();
  await expect(page.getByText(/^\d+ de baja$/)).toBeVisible();
  await expect(page.getByText(/^Orden: las activas por rol/)).toBeVisible();

  // S4: cada rol es un bloque con lo que permite y a cuántas cuentas tiene.
  const operadores = page.getByRole("region", { name: /Operador/ });

  await expect(operadores).toContainText("cuentas activas");
  await expect(operadores).toContainText("No administra cuentas");
  await expect(page.getByRole("region", { name: /Consulta/ })).toContainText(
    "Solo lectura",
  );

  // S3: cada acción dice de quién es, dentro de la cuenta de esa persona.
  await expect(acordeon(page, primera.correo)).not.toHaveAttribute("open", "");

  await abrirCuenta(page, primera.correo);

  await expect(acordeon(page, primera.correo)).toHaveAttribute("open", "");
  await expect(
    filaDe(page, primera.correo).getByRole("button", {
      name: `Restablecer contraseña de ${primera.nombre}`,
    }),
  ).toBeVisible();
  await expect(
    filaDe(page, primera.correo).getByRole("button", {
      name: `Dar de baja a ${primera.nombre}`,
    }),
  ).toBeVisible();

  // S2: el `name` compartido los vuelve exclusivos: abrir otra cierra esta.
  await abrirCuenta(page, segunda.correo);

  await expect(acordeon(page, primera.correo)).not.toHaveAttribute("open", "");
  await expect(acordeon(page, segunda.correo)).toHaveAttribute("open", "");
  await expect(
    filaDe(page, segunda.correo).getByRole("button", {
      name: `Restablecer contraseña de ${segunda.nombre}`,
    }),
  ).toBeVisible();

  // S2: «Dar de baja» va al final, tras la casilla que nombra a la persona.
  await expect(
    filaDe(page, segunda.correo).getByRole("checkbox", {
      name: `Confirmo dar de baja a ${segunda.nombre}.`,
    }),
  ).toBeVisible();
});

test("al dar de baja, el aviso nombra a la persona y recargar no lo repite", async ({
  page,
}) => {
  const semilla = marca();
  const dadaDeBaja = await sembrar(`José May ${semilla}`, "OPERADOR", semilla);

  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios"));

  await abrirCuenta(page, dadaDeBaja.correo);
  await filaDe(page, dadaDeBaja.correo)
    .getByRole("checkbox", {
      name: `Confirmo dar de baja a ${dadaDeBaja.nombre}.`,
    })
    .check();
  await filaDe(page, dadaDeBaja.correo)
    .getByRole("button", { name: `Dar de baja a ${dadaDeBaja.nombre}` })
    .click();

  // S13 y S14: el nombre no viaja en la URL —solo el token—, y la isla de la
  // tarjeta la deja sin el token al pintar, para que recargar no sea un GET
  // con aviso: con JavaScript el borrado del proxy no llega al navegador
  // (`AGENTS.md`, nota de `usuarios`).
  await page.waitForURL(/\/usuarios/);
  await expect(page).not.toHaveURL(/[?&]aviso=/);
  expect(page.url()).not.toContain(encodeURIComponent(dadaDeBaja.nombre));

  // S13: el aviso dice de quién y desde cuándo.
  await expect(
    page.getByText(new RegExp(`Se dio de baja a ${dadaDeBaja.nombre}`)),
  ).toBeVisible();
  await expect(page.getByText(/Ya no puede entrar al panel/)).toBeVisible();

  // S5: la cuenta queda en su propia sección, con su fecha.
  const bajas = page.getByRole("region", { name: "Cuentas de baja" });

  await expect(bajas).toContainText(dadaDeBaja.nombre);
  await expect(bajas).toContainText("de baja desde el");

  // S14: la recarga no lo repite.
  await page.reload();

  await expect(page.getByText(/Se dio de baja a/)).toHaveCount(0);
  await expect(page.getByText(/recargar la página no lo repite/)).toHaveCount(
    0,
  );
});

test("sin JavaScript, el aviso de la baja se ve una vez y no vuelve al recargar", async ({
  browser,
}) => {
  const semilla = marca();
  const dadaDeBaja = await sembrar(
    `Aurelia Tzec ${semilla}`,
    "CONSULTA",
    semilla,
  );
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/usuarios"));

    // El acordeón es `<details>` nativo y el checkbox `required` también
    // frena el envío sin JavaScript.
    await abrirCuenta(page, dadaDeBaja.correo);
    await filaDe(page, dadaDeBaja.correo)
      .getByRole("checkbox", {
        name: `Confirmo dar de baja a ${dadaDeBaja.nombre}.`,
      })
      .check();
    await filaDe(page, dadaDeBaja.correo)
      .getByRole("button", { name: `Dar de baja a ${dadaDeBaja.nombre}` })
      .click();

    await page.waitForURL(/\/usuarios\?aviso=[0-9a-f-]+&ok=baja$/);

    const urlDelAviso = page.url();

    await expect(
      page.getByText(new RegExp(`Se dio de baja a ${dadaDeBaja.nombre}`)),
    ).toBeVisible();

    // Es la recarga la que prueba la regla: la cookie la consumió el proxy en
    // la petición anterior, y ninguna otra la puede borrar sin JavaScript.
    await page.reload();

    await expect(page.getByText(/Se dio de baja a/)).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Cuentas de baja" }),
    ).toContainText(dadaDeBaja.nombre);

    /**
     * S14: volver a la URL vieja —lo que hace el botón de atrás cuando pide
     * la página otra vez— tampoco lo anuncia: sin JavaScript la cookie ya se
     * consumió. Se pide la URL en vez de usar `goBack` porque el navegador
     * puede restaurar el documento ya pintado sin hacer una petición, y lo
     * que la regla prohíbe es que la petición vuelva a anunciarlo.
     */
    await page.goto(urlDelAviso);

    await expect(page.getByText(/Se dio de baja a/)).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});
