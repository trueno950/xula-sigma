import { afterEach, describe, expect, it, vi } from "vitest";
import { pedirLaClave, RUTA_DE_LA_CLAVE } from "./pedirLaClave";

/**
 * La isla de la clave le pide la contrasenia al servidor una sola vez (S4 de
 * `usuarios-seguridad`): el `POST` lleva el token, la respuesta trae la clave
 * y el servidor borra la cookie en el mismo viaje. Lo que se prueba aca es
 * que la isla sepa leer las dos respuestas y que no invente una clave con una
 * respuesta que no la tiene.
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const CLAVE = "clave-temporal-larga";

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json" },
  });

const conFetch = (respuesta: Response | Error) => {
  const fetchFalso = vi.fn<typeof fetch>(async () =>
    respuesta instanceof Error ? Promise.reject(respuesta) : respuesta,
  );
  vi.stubGlobal("fetch", fetchFalso);

  return fetchFalso;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pedirLaClave", () => {
  it("pide la clave con el token en el cuerpo y la devuelve con su motivo", async () => {
    const fetchFalso = conFetch(respuesta({ clave: CLAVE, motivo: "alta" }));

    await expect(pedirLaClave(TOKEN)).resolves.toEqual({
      clave: CLAVE,
      motivo: "alta",
    });

    const [url, opciones] = fetchFalso.mock.calls[0] ?? [];
    expect(url).toBe(RUTA_DE_LA_CLAVE);
    expect(opciones).toMatchObject({
      method: "POST",
      cache: "no-store",
      body: JSON.stringify({ token: TOKEN }),
    });
    // La contrasenia viaja en la respuesta, nunca en la peticion.
    expect(String(opciones?.body)).not.toContain(CLAVE);
  });

  it("una segunda peticion ya no recibe nada", async () => {
    conFetch(new Response(null, { status: 404 }));

    await expect(pedirLaClave(TOKEN)).resolves.toBeNull();
  });

  it("una respuesta sin la forma esperada no se muestra a medias", async () => {
    for (const cuerpo of [
      {},
      { clave: "" },
      { clave: CLAVE },
      { motivo: "alta" },
    ]) {
      conFetch(respuesta(cuerpo));

      await expect(pedirLaClave(TOKEN)).resolves.toBeNull();
    }
  });

  it("si el servidor falla no se inventa una clave ni se registra", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    conFetch(respuesta({ message: "boom" }, 500));

    await expect(pedirLaClave(TOKEN)).resolves.toBeNull();
    expect(registro).not.toHaveBeenCalled();
  });

  it("si la red falla queda en el log sin la clave", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    conFetch(new Error("sin red"));

    await expect(pedirLaClave(TOKEN)).resolves.toBeNull();
    expect(registro).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(registro.mock.calls)).not.toContain(CLAVE);
  });
});
