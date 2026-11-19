import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LugarGuardado } from "../application/puertos";
import type { ZonaConCalles } from "../application/puertosDeLecturaDeZonas";
import { comoLugarId, comoZonaId } from "../domain";
import { ListaDeZonas } from "./ListaDeZonas";

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

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const asentamiento: LugarGuardado = {
  id: lugarId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};
const zonas: readonly ZonaConCalles[] = [
  {
    id: comoZonaId("22222222-2222-4222-8222-222222222222"),
    nombre: "Zona Norte",
    lugarId,
    asentamiento: "Motul",
    calles: 3,
  },
];

const render = (altaAbierta: boolean) =>
  renderToStaticMarkup(
    <ListaDeZonas
      zonas={zonas}
      asentamientos={[asentamiento]}
      raizActiva={null}
      error={undefined}
      aviso={undefined}
      puedeAdministrar
      altaAbierta={altaAbierta}
    />,
  );

/**
 * Z1 y Z2 de `odd/tasks/territorio-ux.md` (S12 y S13): el formulario de
 * alta empujaba la lista hacia abajo, la tabla decia "agrupadas por
 * asentamiento" sin agrupar ni contar calles, y "Volver a Territorio"
 * repetia la ruta que la migaja ya muestra.
 */
describe("el listado de zonas", () => {
  it("sin ?accion=nueva el alta es un boton y la lista empieza enseguida", () => {
    const html = render(false);

    expect(html).toMatch(
      /<a\b[^>]*href="\/territorio\/zonas\?accion=nueva#panel-de-alta"/,
    );
    expect(html).toMatch(/<a\b[^>]*>[\s\S]*Nueva zona/);
    expect(html).not.toContain('id="zona-asentamiento"');
  });

  it("con ?accion=nueva el alta abre en su panel", () => {
    const html = render(true);

    expect(html).toMatch(/id="panel-de-alta"/);
    expect(html).toMatch(/<h2[^>]*>Nueva zona<\/h2>/);
    expect(html).toContain('id="zona-asentamiento"');
  });

  it("cada zona dice cuantas calles tiene", () => {
    const html = render(false);

    expect(html).toMatch(/>Calles</);
    expect(html).toMatch(/>3</);
  });

  it("no promete una agrupacion que la tabla no hace", () => {
    const html = render(false);

    expect(html).not.toContain("agrupadas por asentamiento");
    expect(html).toContain("ordenadas por asentamiento");
  });

  it("no repite la vuelta a Territorio: la migaja ya la da", () => {
    expect(render(false)).not.toContain("Volver a Territorio");
  });
});
