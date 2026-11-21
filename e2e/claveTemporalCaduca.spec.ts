import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { altaDePersona } from "@/shared/auth/alta";
import { verificarClave } from "@/shared/auth/contrasenia";
import { cuentas, sesiones } from "@/shared/auth/esquema";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederConClave } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1 y S2 en el navegador: la contrasenia temporal caduca a las 24 horas, y
 * mientras este puesta solo se puede llegar a la pantalla de cambio.
 *
 * Lo que solo el navegador puede probar es el camino completo: el redirect
 * del panel al cambio, que la pantalla funcione sin JavaScript —el `<form>`
 * nativo de una Server Action— y que la temporal vieja deje de entrar
 * despues de elegir la propia. Lo que se comprueba contra la base es que la
 * marca desaparezca, que el hash nuevo sea el que se escribio y que la
 * temporal caducada no haya dejado sesion.
 *
 * Las cuentas se siembran con `altaDePersona` y una clave conocida, y no por
 * el alta del panel: la clave temporal que genera el panel se muestra una
 * sola vez y el E2E de usuarios ya cubre ese camino.
 */

const MOTUL = comoAyuntamientoId(MUNICIPIOS.motul.id);

const TEMPORAL = "temporal-larga-y-dada";
const PROPIA = "propia-larga-y-elegida";

const RUTA_DEL_CAMBIO = urlDe("motul", "/cambiar-contrasenia");

let siguiente = 0;

const sembrar = async (claveTemporal: boolean) => {
  siguiente += 1;
  const correo = `temporal-${siguiente}-${randomUUID()}@example.com`;

  const { id } = await withTenant(MOTUL, (tx) =>
    altaDePersona(tx, MOTUL, {
      nombre: "Operadora Nueva",
      email: correo,
      clave: TEMPORAL,
      rol: "OPERADOR",
      claveTemporal,
    }),
  );

  return { id, correo };
};

const credencialDe = (usuarioId: string) =>
  withTenant(MOTUL, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

const sesionesDe = (usuarioId: string) =>
  withTenant(MOTUL, (tx) =>
    tx.select().from(sesiones).where(eq(sesiones.userId, usuarioId)),
  );

const formarse = async (page: Parameters<typeof accederConClave>[0]) => {
  await page.goto(urlDe("motul", "/acceso"));
};

test.beforeEach(liberarVentanaDeRitmo);

test("el primer acceso con la temporal obliga a cambiarla y la deja sin efecto", async ({
  page,
}) => {
  const cuenta = await sembrar(true);

  await accederConClave(page, {
    correo: cuenta.correo,
    clave: TEMPORAL,
    espera: RUTA_DEL_CAMBIO,
  });

  // S2: con la temporal puesta, ninguna otra pantalla del panel se abre.
  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(RUTA_DEL_CAMBIO);

  await page.getByLabel("Contraseña nueva", { exact: true }).fill(PROPIA);
  await page
    .getByLabel("Repita la contraseña nueva", { exact: true })
    .fill(PROPIA);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  // La persona sigue al panel, que es adonde iba.
  await page.waitForURL(urlDe("motul"));
  await expect(
    page.getByRole("button", { name: "Cambiar contraseña" }),
  ).toHaveCount(0);

  const credencial = await credencialDe(cuenta.id);

  expect(credencial?.claveTemporalEn).toBeNull();
  expect(await verificarClave(credencial?.password ?? "", PROPIA)).toBe(true);
  expect(await verificarClave(credencial?.password ?? "", TEMPORAL)).toBe(
    false,
  );

  // Y la temporal que le dictaron ya no abre nada.
  const otro = await page.context().browser()?.newContext();
  const otraPagina = await otro?.newPage();
  if (!otro || !otraPagina) throw new Error("Sin contexto de navegador.");

  // Tercer acceso del caso: se espera la ventana del limite de intentos.
  await liberarVentanaDeRitmo();
  await formarse(otraPagina);
  await otraPagina.getByLabel("Correo").fill(cuenta.correo);
  await otraPagina.getByLabel("Contraseña").fill(TEMPORAL);
  await otraPagina.getByRole("button", { name: "Entrar" }).click();

  await expect(
    otraPagina.getByText("Correo o contraseña incorrectos."),
  ).toBeVisible();

  await otro.close();
});

test("una temporal de mas de 24 horas pide restablecerla y no abre sesion", async ({
  page,
}) => {
  const cuenta = await sembrar(true);

  // Se envejece la marca en la base: no hay reloj que manipular en el
  // navegador, y la caducidad la decide el servidor.
  await withTenant(MOTUL, (tx) =>
    tx
      .update(cuentas)
      .set({ claveTemporalEn: new Date(Date.now() - 25 * 3_600_000) })
      .where(eq(cuentas.userId, cuenta.id)),
  );

  const respuesta = await accederConClave(page, {
    correo: cuenta.correo,
    clave: TEMPORAL,
    espera: null,
  });

  expect(respuesta.status()).toBe(403);
  await expect(page.getByText(/La contraseña temporal caducó/)).toBeVisible();
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(sesionesDe(cuenta.id)).resolves.toHaveLength(0);
});
