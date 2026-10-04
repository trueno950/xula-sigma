import { Pencil } from "@phosphor-icons/react/ssr";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnlaceDeItemDeAccion, ItemDeAccion } from "./ItemDeAccion";

const detalle = (abierto: boolean, destructiva = false) =>
  renderToStaticMarkup(
    <ItemDeAccion
      grupo="acciones-de-prueba"
      etiqueta="Renombrar"
      Icono={Pencil}
      abierto={abierto}
      destructiva={destructiva}
    >
      <p>Contenido</p>
    </ItemDeAccion>,
  );

describe("ItemDeAccion", () => {
  it("comparte el name del grupo para que abrir uno cierre los demas", () => {
    expect(detalle(false)).toContain('name="acciones-de-prueba"');
  });

  it("nace cerrado salvo que se pida abierto", () => {
    expect(detalle(false)).not.toMatch(/<details[^>]* open/);
    expect(detalle(true)).toMatch(/<details[^>]* open/);
  });

  it("la accion destructiva usa la senal de error en el renglon", () => {
    expect(detalle(false, true)).toContain("text-senial-error");
    expect(detalle(false)).not.toContain("text-senial-error");
  });

  it("el enlace comparte el renglon y navega", () => {
    const html = renderToStaticMarkup(
      <EnlaceDeItemDeAccion etiqueta="Ver" Icono={Pencil} href="/a#b" />,
    );

    expect(html).toContain('href="/a#b"');
    expect(html).toContain("Ver");
  });
});
