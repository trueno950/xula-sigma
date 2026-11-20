import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";

/**
 * A2 de la verificacion de T1 y S1 de `usuarios-ux`: la pantalla no ofrece
 * lo que el servidor va a rechazar. Un `SUPER_ADMIN` del ayuntamiento
 * reservado es intocable para cualquiera; el `ADMIN_MUNICIPAL` no puede
 * darse de baja a si mismo (B2) —dejaria al municipio sin administrador y
 * ninguna ruta limpia `bajaEn`— ni restablecerse su propia contrasenia
 * (S1): el servidor la rechaza, asi que ofrecer el boton es ofrecer un error.
 */

vi.mock("./actions/darDeBajaUsuarioAction", () => ({
  darDeBajaUsuarioAction: vi.fn(),
}));
vi.mock("./actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));

const { ListadoDeUsuarios } = await import("./ListadoDeUsuarios");

const ACTOR = { id: "admin-1", rol: "ADMIN_MUNICIPAL" as Rol };

const persona = (sobre: Partial<UsuarioDelPanel> = {}): UsuarioDelPanel => ({
  id: "operador-1",
  nombre: "Operadora de Mostrador",
  email: "operadora@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
  ...sobre,
});

const pintar = (
  usuarios: readonly UsuarioDelPanel[],
  actor: { id: string; rol: Rol } = ACTOR,
) =>
  renderToStaticMarkup(<ListadoDeUsuarios usuarios={usuarios} actor={actor} />);

describe("ListadoDeUsuarios y las acciones de cada fila", () => {
  it("la fila de un OPERADOR ofrece restablecer y dar de baja", () => {
    const html = pintar([persona()]);

    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("Dar de baja");
  });

  it("la fila del propio administrador no ofrece restablecer su contrasena ni darse de baja", () => {
    const html = pintar([
      persona({
        id: ACTOR.id,
        nombre: "Quien Administra",
        rol: "ADMIN_MUNICIPAL",
      }),
    ]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain("Dar de baja");
  });

  /**
   * S12: la baja pide confirmacion, y la casilla nombra a quien se da de
   * baja. `required` la vuelve obligatoria para el navegador; el servidor la
   * exige aparte, porque sin JavaScript no hay dialogo que pregunte antes.
   */
  it("la baja pide una casilla obligatoria que nombra a la persona", () => {
    const html = pintar([persona()]);
    const [casilla] = html.match(/<input[^>]*name="confirmar"[^>]*>/g) ?? [];

    expect(casilla).toContain('type="checkbox"');
    expect(casilla).toContain('value="si"');
    expect(casilla).toContain("required");
    expect(html).toContain("Confirmo dar de baja a Operadora de Mostrador.");
  });

  it("un SUPER_ADMIN no se puede tocar: su fila no ofrece acciones", () => {
    const html = pintar([persona({ rol: "SUPER_ADMIN" })]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain("Dar de baja");
    expect(html).toContain("Sin acciones");
  });

  it("una cuenta de baja no ofrece acciones y lo dice", () => {
    const html = pintar([persona({ dadoDeBaja: true })]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).toContain("Sin acciones: la cuenta ya no entra.");
  });

  it("un rol que no es de la plataforma no habilita nada", () => {
    const html = pintar([persona({ rol: "Secretario" })]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain("Dar de baja");
  });

  it("para un actor que no administra no hay botones en ninguna fila", () => {
    const html = pintar([persona()], { id: "operador-1", rol: "OPERADOR" });

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain("Dar de baja");
  });
});
