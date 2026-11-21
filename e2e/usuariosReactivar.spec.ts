import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { altaDePersona } from "@/shared/auth/alta";
import { verificarClave } from "@/shared/auth/contrasenia";
import { cuentas } from "@/shared/auth/esquema";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul, accederConClave } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S3 en el navegador, que es el único lugar donde se pueden probar las tres
 * cosas juntas: que el formulario nativo de la sección de bajas funcione sin
 * JavaScript, que la contraseña nueva se muestre una sola vez en la tarjeta
 * de «Ya la anoté» y que la persona vuelva a entrar con ella y quede
 * obligada a cambiarla (S2).
 *
 * Lo que se comprueba contra la base es la mitad que la pantalla no puede
 * decir: el hash guardado corresponde a la clave dictada, la anterior ya no
 * verifica y la marca `clave_temporal_en` quedó puesta —que es lo que hace
 * que la pantalla de cambio sea obligatoria—.
 *
 * La cuenta se siembra en la base y se da de baja por la UI: el alta por el
 * panel cuesta más que todo el test junto y ya tiene su propio E2E.
 */

const MOTUL = comoAyuntamientoId(MUNICIPIOS.motul.id);
const CLAVE_VIEJA = "clave-larga-y-vieja";
const CLAVE_PROPIA = "propia-larga-y-elegida";
const RUTA_DEL_CAMBIO = urlDe("motul", "/cambiar-contrasenia");

const sembrar = async () => {
  const nombre = `Operadora Reactivada ${randomUUID().slice(0, 8)}`;
  const correo = `reactivar-${randomUUID()}@example.com`;

  const { id } = await withTenant(MOTUL, (tx) =>
    altaDePersona(tx, MOTUL, {
      nombre,
      email: correo,
      clave: CLAVE_VIEJA,
      rol: "OPERADOR",
    }),
  );

  return { id, nombre, correo };
};

