import { Prohibit } from "@phosphor-icons/react/ssr";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Boton, EnlaceDeAccion } from "./Boton";

describe("Boton peligro", () => {
  const html = renderToStaticMarkup(
    <Boton type="submit" variante="peligro">
      <Prohibit size={18} aria-hidden />
      Dar de baja Calle 15
    </Boton>,
  );

  it("es un boton de envio con icono y texto, no solo color", () => {
    expect(html).toMatch(/^<button[^>]*type="submit"/);
    expect(html).toContain("<svg");
    expect(html).toContain("Dar de baja Calle 15");
  });

  it("va de contorno en la senal de error y no con la marca", () => {
    expect(html).toContain("border-senial-error");
    expect(html).toContain("text-senial-error");
    expect(html).not.toMatch(/(^|[\s"])bg-senial-error[\s"]/);
    expect(html).not.toContain("bg-marca");
  });

  it("no se estira: el ancho lo decide el contenedor, no la variante", () => {
    expect(html).not.toContain("w-full");
  });

  it("el enlace de accion comparte la variante", () => {
    const enlace = renderToStaticMarkup(
      <EnlaceDeAccion href="/x" variante="peligro">
        Dar de baja
      </EnlaceDeAccion>,
    );

    expect(enlace).toContain("border-senial-error");
  });
});
