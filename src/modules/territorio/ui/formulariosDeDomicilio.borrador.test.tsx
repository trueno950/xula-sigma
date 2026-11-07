import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BorradorDeDomicilio } from "./borradorDeDomicilio";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import {
  base,
  calleId,
  coloniaId,
  domicilio,
  domicilioId,
  otraCalleId,
} from "./fixturasDeDomicilios";
import { opcionesDeCalles } from "./opciones";
import { TabDeDomicilios } from "./TabDeDomicilios";
import { zonaConInicial } from "./zonaDelFormulario";

vi.mock("./actions/altaDeDomicilioAction", () => ({
  altaDeDomicilioAction: vi.fn(),
}));
vi.mock("./actions/corregirDomicilioAction", () => ({
  corregirDomicilioAction: vi.fn(),
}));
vi.mock("./actions/darDeBajaDomicilioAction", () => ({
  darDeBajaDomicilioAction: vi.fn(),
}));

const OTRO_DOMICILIO = "99999999-9999-4999-8999-999999999999";

const campos = {
  calleId: otraCalleId,
  zonaId: "sin-colonia",
  numero: "88-B",
  entreCalleAId: calleId,
  entreCalleBId: "",
  referencia: "Casa de la esquina",
};

const borradorDe = (
  destino: BorradorDeDomicilio["destino"],
): BorradorDeDomicilio => ({
  token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  destino,
  campos,
});

const alta = (borrador?: BorradorDeDomicilio) =>
  renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(base.calles)}
      zona={zonaConInicial(
        [
          {
            id: coloniaId,
            tipo: "colonia",
            nombre: "Centro",
            padreId: base.raizId,
          },
        ],
        { id: base.raizId, nombre: "Tepakan" },
        "",
      )}
      declaracionDeDestino="En Tepakan"
      borrador={borrador}
    />,
  );

const correccion = (borrador?: BorradorDeDomicilio) =>
  renderToStaticMarkup(
    <TabDeDomicilios
      {...base}
      domicilio={domicilio}
      domicilioId={domicilioId}
      accion="corregirDomicilio"
      borrador={borrador}
    />,
  );

describe("alta de domicilio: vuelve con lo capturado", () => {
  it("rellena numero, referencia, calles y colonia con el borrador del alta", () => {
    const html = alta(borradorDe({ formulario: "alta" }));

    expect(html).toContain('value="88-B"');
    expect(html).toContain('value="Casa de la esquina"');
    expect(html).toMatch(new RegExp(`value="${otraCalleId}" selected`));
    expect(html).toMatch(/value="sin-colonia" selected/);
  });

  it("ignora el borrador de una correccion", () => {
    const html = alta(
      borradorDe({ formulario: "correccion", domicilioId: domicilioId }),
    );

    expect(html).not.toContain("88-B");
    expect(html).not.toContain("Casa de la esquina");
  });
});

describe("correccion de domicilio: vuelve con lo capturado", () => {
  it("rellena con el borrador de este domicilio en vez de lo guardado", () => {
    const html = correccion(
      borradorDe({ formulario: "correccion", domicilioId: domicilioId }),
    );

    expect(html).toContain('value="88-B"');
    expect(html).toContain('value="Casa de la esquina"');
    expect(html).not.toContain('name="numero" value="21"');
  });

  it("con el borrador de otro domicilio o del alta muestra lo guardado", () => {
    for (const ajeno of [
      borradorDe({ formulario: "correccion", domicilioId: OTRO_DOMICILIO }),
      borradorDe({ formulario: "alta" }),
    ]) {
      const html = correccion(ajeno);

      expect(html).not.toContain("88-B");
      expect(html).toContain('value="Porton azul"');
    }
  });
});

const RECORTE =
  "Parte de lo capturado era demasiado largo y se recortó; revise los campos.";

/** S4 de `territorio-pendientes`: el borrador se recortaba sin avisar. */
describe("borrador recortado: el formulario lo avisa", () => {
  const recortado = (destino: BorradorDeDomicilio["destino"]) => ({
    ...borradorDe(destino),
    recortado: true,
  });

  it("el alta avisa que se recorto lo capturado", () => {
    expect(alta(recortado({ formulario: "alta" }))).toContain(RECORTE);
  });

  it("la correccion de ese domicilio tambien avisa", () => {
    expect(
      correccion(recortado({ formulario: "correccion", domicilioId })),
    ).toContain(RECORTE);
  });

  it("sin recorte, o con el borrador de otro formulario, no avisa", () => {
    expect(alta(borradorDe({ formulario: "alta" }))).not.toContain(RECORTE);
    expect(
      alta(recortado({ formulario: "correccion", domicilioId })),
    ).not.toContain(RECORTE);
    expect(correccion(recortado({ formulario: "alta" }))).not.toContain(
      RECORTE,
    );
  });
});
