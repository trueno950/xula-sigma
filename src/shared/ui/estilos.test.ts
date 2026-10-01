import { describe, expect, it } from "vitest";
import {
  ANILLO_DE_FOCO,
  CLASES_DE_ENLACE,
  clasesDeBoton,
  clasesDeCampo,
  descripcionDeCampo,
  plantillaDeColumnas,
  presentacionDeAviso,
  VARIANTES_DE_BOTON,
} from "./estilos";

/**
 * Estos tests no verifican una cadena de clases: verifican los invariantes
 * que `DESIGN.md` declara y que hasta hoy nada hacia cumplir. Cada `it` de
 * abajo corresponde a una linea de la seccion 5 o 6 de ese documento, y
 * existe porque la alternativa —copiar la cadena a mano en cada archivo—
 * ya produjo tres variantes distintas del mismo campo en el repositorio.
 */
describe("ANILLO_DE_FOCO", () => {
  it("no fija el estilo del contorno en `none` ni lo oculta", () => {
    // En Tailwind 4, `outline-none` escribe `--tw-outline-style: none` en el
    // propio elemento y `focus-visible:outline-2` lee esa variable: el
    // anillo queda en `outline-style: none` aunque ancho y color esten
    // puestos. Medido en Chromium contra el CSS compilado.
    expect(ANILLO_DE_FOCO).not.toMatch(/(^|\s)outline-(none|hidden)(\s|$)/);
  });

  it("declara el estilo solido del anillo al enfocar", () => {
    expect(ANILLO_DE_FOCO).toContain("focus-visible:outline-solid");
  });
});

describe("CLASES_DE_ENLACE", () => {
  it("se distingue del texto por algo mas que el color y lleva el anillo de foco", () => {
    // Un enlace dentro de una ficha no puede depender solo del color: quien
    // no distingue tonos no lo veria como enlace.
    expect(CLASES_DE_ENLACE).toContain("underline");
    expect(CLASES_DE_ENLACE).toContain(ANILLO_DE_FOCO);
  });
});

describe("clasesDeBoton", () => {
  it("mide 44px de alto en toda variante", () => {
    // DESIGN.md, Buttons: "Alto fijo 44px". Es el blanco tactil minimo y
    // el renglon comodo del escritorio en un solo numero.
    for (const variante of VARIANTES_DE_BOTON) {
      expect(clasesDeBoton(variante)).toContain("h-11");
    }
  });

  it("enfoca con `outline` y nunca con sombra", () => {
    // DESIGN.md, Buttons: `outline` y no `box-shadow`, para que el foco
    // sobreviva al modo de alto contraste de Windows.
    for (const variante of VARIANTES_DE_BOTON) {
      const clases = clasesDeBoton(variante);

      expect(clases).toContain("outline-2");
      expect(clases).toContain("outline-offset-2");
      expect(clases).toContain("outline-marca");
      expect(clases).not.toContain("ring-");
      expect(clases).not.toContain("shadow-");
    }
  });

  it("apaga cambiando tokens, no bajando la opacidad", () => {
    // DESIGN.md, Buttons: bajar la opacidad de un boton entero tambien
    // apaga su texto contra un fondo impredecible.
    for (const variante of VARIANTES_DE_BOTON) {
      const clases = clasesDeBoton(variante);

      expect(clases).not.toContain("opacity");
      expect(clases).toContain("disabled:bg-caliza-relleno");
      expect(clases).toContain("disabled:text-caliza-inhabilitado");
    }
  });

  it("nunca escribe en mayusculas sostenidas", () => {
    // DESIGN.md, Don't: es la firma del tramite de gobierno, la
    // anti-referencia declarada del producto.
    for (const variante of VARIANTES_DE_BOTON) {
      expect(clasesDeBoton(variante)).not.toContain("uppercase");
    }
  });

  it("presta la marca del municipio solo a la accion primaria", () => {
    // La marca es de otro y puede ser de cualquier tono: se usa una vez
    // por pantalla, en la accion que la pantalla existe para hacer.
    expect(clasesDeBoton("primaria")).toContain("bg-marca");
    expect(clasesDeBoton("secundaria")).not.toContain("bg-marca");
    expect(clasesDeBoton("fantasma")).not.toContain("bg-marca");
  });

  it("da borde visible a la secundaria y ninguno a la fantasma", () => {
    expect(clasesDeBoton("secundaria")).toContain("border-caliza-borde");
    expect(clasesDeBoton("fantasma")).not.toContain("border-caliza-borde");
  });

  it("viste lo destructivo con la senal, nunca con la marca", () => {
    // El reverso del Don't de DESIGN.md: si la marca no puede usarse en un
    // rol semantico, una baja tampoco puede vestirse de marca. En un
    // municipio de marca roja, "Dar de baja" y "Guardar" eran el mismo
    // boton.
    expect(clasesDeBoton("peligro")).toContain("bg-senial-error");
    expect(clasesDeBoton("peligro")).not.toContain("bg-marca");
  });
});

describe("clasesDeCampo", () => {
  it("mide 44px y lleva el borde de 3.54:1 que exige WCAG 1.4.11", () => {
    const clases = clasesDeCampo();

    expect(clases).toContain("h-11");
    expect(clases).toContain("border-caliza-borde");
  });

  it("marca el error en la senal y no en la marca del municipio", () => {
    // DESIGN.md, Don't: en un municipio de marca roja el borde de error y
    // el de foco serian el mismo color.
    const clases = clasesDeCampo({ conError: true });

    expect(clases).toContain("border-senial-error");
    expect(clases).not.toContain("border-caliza-borde");
  });

  it("enfoca con el mismo anillo que el boton", () => {
    const clases = clasesDeCampo();

    expect(clases).toContain("outline-2");
    expect(clases).toContain("outline-marca");
    expect(clases).not.toContain("ring-");
  });
});

describe("presentacionDeAviso", () => {
  it("el error interrumpe al lector: role alert", () => {
    expect(presentacionDeAviso("error").role).toBe("alert");
  });

  it("el exito no interrumpe: role status", () => {
    expect(presentacionDeAviso("exito").role).toBe("status");
  });

  it("cada tono lleva su propio icono", () => {
    expect(presentacionDeAviso("error").Icono).not.toBe(
      presentacionDeAviso("exito").Icono,
    );
  });
});

describe("plantillaDeColumnas", () => {
  it("una columna sin ancho propio reparte el espacio sobrante", () => {
    expect(plantillaDeColumnas([{}])).toBe("minmax(0,1fr)");
  });

  it("respeta el ancho de cada columna, en orden", () => {
    expect(plantillaDeColumnas([{ ancho: "2fr" }, {}, { ancho: "80px" }])).toBe(
      "2fr minmax(0,1fr) 80px",
    );
  });
});

describe("descripcionDeCampo", () => {
  const ids = { idDeAyuda: "campo-ayuda", idDeError: "campo-error" };

  it("sin ayuda ni error, no describe nada", () => {
    expect(descripcionDeCampo({}, ids)).toBeUndefined();
  });

  it("con ayuda, apunta a su id", () => {
    expect(descripcionDeCampo({ ayuda: "texto" }, ids)).toBe("campo-ayuda");
  });

  it("con error, apunta a su id", () => {
    expect(descripcionDeCampo({ error: "texto" }, ids)).toBe("campo-error");
  });

  it("con los dos, apunta a los dos ids en orden", () => {
    expect(descripcionDeCampo({ ayuda: "a", error: "b" }, ids)).toBe(
      "campo-ayuda campo-error",
    );
  });
});
