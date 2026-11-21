import { afterEach, describe, expect, it, vi } from "vitest";
import {
  descargarLosDatos,
  ID_DEL_ENLACE_DE_DESCARGA,
  nombreDeLaRespuesta,
  RUTA_DE_LA_DESCARGA,
} from "./descargar";

/**
 * La isla de la descarga (S12, S13). Lo que se prueba es lo que decide ella:
 * que pida el ZIP por su ruta, que traduzca un borde que contesta mal a un
 * codigo del panel, y que no se lleve un nombre de archivo que no sea uno.
 *
 * El guardado del blob en el disco del navegador no se prueba aca: usa
 * `document`, que el proyecto `unit` no tiene, y su unica decision —el nombre—
 * es la que se prueba abajo.
 */

const DEFECTO = "motul-2026-11-21.zip";

const conFetch = (respuesta: Response | Error) => {
  const fetchFalso = vi.fn<typeof fetch>(async () =>
    respuesta instanceof Error ? Promise.reject(respuesta) : respuesta,
  );
  vi.stubGlobal("fetch", fetchFalso);

  return fetchFalso;
};

const zip = (cabecera: string | null, cuerpo: string[] = ["datos"]) =>
  new Response(cuerpo.join(""), {
    status: 200,
    headers: cabecera ? { "content-disposition": cabecera } : {},
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("descargarLosDatos", () => {
  it("pide el ZIP con un acepto que no es el de una navegacion, y devuelve nombre y tamano", async () => {
    const fetchFalso = conFetch(
      zip('attachment; filename="motul-2026-11-21.zip"', ["zip-de-prueba"]),
    );

    const resultado = await descargarLosDatos(DEFECTO);

    expect(resultado).toMatchObject({
      tipo: "descargado",
      nombre: "motul-2026-11-21.zip",
      bytes: 13,
    });

    const [url, opciones] = fetchFalso.mock.calls[0] ?? [];
    expect(url).toBe(RUTA_DE_LA_DESCARGA);
    expect(opciones).toMatchObject({
      cache: "no-store",
      headers: { accept: "application/zip" },
    });
  });

  it("sin la cabecera del nombre usa el que la pantalla ya mostro", async () => {
    conFetch(zip(null));

    await expect(descargarLosDatos(DEFECTO)).resolves.toMatchObject({
      nombre: DEFECTO,
    });
  });

  it.each([
    [403, "sin-permiso"],
    [404, "no-encontrado"],
    [500, "fallo"],
    [502, "fallo"],
  ] as const)(
    "un %i del borde es el codigo %s dentro del panel",
    async (estado, codigo) => {
      conFetch(new Response("texto plano del servidor", { status: estado }));

      await expect(descargarLosDatos(DEFECTO)).resolves.toEqual({
        tipo: "error",
        codigo,
      });
    },
  );

  it("un fallo de red tambien es un codigo y no una excepcion suelta", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    conFetch(new Error("fetch fallo"));

    await expect(descargarLosDatos(DEFECTO)).resolves.toEqual({
      tipo: "error",
      codigo: "fallo",
    });
    expect(registro).toHaveBeenCalled();
  });

  it("un nombre que no es un ZIP se descarta", async () => {
    conFetch(zip('attachment; filename="../../etc/passwd"'));

    await expect(descargarLosDatos(DEFECTO)).resolves.toMatchObject({
      nombre: DEFECTO,
    });
  });
});

describe("nombreDeLaRespuesta", () => {
  it.each([
    ['attachment; filename="motul-2026-11-01.zip"', "motul-2026-11-01.zip"],
    ["attachment; filename=ticul-2025-01-31.zip", "ticul-2025-01-31.zip"],
    ['attachment; filename="x.csv"', DEFECTO],
    [null, DEFECTO],
  ])("de %s toma %s", (cabecera, esperado) => {
    expect(nombreDeLaRespuesta(cabecera, DEFECTO)).toBe(esperado);
  });
});

describe("ID_DEL_ENLACE_DE_DESCARGA", () => {
  /**
   * La isla cuelga su escucha del enlace que pinta el servidor. Si el id
   * cambia en un lado y no en el otro, con JavaScript la descarga sigue
   * funcionando sin estado y nadie se entera: se fija aca.
   */
  it("es el id que la pagina le pone al enlace", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const fuente = readFileSync(
      resolve(import.meta.dirname, "page.tsx"),
      "utf8",
    );

    expect(fuente).toContain("ID_DEL_ENLACE_DE_DESCARGA");
    expect(ID_DEL_ENLACE_DE_DESCARGA).toBe("descarga-de-datos");
  });
});
