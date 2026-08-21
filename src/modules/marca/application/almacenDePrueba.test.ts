import { describe, expect, it } from "vitest";
import { crearAlmacenDePrueba } from "./almacenDePrueba";

describe("almacenDePrueba", () => {
  it("guardar devuelve una URL bajo su propio dominio y la deja en guardados", async () => {
    const almacen = crearAlmacenDePrueba();
    const bytes = new Uint8Array([1, 2, 3]);

    const url = await almacen.guardar("motul/escudo-x.png", bytes);

    expect(url).toContain("motul/escudo-x.png");
    expect(almacen.guardados.get("motul/escudo-x.png")).toEqual(bytes);
  });

  it("borrar una URL propia la saca de guardados y la registra en borrados", async () => {
    const almacen = crearAlmacenDePrueba();
    const url = await almacen.guardar(
      "motul/escudo-x.png",
      new Uint8Array([1]),
    );

    await almacen.borrar("motul", url);

    expect(almacen.guardados.has("motul/escudo-x.png")).toBe(false);
    expect(almacen.borrados).toEqual([url]);
  });

  it("borrar no-opea sobre una URL de otro host: no toca guardados ni borrados", async () => {
    // Primera barrera del contrato de `borrar`, en `puertos.ts`.
    const almacen = crearAlmacenDePrueba();
    await almacen.guardar("motul/escudo-x.png", new Uint8Array([1]));

    await almacen.borrar(
      "motul",
      "https://otro-dominio.example/motul/escudo-x.png",
    );

    expect(almacen.guardados.has("motul/escudo-x.png")).toBe(true);
    expect(almacen.borrados).toEqual([]);
  });

  it("borrar no-opea sobre la clave de otro ayuntamiento en el mismo host", async () => {
    // Segunda barrera del contrato de `borrar`, en `puertos.ts`.
    const almacen = crearAlmacenDePrueba();
    await almacen.guardar("ticul/escudo-x.png", new Uint8Array([1]));

    await almacen.borrar(
      "motul",
      "https://assets.prueba.local/ticul/escudo-x.png",
    );

    expect(almacen.guardados.has("ticul/escudo-x.png")).toBe(true);
    expect(almacen.borrados).toEqual([]);
  });

  it("fallarEnGuardar hace que guardar lance", async () => {
    const almacen = crearAlmacenDePrueba();
    almacen.fallarEnGuardar();

    await expect(almacen.guardar("x", new Uint8Array())).rejects.toThrow();
  });

  it("fallarEnBorrar hace que borrar lance sobre una URL propia", async () => {
    const almacen = crearAlmacenDePrueba();
    const url = await almacen.guardar("motul/x", new Uint8Array());
    almacen.fallarEnBorrar();

    await expect(almacen.borrar("motul", url)).rejects.toThrow();
  });
});
