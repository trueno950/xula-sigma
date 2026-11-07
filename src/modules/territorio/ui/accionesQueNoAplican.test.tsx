import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UsoDeCalle } from "../application/usoDeCalle";
import { comoCalleId, comoLugarId } from "../domain";
import { AccionesDeCalle } from "./AccionesDeCalle";
import { FormularioDeBajaDeDomicilio } from "./FormularioDeBajaDeDomicilio";
import { permisosDeTerritorio } from "./permisos";

vi.mock("./FormularioDeUbicacion", () => ({
  FormularioDeUbicacion: () => <form data-formulario="ubicacion" />,
}));
vi.mock("./actions/darDeBajaCalleAction", () => ({
  darDeBajaCalleAction: vi.fn(),
}));
vi.mock("./actions/reparentearCalleAction", () => ({
  reparentearCalleAction: vi.fn(),
}));
vi.mock("./actions/renombrarCalleAction", () => ({
  renombrarCalleAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const otroAsentamiento = {
  id: comoLugarId("22222222-2222-4222-8222-222222222222"),
  nombre: "Kiní",
  tipo: "comisaria",
} as const;
const calle = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: raizId,
  punto: { latitud: 21.1, longitud: -89.2 },
};

const accionesDe = (
  uso: UsoDeCalle | null | undefined,
  lugares: readonly (typeof otroAsentamiento)[] = [otroAsentamiento],
) =>
  renderToStaticMarkup(
    <AccionesDeCalle
      datos={{ raizId, nodoId: raizId, calle, lugares }}
      permisos={permisosDeTerritorio("ADMIN_MUNICIPAL")}
      accionAbierta={undefined}
      uso={uso}
    />,
  );

describe("las acciones de una calle en uso", () => {
  it("con domicilios no se mueve ni se da de baja, y dice que hacer", () => {
    const html = accionesDe({ domicilios: 4, zonas: 0, zonasActivas: 0 });

    expect(html).toContain("La usan 4 domicilios.");
    expect(html).not.toContain("Mover a otro lugar");
    expect(html).not.toContain("Dar de baja");
    expect(html).toContain("Renombrar");
  });

  it("en una zona no se mueve ni se da de baja, y dice que hacer", () => {
    const html = accionesDe({ domicilios: 0, zonas: 1, zonasActivas: 1 });

    expect(html).toContain("Está en 1 zona.");
    expect(html).not.toContain("Mover a otro lugar");
    expect(html).not.toContain("Dar de baja");
  });

  it("en una zona dada de baja no se mueve, pero se da de baja", () => {
    const html = accionesDe({ domicilios: 0, zonas: 1, zonasActivas: 0 });

    expect(html).not.toContain("Mover a otro lugar");
    expect(html).toContain("Dar de baja");
    expect(html).toContain("Estuvo en 1 zona");
  });

  it("sin uso se ofrecen las dos", () => {
    const html = accionesDe({ domicilios: 0, zonas: 0, zonasActivas: 0 });

    expect(html).toContain("Mover a otro lugar");
    expect(html).toContain("Dar de baja");
  });

  it("si el uso no se pudo leer, se ofrecen y decide el servidor", () => {
    const html = accionesDe(null);

    expect(html).toContain("Mover a otro lugar");
    expect(html).toContain("Dar de baja");
  });

  it("sin otro asentamiento al que ir, Mover no se ofrece", () => {
    const html = accionesDe({ domicilios: 0, zonas: 0, zonasActivas: 0 }, []);

    expect(html).not.toContain("Mover a otro lugar");
    expect(html).toContain("Dar de baja");
  });
});

const bajaDeDomicilio = (
  residentes: Parameters<typeof FormularioDeBajaDeDomicilio>[0]["residentes"],
) =>
  renderToStaticMarkup(
    <FormularioDeBajaDeDomicilio
      raiz={raizId}
      nodo={raizId}
      domicilio="44444444-4444-4444-8444-444444444444"
      direccion="Calle 21 #12"
      residentes={residentes}
    />,
  );

describe("la baja de un domicilio con residentes", () => {
  it("no ofrece el envio: lista a quien vive ahi y manda a su ficha", () => {
    const html = bajaDeDomicilio([
      { personaId: "persona-1", nombreCompleto: "Ana Pech" },
    ]);

    expect(html).toContain("Ana Pech");
    expect(html).toContain("Registre la mudanza desde su ficha.");
    expect(html).not.toContain('type="submit"');
  });

  it("sin residentes se ofrece la baja", () => {
    expect(bajaDeDomicilio([])).toContain('type="submit"');
  });

  it("si los residentes no se pudieron leer, el envio sigue y decide el servidor", () => {
    expect(bajaDeDomicilio(null)).toContain('type="submit"');
  });
});
