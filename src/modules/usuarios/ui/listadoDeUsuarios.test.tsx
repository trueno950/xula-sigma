import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Rol } from "@/shared/auth/roles";
import type { UsuarioDelPanel } from "../domain";

/**
 * El listado agrupado por rol (S2 a S5 de `usuarios-ux`), con las guardas de
 * T3 en pie: A2 de T1 y S1 —un `SUPER_ADMIN` es intocable y nadie se
 * restablece su propia contrasenia— y S12, la casilla de la baja.
 */

vi.mock("./actions/darDeBajaUsuarioAction", () => ({
  darDeBajaUsuarioAction: vi.fn(),
}));
vi.mock("./actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));
vi.mock("./actions/reactivarUsuarioAction", () => ({
  reactivarUsuarioAction: vi.fn(),
}));

const { ListadoDeUsuarios } = await import("./ListadoDeUsuarios");

const ACTOR = { id: "admin-1", rol: "ADMIN_MUNICIPAL" as Rol };

const persona = (sobre: Partial<UsuarioDelPanel> = {}): UsuarioDelPanel => ({
  id: "operador-1",
  nombre: "Operadora de Mostrador",
  email: "operadora@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
  bajaEn: null,
  ...sobre,
});

const baja = (sobre: Partial<UsuarioDelPanel> = {}): UsuarioDelPanel =>
  persona({
    id: "baja-1",
    nombre: "Jose Armando May",
    dadoDeBaja: true,
    bajaEn: new Date("2026-11-16T20:00:00Z"),
    ...sobre,
  });

const pintar = (
  usuarios: readonly UsuarioDelPanel[],
  actor: { id: string; rol: Rol } = ACTOR,
) =>
  renderToStaticMarkup(<ListadoDeUsuarios usuarios={usuarios} actor={actor} />);

const acordeones = (html: string) =>
  html.match(/<details[^>]*name="accionesDeCuenta"/g) ?? [];

describe("ListadoDeUsuarios — las acciones de cada cuenta", () => {
  it("la fila de un OPERADOR ofrece restablecer y dar de baja", () => {
    const html = pintar([persona()]);

    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("Dar de baja");
  });

  it("S2: cada cuenta activa es un acordeon exclusivo por nombre", () => {
    const html = pintar([
      persona({ id: "o-1", nombre: "Ana" }),
      persona({ id: "o-2", nombre: "Carla" }),
      persona({ id: "c-1", nombre: "Beto", rol: "CONSULTA" }),
    ]);

    expect(acordeones(html)).toHaveLength(3);
  });

  it("S2: «Dar de baja» va al final del acordeon, tras la linea de peligro", () => {
    const html = pintar([persona()]);

    const restablecer = html.indexOf("Restablecer contraseña");
    const confirmacion = html.indexOf("Confirmo dar de baja a");
    const darDeBaja = html.indexOf(">Dar de baja");

    expect(restablecer).toBeGreaterThan(-1);
    expect(confirmacion).toBeGreaterThan(restablecer);
    expect(darDeBaja).toBeGreaterThan(confirmacion);
  });

  it("S3: cada accion dice de quien es para el lector de pantalla", () => {
    const html = pintar([persona({ nombre: "Rosa Poot" })]);

    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("de Rosa Poot");
    expect(html).toContain("a Rosa Poot");
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
    expect(html).not.toContain(">Dar de baja");
  });

  it("la propia cuenta explica por que no ofrece nada", () => {
    const html = pintar([
      persona({
        id: ACTOR.id,
        nombre: "Quien Administra",
        rol: "ADMIN_MUNICIPAL",
      }),
    ]);

    expect(html).toContain("· su cuenta");
    expect(html).toContain(
      "Sin acciones sobre su propia cuenta: no se restablece su contraseña desde aquí y nadie se da de baja a sí mismo.",
    );
  });

  /** S12: la casilla nombra a quien se da de baja y `required` la vuelve
   * obligatoria para el navegador; el servidor la exige aparte. */
  it("la baja pide una casilla obligatoria que nombra a la persona", () => {
    const html = pintar([persona()]);
    const [casilla] = html.match(/<input[^>]*name="confirmar"[^>]*>/g) ?? [];

    expect(casilla).toContain('type="checkbox"');
    expect(casilla).toContain('value="si"');
    expect(casilla).toContain("required");
    expect(html).toContain("Confirmo dar de baja a Operadora de Mostrador.");
  });

  it("un SUPER_ADMIN no se puede tocar: su fila sigue y no ofrece acciones", () => {
    const html = pintar([persona({ rol: "SUPER_ADMIN" })]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain(">Dar de baja");
    expect(html).toContain("Sin acciones");
  });

  it("un rol que no es de la plataforma no habilita nada", () => {
    const html = pintar([persona({ rol: "Secretario" })]);

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain(">Dar de baja");
  });

  it("para un actor que no administra no hay botones en ninguna fila", () => {
    const html = pintar([persona()], { id: "operador-1", rol: "OPERADOR" });

    expect(html).not.toContain("Restablecer contraseña");
    expect(html).not.toContain(">Dar de baja");
  });
});

describe("ListadoDeUsuarios — el orden y el conteo", () => {
  it("S4: dice cuantas cuentas hay, cuantas activas y cuantas de baja", () => {
    const html = pintar([
      persona({ id: "o-1" }),
      persona({ id: "c-1", rol: "CONSULTA" }),
      baja(),
    ]);

    expect(html).toContain("3 cuentas");
    expect(html).toContain("2 activas");
    expect(html).toContain("1 de baja");
  });

  it("S4: el orden esta escrito", () => {
    expect(pintar([persona()])).toContain(
      "Orden: las activas por rol —administrador, operador, consulta— y dentro de cada rol por nombre; las de baja van al final, aparte, de la más reciente a la más antigua.",
    );
  });

  it("S4: cada grupo por rol dice que permite y a cuantas cuentas tiene", () => {
    const html = pintar([
      persona({ id: "o-1" }),
      persona({ id: "o-2", nombre: "Otra" }),
      persona({ id: "a-1", rol: "ADMIN_MUNICIPAL" }),
    ]);

    expect(html).toContain("Administrador municipal");
    expect(html).toContain("Operador");
    expect(html).toContain("2 cuentas activas");
    expect(html).toContain(
      "Captura en padrón, reportes, constancias y territorio. No administra cuentas ni cambia la marca.",
    );
  });

  it("S5: la cuenta de baja va en su propia seccion", () => {
    // La fecha, la casilla de reactivar y la ausencia de acordeon viven en
    // `seccionDeBajas.test.tsx`: la seccion dejo de ser «una fila sin
    // acciones» cuando S3 le dio la suya.
    expect(pintar([baja()])).toContain("Cuentas de baja");
  });
});
