import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TAMANO_DE_PAGINA } from "../application/registroDeDomicilios";
import { comoCalleId, comoDomicilioId } from "../domain";
import type { DomicilioDeLaPestana, PropsDeContenido } from "./contenido";
import { base, cabeceraId, coloniaId } from "./fixturasDeDomiciliosU5";
import { TabDeCalles } from "./TabDeCalles";
import { TabDeDomicilios } from "./TabDeDomicilios";

vi.mock("./actions/altaDeCalleAction", () => ({ altaDeCalleAction: vi.fn() }));
vi.mock("./actions/darDeBajaCalleAction", () => ({
  darDeBajaCalleAction: vi.fn(),
}));
vi.mock("./actions/reparentearCalleAction", () => ({
  reparentearCalleAction: vi.fn(),
}));
vi.mock("./actions/renombrarCalleAction", () => ({
  renombrarCalleAction: vi.fn(),
}));
vi.mock("./actions/ubicarCalleAction", () => ({ ubicarCalleAction: vi.fn() }));
vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const uuid = (i: number) =>
  `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`;

const calles = Array.from({ length: TAMANO_DE_PAGINA + 5 }, (_, i) => ({
  id: comoCalleId(uuid(i + 1)),
  nombre: `Calle ${i + 1}`,
  lugarId: cabeceraId,
  punto: null,
}));

const enCalles = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(
    <TabDeCalles
      {...base}
      lugar={{ id: cabeceraId, tipo: "cabecera", nombre: "Tepakan" }}
      calles={calles}
      {...resto}
    />,
  );

const fila = (i: number): DomicilioDeLaPestana => ({
  id: comoDomicilioId(uuid(i)),
  lugarId: coloniaId,
  lugar: "Centro",
  calleId: comoCalleId(uuid(1)),
  calle: "Calle 20",
  numero: String(i),
});

const enDomicilios = (resto: Partial<PropsDeContenido> = {}) =>
  renderToStaticMarkup(<TabDeDomicilios {...base} {...resto} />);

const filasDeTabla = (html: string) => html.match(/<li/g)?.length ?? 0;

describe("pestana Calles: busqueda y Ver mas", () => {
  it("muestra solo la primera pagina y ofrece Ver mas con 50 mas", () => {
    const html = enCalles();

    expect(html).toContain(">Calle 50<");
    expect(html).not.toContain(">Calle 51<");
    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${cabeceraId}&amp;vista=calles&amp;limite=100"`,
    );
    expect(html).toContain("Ver más");
  });

  it("con todo a la vista no ofrece Ver mas", () => {
    expect(enCalles({ limite: 100 })).not.toContain("Ver más");
  });

  it("la busqueda deja solo las calles que coinciden", () => {
    const html = enCalles({ busqueda: "Calle 5" });

    expect(html).toContain(">Calle 5<");
    expect(html).toContain(">Calle 55<");
    expect(html).not.toContain(">Calle 4<");
  });

  it("el buscador tiene etiqueta visible y conserva el lugar y la pestana", () => {
    const html = enCalles({ busqueda: "20" });

    expect(html).toMatch(/<label[^>]*for="buscar-en-calles"[^>]*>Buscar calle/);
    expect(html).toContain('name="q"');
    expect(html).toContain('value="20"');
    expect(html).toContain(`name="raiz" value="${cabeceraId}"`);
    expect(html).toContain('name="vista" value="calles"');
  });

  it("una calle abierta fuera de la pagina conserva su panel", () => {
    const ultima = calles[calles.length - 1];
    const html = enCalles({ calleId: ultima?.id });

    expect(html).toContain('id="panel-de-calle"');
  });

  it("una busqueda sin coincidencias lo dice y ofrece quitarla", () => {
    expect(enCalles({ busqueda: "Kukulcan" })).toContain("Sin resultados para");
  });
});

describe("pestana Domicilios: busqueda y Ver mas", () => {
  it("dibuja solo la pagina que llego y ofrece Ver mas si hay mas", () => {
    const html = enDomicilios({
      domicilios: { filas: [fila(1), fila(2)], hayMas: true },
      busqueda: "20",
    });

    expect(filasDeTabla(html)).toBe(2);
    expect(html).toContain(
      `href="/territorio?raiz=${cabeceraId}&amp;nodo=${coloniaId}&amp;vista=domicilios&amp;q=20&amp;limite=100"`,
    );
  });

  it("sin mas filas no ofrece Ver mas", () => {
    const html = enDomicilios({
      domicilios: { filas: [fila(1)], hayMas: false },
    });

    expect(html).not.toContain("Ver más");
  });

  it("el buscador tiene etiqueta visible y conserva el lugar y la pestana", () => {
    const html = enDomicilios();

    expect(html).toMatch(
      /<label[^>]*for="buscar-en-domicilios"[^>]*>Buscar domicilio/,
    );
    expect(html).toContain(`name="nodo" value="${coloniaId}"`);
    expect(html).toContain('name="vista" value="domicilios"');
  });

  it("una busqueda sin coincidencias lo dice, no ofrece registrar el primero", () => {
    const html = enDomicilios({
      domicilios: { filas: [], hayMas: false },
      busqueda: "99",
    });

    expect(html).toContain("Sin resultados para");
    expect(html).not.toContain("no tiene domicilios");
  });
});
