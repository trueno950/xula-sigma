import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/shared/auth/alta";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { conjuntosDe } from "@/shared/exportacion/conjuntosDePlataforma";
import {
  type Inventario,
  inventarioDeAyuntamiento,
  nombresDeConjuntos,
} from "@/shared/exportacion/inventario";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { porciones } from "./porciones";

/**
 * El inventario de la pantalla contra la base real (S10, S11).
 *
 * Los dos pines que ningun mock puede dar:
 *
 * 1. **La lista de la pantalla es la del ZIP.** Sale de las mismas porciones
 *    que `descargaDeDatos.ts` le pasa al exportador, asi que un conjunto
 *    nuevo aparece en las dos o en ninguna.
 * 2. **El conteo es el del archivo.** Cada `filas` se lee con un `count(*)`
 *    sobre la tabla del mismo nombre que el conjunto; si una porcion cambia
 *    de tabla y su nombre no, este test lo rompe en vez de que la pantalla
 *    diga un numero que el CSV no tiene.
 *
 * Y el aislamiento: los conteos se leen bajo `withTenant`, no con una
 * conexion propia. Lo que se suma al municipio de al lado no cambia estos
 * numeros.
 */

let gente: GentePorMunicipio;

const administrador = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

const conjuntosDelZip = () =>
  withTenant(motul, (tx) => conjuntosDe(tx, porciones));

/** Las filas de `usuarios` en un inventario, que es el conjunto de personas. */
const usuariosDe = (inventario: Inventario): number =>
  inventario.conjuntos.find((conjunto) => conjunto.nombre === "usuarios")
    ?.filas ?? 0;

const filasDelArchivo = async (): Promise<Record<string, number>> =>
  Object.fromEntries(
    Object.entries(await conjuntosDelZip()).map(([nombre, filas]) => [
      nombre,
      filas.length,
    ]),
  );

const trazasDeExportacion = () =>
  withTenant(motul, (tx) =>
    tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.accion, "EXPORTAR_AYUNTAMIENTO")),
  );

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("inventario de la exportacion", () => {
  it("la pantalla lista exactamente los conjuntos que lleva el ZIP", async () => {
    const enElZip = Object.keys(await conjuntosDelZip());

    expect(nombresDeConjuntos(porciones)).toEqual(enElZip);
  });

  it("cada conteo es el numero de filas que lleva el CSV de ese conjunto", async () => {
    const inventario = await inventarioDeAyuntamiento(
      administrador(),
      porciones,
    );
    const filas = await filasDelArchivo();

    expect(
      Object.fromEntries(
        inventario.conjuntos.map((conjunto) => [
          conjunto.nombre,
          conjunto.filas,
        ]),
      ),
    ).toEqual(filas);
  });

  it("incluye a los usuarios del personal aunque el total sea de un municipio", async () => {
    const inventario = await inventarioDeAyuntamiento(
      administrador(),
      porciones,
    );
    const usuarios = inventario.conjuntos.find(
      (conjunto) => conjunto.nombre === "usuarios",
    );

    expect(usuarios?.filas).toBeGreaterThan(0);
  });

  it("lo que se da de alta en otro municipio no cambia estos numeros", async () => {
    const administradorDeTicul = contextoDe(gente, "ticul", "ADMIN_MUNICIPAL");
    const antesDeMotul = await inventarioDeAyuntamiento(
      administrador(),
      porciones,
    );
    const antesDeTicul = await inventarioDeAyuntamiento(
      administradorDeTicul,
      porciones,
    );

    await withTenant(ticul, (tx) =>
      altaDePersona(tx, ticul, {
        nombre: "Persona de Ticul",
        email: `persona-${ticul}@example.com`,
        clave: "clave-larga-de-prueba",
        rol: "OPERADOR",
      }),
    );

    const despuesDeMotul = await inventarioDeAyuntamiento(
      administrador(),
      porciones,
    );
    const despuesDeTicul = await inventarioDeAyuntamiento(
      administradorDeTicul,
      porciones,
    );

    expect(despuesDeMotul.conjuntos).toEqual(antesDeMotul.conjuntos);
    expect(usuariosDe(despuesDeTicul)).toBe(usuariosDe(antesDeTicul) + 1);
  });

  /**
   * Contar no es entregar. Si el inventario empezara a leer las filas en vez
   * de contarlas —o a llamar al exportador— dejaria una traza de entrega por
   * cada vez que alguien abre la pantalla, y la bitacora diria que hubo
   * exportaciones que nadie descargo.
   */
  it("contar no deja traza de exportacion en la bitacora", async () => {
    await inventarioDeAyuntamiento(administrador(), porciones);

    expect(await trazasDeExportacion()).toHaveLength(0);
  });
});
