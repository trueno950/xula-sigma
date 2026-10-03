import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { comoCalleId, comoLugarId, type TipoDeLugar } from "../domain";
import { CatalogoHeredado } from "./CatalogoHeredado";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeDomicilios } from "./TabDeDomicilios";
import { TabDeLugares } from "./TabDeLugares";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const comisariaId = comoLugarId("33333333-3333-4333-8333-333333333333");
const calle = {
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle 21",
  punto: null,
};
const lugares = [
  { id: raizId, nombre: "Buenavista", tipo: "cabecera" as const },
];
const permisos = permisosDeTerritorio("ADMIN_MUNICIPAL");

const hijo = (id: typeof raizId, tipo: TipoDeLugar, nombre: string) => ({
  clase: "lugar" as const,
  id,
  tipo,
  nombre,
  padreId: raizId,
});
const conteo = (lugarId: typeof raizId, c: Partial<ConteoDeLugar>) => ({
  lugarId,
  domicilios: 0,
  calles: null,
  ...c,
});

describe("CatalogoHeredado", () => {
  it("enlaza al asentamiento duenio del catalogo", () => {
    const html = renderToStaticMarkup(
      <CatalogoHeredado
        raizId={raizId}
        calles={[calle]}
        lugares={lugares}
        permisos={permisos}
      />,
    );

    expect(html).toContain(
      `href="/territorio?raiz=${raizId}&amp;nodo=${raizId}&amp;vista=calles"`,
    );
    expect(html).toContain(">Buenavista</a>");
  });

  it("el estado vacio nombra al asentamiento y lo enlaza", () => {
    const html = renderToStaticMarkup(
      <CatalogoHeredado
        raizId={raizId}
        calles={[]}
        lugares={lugares}
        permisos={permisos}
      />,
    );

    expect(html).toContain("El catálogo de");
    expect(html).toContain("aún no tiene calles");
    expect(html).toContain("<svg");
  });

  it("administrar el catalogo es secundario y no de ancho completo", () => {
    const html = renderToStaticMarkup(
      <CatalogoHeredado
        raizId={raizId}
        calles={[calle]}
        lugares={lugares}
        permisos={permisos}
      />,
    );
    const enlace = html.match(/<a[^>]*>Administrar el catálogo<\/a>/)?.[0];

    expect(enlace).toBeDefined();
    expect(enlace).not.toContain("bg-marca");
  });
});

const base: PropsDeContenido = {
  raizId,
  lugar: { id: raizId, tipo: "cabecera", nombre: "Buenavista" },
  nodos: [
    {
      clase: "lugar",
      id: raizId,
      tipo: "cabecera",
      nombre: "Buenavista",
      padreId: null,
    },
    hijo(coloniaId, "colonia", "Centro"),
    hijo(comisariaId, "comisaria", "Sisal"),
  ],
  calles: [],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos,
  conteos: [
    conteo(coloniaId, { domicilios: 1 }),
    conteo(comisariaId, { domicilios: 4, calles: 0 }),
  ],
};

describe("TabDeLugares con cuentas", () => {
  const html = renderToStaticMarkup(<TabDeLugares {...base} />);

  it("muestra los domicilios de cada hijo con singular y plural", () => {
    expect(html).toContain("1 domicilio<");
    expect(html).toContain("4 domicilios<");
  });

  it("el aviso Sin calles solo sale en un tipo con catalogo y en 0", () => {
    expect(html.match(/Sin calles/g)).toHaveLength(1);
  });

  it("el tipo va como pastilla, no como dato monoespaciado", () => {
    expect(html).toContain("rounded-pill");
    expect(html).not.toContain("font-mono");
  });
});

describe("TabDeLugares sin cuentas", () => {
  const { conteos: _omitido, ...sinConteos } = base;
  const html = renderToStaticMarkup(<TabDeLugares {...sinConteos} />);

  it("lista a los hijos con su tipo y sin ninguna cuenta", () => {
    expect(html).toContain("Centro");
    expect(html).toContain("Sisal");
    expect(html).not.toContain("domicilio");
    expect(html).not.toContain("Sin calles");
  });
});

describe("TabDeDomicilios", () => {
  const enManzana = {
    clase: "domicilio" as const,
    id: "55555555-5555-4555-8555-555555555555" as never,
    lugarId: coloniaId,
    calleId: calle.id,
    calle: "Calle 21",
    numero: "5",
  };

  it("lista los del subarbol, igual que su contador, con su lugar real", () => {
    const html = renderToStaticMarkup(
      <TabDeDomicilios {...base} nodos={[...base.nodos, enManzana]} />,
    );

    expect(html).toContain("Calle 21");
    expect(html).toContain(`nodo=${coloniaId}&amp;vista=domicilios`);
    expect(html).toContain("Centro");
  });
});
