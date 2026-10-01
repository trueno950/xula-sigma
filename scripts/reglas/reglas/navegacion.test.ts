import { describe, expect, it } from "vitest";
import { archivo, hallazgosDe } from "../pruebas";

describe("pagina-anidada-sin-migaja", () => {
  const id = "pagina-anidada-sin-migaja";

  it("marca un detalle sin migaja", () => {
    const encontrados = hallazgosDe(id, [
      archivo(
        "src/app/(panel)/constancias/[id]/page.tsx",
        'return (\n  <PaginaDePanel titulo={folio} ancho="detalle">\n    {children}\n  </PaginaDePanel>\n);\n',
      ),
    ]);

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0]?.mensaje).toContain("migaja");
  });

  it("no marca un detalle que ya pasa migaja", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/constancias/[id]/page.tsx",
          'return (\n  <PaginaDePanel titulo={folio} migaja={<Migaja pasos={pasos} etiqueta="Ruta" />}>\n    {children}\n  </PaginaDePanel>\n);\n',
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * `accion={<BotonDeImprimir id={constancia.id} />}` trae su propio `/>`
   * antes del cierre real de `PaginaDePanel`: si la regla contara el primer
   * `>` a secas, cortaria ahi y nunca veria el `migaja` que viene despues en
   * la misma etiqueta.
   */
  it("no se confunde con un JSX anidado en otra prop", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/constancias/[id]/page.tsx",
          "return (\n  <PaginaDePanel\n" +
            "    titulo={folio}\n" +
            "    accion={<BotonDeImprimir id={constancia.id} />}\n" +
            '    migaja={<Migaja pasos={pasos} etiqueta="Ruta" />}\n' +
            "  >\n    {children}\n  </PaginaDePanel>\n);\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca la raiz de una seccion", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/constancias/page.tsx",
          'return (\n  <PaginaDePanel titulo="Constancias">\n    {children}\n  </PaginaDePanel>\n);\n',
        ),
      ]),
    ).toEqual([]);
  });

  /**
   * `(lista)` es un grupo de rutas: no agrega un segmento a la URL, asi que
   * `padron/(lista)/page.tsx` sigue siendo `/padron`, la raiz de su seccion.
   */
  it("no cuenta un grupo de rutas como un nivel mas", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/padron/(lista)/page.tsx",
          'return (\n  <PaginaDePanel titulo="Padron">\n    {children}\n  </PaginaDePanel>\n);\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("marca un detalle aunque viva dentro de un grupo de rutas", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/padron/(lista)/[id]/page.tsx",
          'return (\n  <PaginaDePanel titulo="Persona">\n    {children}\n  </PaginaDePanel>\n);\n',
        ),
      ]),
    ).toHaveLength(1);
  });

  it("no marca una pantalla que no usa PaginaDePanel", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(panel)/constancias/emitir/page.tsx",
          'return <PantallaDeMensaje mensaje="Sin permiso." />;\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("no marca page.tsx fuera de (panel)", () => {
    expect(
      hallazgosDe(id, [
        archivo(
          "src/app/(acceso)/acceso/page.tsx",
          'return (\n  <PaginaDePanel titulo="Acceso">\n    {children}\n  </PaginaDePanel>\n);\n',
        ),
      ]),
    ).toEqual([]);
  });
});