const credencialDe = (usuarioId: string) =>
  withTenant(MOTUL, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

const bajas = (page: Parameters<typeof accederAMotul>[0]) =>
  page.getByRole("region", { name: "Cuentas de baja" });

const darDeBaja = async (
  page: Parameters<typeof accederAMotul>[0],
  persona: { nombre: string; correo: string },
) => {
  await page.goto(urlDe("motul", "/usuarios"));

  const fila = page
    .getByRole("listitem")
    .filter({ hasText: persona.correo })
    .locator("summary");

  await fila.click();
  await page
    .getByRole("checkbox", {
      name: `Confirmo dar de baja a ${persona.nombre}.`,
    })
    .check();
  await page
    .getByRole("button", { name: `Dar de baja a ${persona.nombre}` })
    .click();
  await page.waitForURL(/\/usuarios/);
};

/**
 * El cambio obligatorio de la clave en la segunda pestaña.
 *
 * **Con su propio diagnóstico.** Si el envío no redirige, el fallo genérico de
 * Playwright captura la `page` del test —la del administrador, en `/usuarios`—
 * y no dice nada de la pestaña que falló. Acá se deja su URL, su estado y su
 * texto en el mensaje, y una captura en `/tmp`.
 */
const cambiarLaClave = async (
  page: Parameters<typeof accederConClave>[0],
  nueva: string,
) => {
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(nueva);
  await page
    .getByLabel("Repita la contraseña nueva", { exact: true })
    .fill(nueva);

  const envio = page.waitForResponse(
    (respuesta) =>
      respuesta.request().method() === "POST" &&
      !respuesta.url().includes("/api/auth/"),
    { timeout: 15_000 },
  );

  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  try {
    await page.waitForURL(urlDe("motul"), { timeout: 15_000 });
  } catch (error) {
    const respuesta = await envio.catch(() => null);
    await page
      .screenshot({ path: `/tmp/reactivar-cambio-${Date.now()}.png` })
      .catch(() => {});

    throw new Error(
      [
        `El cambio de clave no volvió al panel: ${String(error).slice(0, 200)}`,
        `url=${page.url()}`,
        `respuesta=${respuesta?.status() ?? "sin respuesta"} ${respuesta?.url() ?? ""}`,
        `texto=${(await page.locator("body").innerText()).slice(0, 800)}`,
      ].join("\n"),
    );
  }
};

// Un acceso por test y la ventana de ritmo por correo es de cinco intentos.
test.beforeEach(liberarVentanaDeRitmo);

test("reactivar devuelve la cuenta con una temporal nueva que se muestra una sola vez", async ({
  page,
}) => {
  const persona = await sembrar();

  await accederAMotul(page);
  await darDeBaja(page, persona);

  await expect(bajas(page)).toContainText(persona.nombre);

  // S3: la confirmación nombra a la persona, igual que la de la baja.
  await bajas(page)
    .getByRole("checkbox", { name: `Confirmo reactivar a ${persona.nombre}.` })
    .check();
  await bajas(page)
    .getByRole("button", { name: `Reactivar cuenta de ${persona.nombre}` })
    .click();

  await page.waitForURL(/\/usuarios/);

  const tarjeta = page.getByRole("region", {
    name: "Contraseña temporal de reactivación",
  });

  await expect(tarjeta).toContainText(persona.nombre);

  const clave = (await tarjeta.locator("p").nth(1).innerText()).trim();

  expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);
  // La clave no viaja en la URL, y el token se limpia al pintar.
  expect(page.url()).not.toContain(clave);
  await expect(page).not.toHaveURL(/[?&]clave=/);

  // La cuenta sale de la sección de bajas: otras bajas pueden quedar de
  // otros tests, así que se afirma por persona y no por sección vacía.
  await expect(bajas(page).getByText(persona.nombre)).toHaveCount(0);

  const credencial = await credencialDe(persona.id);

  expect(credencial?.claveTemporalEn).toBeInstanceOf(Date);
  expect(await verificarClave(credencial?.password ?? "", clave)).toBe(true);
  // S3: la contraseña anterior no vuelve a servir.
  expect(await verificarClave(credencial?.password ?? "", CLAVE_VIEJA)).toBe(
    false,
  );

  // S2: entra con la temporal y la pantalla la obliga a cambiarla.
  const otro = await page.context().browser()?.newContext();
  const otraPagina = await otro?.newPage();
  if (!otro || !otraPagina) throw new Error("Sin contexto de navegador.");

  try {
    await accederConClave(otraPagina, {
      correo: persona.correo,
      clave,
      espera: RUTA_DEL_CAMBIO,
    });
    await cambiarLaClave(otraPagina, CLAVE_PROPIA);
  } finally {
    await otro.close();
  }

  // La temporal de la reactivación ya no sirve, y la propia sí.
  const despues = await credencialDe(persona.id);

  expect(despues?.claveTemporalEn).toBeNull();
  expect(await verificarClave(despues?.password ?? "", CLAVE_PROPIA)).toBe(
    true,
  );
  expect(await verificarClave(despues?.password ?? "", clave)).toBe(false);

  await otro.close();
});

test("sin JavaScript, la tarjeta de la reactivación también se muestra una vez", async ({
  browser,
}) => {
  const persona = await sembrar();
  const conJs = await browser.newContext();

  await accederAMotul(await conJs.newPage());
  await darDeBaja(await conJs.newPage(), persona);

  const estado = await conJs.storageState();

  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/usuarios"));

    // Sin JavaScript el `<form>` sigue siendo el POST nativo y la casilla
    // `required` es la única confirmación que hay.
    await bajas(page)
      .getByRole("checkbox", {
        name: `Confirmo reactivar a ${persona.nombre}.`,
      })
      .check();
    await bajas(page)
      .getByRole("button", { name: `Reactivar cuenta de ${persona.nombre}` })
      .click();

    await page.waitForURL(/\/usuarios\?clave=[0-9a-f-]+&ok=reactivacion$/);

    const tarjeta = page.getByRole("region", {
      name: "Contraseña temporal de reactivación",
    });

    await expect(tarjeta).toContainText(persona.nombre);

    // El proxy consumió la cookie en esta misma petición: recargar no la
    // vuelve a mostrar, que es la garantía de «una sola vez».
    await page.reload();

    await expect(
      page.getByRole("region", { name: "Contraseña temporal de reactivación" }),
    ).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});
