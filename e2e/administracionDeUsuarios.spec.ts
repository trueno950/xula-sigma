import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { verificarClave } from "@/shared/auth/contrasenia";
import { cuentas, usuarios } from "@/shared/auth/esquema";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CORREO, MUNICIPIOS, urlDe } from "./municipios";

/**
 * El ciclo completo de la administracion de usuarios (S1 a S7): alta con
 * contrasenia temporal, restablecimiento y baja, todo por el panel del
 * `ADMIN_MUNICIPAL` y sin JavaScript de por medio en los formularios.
 *
 * Lo que solo el navegador puede probar: que la contrasenia se vea **una
 * vez** y no quede en la URL -el redirect lleva un token opaco-, y que quien
 * quedo de baja desaparezca de las acciones de su fila. Lo que se comprueba
 * contra la base es que lo mostrado sea lo guardado, y que la baja sea
 * logica: la fila sigue existiendo con `bajaEn`.
 */

const correo = `usuario-${randomUUID()}@example.com`;
const NOMBRE = "Operadora de Mostrador";

const avisoDe = (
  page: Parameters<typeof accederAMotul>[0],
  encabezado: string,
) => page.getByRole("region", { name: encabezado });

/** La clave esta en el segundo parrafo de la tarjeta: el primero la titula. */
const claveDe = async (
  page: Parameters<typeof accederAMotul>[0],
  encabezado: string,
) => (await avisoDe(page, encabezado).locator("p").nth(1).innerText()).trim();

const filaDe = (page: Parameters<typeof accederAMotul>[0]) =>
  page.getByRole("listitem").filter({ hasText: correo });

/**
 * Un acceso por test y la ventana de ritmo por correo es de cinco intentos
 * cada quince minutos: mismo `beforeEach` que `marca.spec.ts`.
 */
test.beforeEach(liberarVentanaDeRitmo);

test("el administrador da de alta, restablece y da de baja sin que la contraseña toque la URL", async ({
  page,
}) => {
  const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);
  await accederAMotul(page);

  await page.goto(urlDe("motul", "/usuarios/alta"));

  // S3: el alta solo ofrece operador y consulta.
  await expect(page.getByLabel("Rol").locator("option")).toHaveText([
    "Elija un rol",
    "Operador",
    "Consulta",
  ]);

  await page.getByLabel("Nombre completo").fill(NOMBRE);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Rol").selectOption("OPERADOR");
  await page.getByRole("button", { name: "Dar de alta" }).click();

  await page.waitForURL(/\/usuarios\?clave=[0-9a-f-]+&ok=alta$/);

  const clave = await claveDe(page, "Contraseña temporal");

  expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);
  expect(page.url()).not.toContain(clave);
  await expect(avisoDe(page, "Contraseña temporal")).toContainText(NOMBRE);

  // S4: la contrasenia no queda en la pantalla. Volver al listado sin el
  // token del redirect no la muestra otra vez.
  await page.goto(urlDe("motul", "/usuarios"));
  await expect(page.getByText(clave)).toHaveCount(0);

  const [alta] = await withTenant(motul, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.email, correo)),
  );

  if (!alta) throw new Error("El alta no llegó a la base.");

  await expect(filaDe(page)).toHaveCount(1);
  await expect(filaDe(page).getByText("Activo")).toBeVisible();

  // A2 y B2: la propia cuenta se puede restablecer pero no darse de baja
  // —el municipio tiene un solo administrador y no hay ruta que limpie
  // `bajaEn`—, asi que el boton no se ofrece.
  const propia = page.getByRole("listitem").filter({ hasText: CORREO });
  await expect(
    propia.getByRole("button", { name: "Restablecer contraseña" }),
  ).toBeVisible();
  await expect(propia.getByRole("button", { name: "Dar de baja" })).toHaveCount(
    0,
  );

  // S5: restablecer muestra una contrasenia nueva, y es la que queda.
  await filaDe(page)
    .getByRole("button", { name: "Restablecer contraseña" })
    .click();
  await page.waitForURL(/\/usuarios\?clave=[0-9a-f-]+&ok=restablecimiento$/);

  const nuevaClave = await claveDe(page, "Nueva contraseña temporal");

  expect(nuevaClave).not.toBe(clave);
  expect(page.url()).not.toContain(nuevaClave);

  const [credencial] = await withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, alta.id)),
  );

  expect(await verificarClave(credencial?.password ?? "", nuevaClave)).toBe(
    true,
  );

  // S6: la baja se confirma y deja la fila sin acciones.
  await filaDe(page).getByRole("button", { name: "Dar de baja" }).click();
  await page.waitForURL(/\/usuarios\?ok=baja$/);

  await expect(
    page.getByText("La persona quedó dada de baja y ya no puede entrar."),
  ).toBeVisible();
  await expect(filaDe(page).getByText("De baja")).toBeVisible();
  await expect(
    filaDe(page).getByRole("button", { name: "Dar de baja" }),
  ).toHaveCount(0);

  const [enLaBase] = await withTenant(motul, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.id, alta.id)),
  );

  expect(enLaBase?.bajaEn).toBeInstanceOf(Date);
});
