import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";

/**
 * La seccion de cuentas de baja (S5 de `usuarios-ux`) y lo que ahora ofrece:
 * reactivar con una contraseña temporal nueva (S3).
 *
 * Vive en su archivo y no en `listadoDeUsuarios.test.tsx` porque el sujeto
 * cambio de «una cuenta de baja no ofrece nada» a «ofrece reactivar, con su
 * casilla y con las mismas guardas que la baja». Las dos aserciones que ya
 * existian —la fecha y que no haya acordeon— se mudaron enteras.
 *
 * Lo que se afirma es el marcado, no el comportamiento: que la accion
 * rechace lo que tiene que rechazar lo prueba su propio test unitario, y que
 * el caso de uso no toque una fila de otro municipio, su integracion.
 */

vi.mock("./actions/reactivarUsuarioAction", () => ({
  reactivarUsuarioAction: vi.fn(),
}));

const { ListadoDeUsuarios } = await import("./ListadoDeUsuarios");

const ACTOR = { id: "admin-1", rol: "ADMIN_MUNICIPAL" as Rol };

const baja = (sobre: Partial<UsuarioDelPanel> = {}): UsuarioDelPanel => ({
  id: "baja-1",
  nombre: "Jose Armando May",
  email: "jose@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: true,
  bajaEn: new Date("2026-11-16T20:00:00Z"),
  ...sobre,
});

const pintar = (
  usuarios: readonly UsuarioDelPanel[],
  actor: { id: string; rol: Rol } = ACTOR,
) =>
  renderToStaticMarkup(<ListadoDeUsuarios usuarios={usuarios} actor={actor} />);

describe("SeccionDeBajas", () => {
  it("S5: la cuenta de baja dice desde cuando y va en su propia seccion", () => {
    const html = pintar([baja()]);

    expect(html).toContain("Cuentas de baja");
    expect(html).toContain("de baja desde el 16 nov 2026");
  });

  it("S3: ofrece reactivar, con la casilla que confirma y nombra a la persona", () => {
    const html = pintar([baja()]);
    const [casilla] = html.match(/<input[^>]*name="confirmar"[^>]*>/g) ?? [];

    expect(html).toContain("Reactivar cuenta");
    expect(casilla).toContain('type="checkbox"');
    expect(casilla).toContain('value="si"');
    expect(casilla).toContain("required");
    expect(html).toContain("Confirmo reactivar a Jose Armando May.");
    expect(html).toContain("de Jose Armando May");
    // La temporal es la via de entrada, no un segundo restablecimiento.
    expect(html).not.toContain("Restablecer contraseña");
  });

  it("una cuenta de baja no es un acordeon ni se da de baja dos veces", () => {
    const html = pintar([baja()]);

    expect(html.match(/<details/g) ?? []).toHaveLength(0);
    expect(html).not.toContain(">Dar de baja");
  });

  it("S3: a un SUPER_ADMIN de baja no lo reactiva nadie", () => {
    const html = pintar([baja({ rol: "SUPER_ADMIN" })]);

    expect(html).not.toContain("Reactivar cuenta");
    expect(html).not.toContain('name="confirmar"');
  });

  it("un actor que no administra no ve el boton", () => {
    const html = pintar([baja()], { id: "operador-1", rol: "OPERADOR" });

    expect(html).not.toContain("Reactivar cuenta");
  });

  it("sin cuentas de baja no hay seccion", () => {
    expect(pintar([])).not.toContain("Cuentas de baja");
  });
});
