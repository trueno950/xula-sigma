import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";

/**
 * A2 de la verificacion de T1: la pantalla no ofrece lo que el servidor va a
 * rechazar. Un `SUPER_ADMIN` del ayuntamiento reservado es intocable para
 * cualquiera, y el `ADMIN_MUNICIPAL` no puede darse de baja a si mismo
 * (B2): dejarle el boton es ofrecer un bloqueo permanente que despues no se
 * arregla desde ninguna ruta.
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

  it("la fila del propio administrador no ofrece darse de baja", () => {
    const html = pintar([
      persona({
        id: ACTOR.id,
        nombre: "Quien Administra",
        rol: "ADMIN_MUNICIPAL",
      }),
    ]);

    expect(html).toContain("Restablecer contraseña");
    expect(html).not.toContain("Dar de baja");
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
