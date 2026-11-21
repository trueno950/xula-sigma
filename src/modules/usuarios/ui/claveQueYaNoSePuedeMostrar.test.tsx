import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UsuarioDelPanel } from "../domain";
import { ClaveQueYaNoSePuedeMostrar } from "./ClaveQueYaNoSePuedeMostrar";

/**
 * S11 de `usuarios-ux` (hallazgo R1) en su segundo estado: la clave ya no se
 * puede mostrar. La muestra de
 * `design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html` dice de
 * quien era y ofrece el camino para tener otra, en vez de anunciar un exito
 * vacio.
 *
 * **El boton no se ofrece siempre**: `puedeRestablecer` es la misma regla
 * que corre el servidor —`permisosDeCuenta`, que deja afuera la propia
 * cuenta (S1 y T3)—, y pintar un boton que la accion va a rechazar deja a la
 * operadora leyendo un error evitable.
 */

vi.mock("./actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));

const OPERADOR: UsuarioDelPanel = {
  id: "22222222-2222-4222-8222-222222222222",
  nombre: "Rosa Poot",
  email: "rosa.poot@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
  bajaEn: null,
};

const pintar = (puedeRestablecer: boolean) =>
  renderToStaticMarkup(
    <ClaveQueYaNoSePuedeMostrar
      usuario={OPERADOR}
      puedeRestablecer={puedeRestablecer}
    />,
  );

describe("ClaveQueYaNoSePuedeMostrar", () => {
  it("nombra a la persona y dice que la clave ya no esta", () => {
    const html = pintar(true);

    expect(html).toContain(
      "La contraseña temporal de Rosa Poot ya no se puede mostrar.",
    );
    expect(html).toContain("Pasaron más de dos minutos o ya se anotó.");
  });

  it("ofrece restablecer otra vez, nombrando a la persona", () => {
    const html = pintar(true);

    expect(html).toContain("Restablecer la contraseña de Rosa Poot");
    expect(html).toContain(`name="usuarioId" value="${OPERADOR.id}"`);
  });

  it("sin permiso para restablecerla no pinta el boton ni su formulario", () => {
    const html = pintar(false);

    expect(html).not.toContain("<form");
    expect(html).not.toContain("Restablecer la contraseña");
  });
});
