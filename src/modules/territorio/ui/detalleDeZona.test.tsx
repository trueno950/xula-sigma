import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DomicilioDelRegistro } from "../application/puertosDeDomicilios";
import type { ZonaGuardada } from "../application/puertosDeLecturaDeZonas";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoZonaId,
} from "../domain";
import { DetalleDeZona } from "./DetalleDeZona";

vi.mock("./actions/altaDeZonaAction", () => ({ altaDeZonaAction: vi.fn() }));
vi.mock("./actions/renombrarZonaAction", () => ({
  renombrarZonaAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaZonaAction", () => ({
  darDeBajaZonaAction: vi.fn(),
}));
vi.mock("./actions/agregarCalleAZonaAction", () => ({
  agregarCalleAZonaAction: vi.fn(),
}));
vi.mock("./actions/quitarCalleDeZonaAction", () => ({
  quitarCalleDeZonaAction: vi.fn(),
}));

const ASENTAMIENTO = comoLugarId("11111111-1111-4111-8111-111111111111");
const COLONIA = comoLugarId("22222222-2222-4222-8222-222222222222");
const CALLE = comoCalleId("33333333-3333-4333-8333-333333333333");
const DOMICILIO = comoDomicilioId("44444444-4444-4444-8444-444444444444");

const zona: ZonaGuardada = {
  id: comoZonaId("55555555-5555-4555-8555-555555555555"),
  nombre: "Zona Norte",
  lugarId: ASENTAMIENTO,
  asentamiento: "Motul",
};

const domicilio: DomicilioDelRegistro = {
  id: DOMICILIO,
  calle: "Calle 20",
  calleId: CALLE,
  numero: "7",
  lugar: "Colonia Centro",
  lugarId: COLONIA,
  raizId: ASENTAMIENTO,
};

const render = (puedeAdministrar: boolean) =>
  renderToStaticMarkup(
    <DetalleDeZona
      zona={zona}
      vista="calles"
      calles={[{ id: CALLE, nombre: "Calle 20" }]}
      domicilios={[domicilio]}
      callesDelAsentamiento={[{ id: CALLE, nombre: "Calle 20" }]}
      error={undefined}
      aviso={undefined}
      puedeAdministrar={puedeAdministrar}
    />,
  );

const enlaces = (html: string) =>
  [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, href, dentro]) => ({
      href: (href ?? "").replace(/&amp;/g, "&"),
      dentro: dentro ?? "",
    }),
  );

/** La fila de un domicilio se ve en su propia pestana. */
const renderDomicilios = () =>
  renderToStaticMarkup(
    <DetalleDeZona
      zona={zona}
      vista="domicilios"
      calles={[{ id: CALLE, nombre: "Calle 20" }]}
      domicilios={[domicilio]}
      callesDelAsentamiento={[{ id: CALLE, nombre: "Calle 20" }]}
      error={undefined}
      aviso={undefined}
      puedeAdministrar={false}
    />,
  );

/**
 * ZD1 de `odd/tasks/territorio-ux.md` (S11): dentro de una zona, las calles
 * y los domicilios no se podian abrir porque las filas no llevaban a
 * ningun lado. Los asentamientos son los mismos que ya usan la entrada y el
 * registro: la calle abre su panel de Calles y el domicilio el suyo.
 */
describe("el detalle de la zona: las filas abren lo que nombran", () => {
  it("la calle abre su panel en el territorio del asentamiento", () => {
    const calle = enlaces(render(false)).find(({ dentro }) =>
      dentro.includes("Calle 20"),
    );

    expect(calle?.href).toBe(
      `/territorio?raiz=${ASENTAMIENTO}&nodo=${ASENTAMIENTO}&vista=calles&calle=${CALLE}#panel-de-calle`,
    );
  });

  it("el domicilio abre su ficha, en el lugar al que pertenece", () => {
    const fila = enlaces(renderDomicilios()).find(({ dentro }) =>
      dentro.includes("Calle 20"),
    );

    expect(fila?.href).toBe(
      `/territorio?raiz=${ASENTAMIENTO}&nodo=${COLONIA}&vista=domicilios&domicilio=${DOMICILIO}#panel-de-domicilio`,
    );
  });

  it("la fila se anuncia con la etiqueta del domicilio, no con sus campos crudos", () => {
    const html = renderDomicilios();

    expect(html).toContain("Calle 20 #7, Colonia Centro, Motul");
    expect(html).not.toContain("null");
  });

  it("con permiso de administrar, la calle se sigue abriendo en un toque", () => {
    const calle = enlaces(render(true)).find(({ dentro }) =>
      dentro.includes("Calle 20"),
    );

    expect(calle?.href).toContain(`calle=${CALLE}`);
  });

  it("ningun enlace de fila se traga el formulario de quitar", () => {
    for (const { dentro } of enlaces(render(true))) {
      expect(dentro).not.toContain("<form");
      expect(dentro).not.toContain("<button");
    }
  });
});
