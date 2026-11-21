import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { leerMarca } from "@/shared/marca";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearQuitarEscudo } from "./application/quitarEscudo";
import { escribirMarca, marcaDe } from "./escudoDePrueba";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * S7 contra Postgres real: «Quitar escudo» borra la **referencia** en
 * `ayuntamientos.marca` y el **objeto** del almacen, en ese orden. El guardado
 * de la marca es el mismo `escribirMarcaCompuesta` que usan la subida y los
 * colores —transaccion, validacion y traza—, y el borrado del objeto corre
 * fuera de la transaccion y best-effort, por la misma razon que el escudo
 * anterior en `cambiarEscudo`: la verdad esta en Postgres, no en el bucket.
 *
 * El unico doble es el almacen (`almacenDePrueba`), que necesita credenciales
 * que el test no tiene; `repositorioDeMarcaSql` es la implementacion real,
 * igual que en `cambiarEscudo.integration.test.ts`.
 */

// La clave lleva el `ayuntamientoId` real, que en los tests se aleatoriza:
// `claveTenantDesdeUrl` compara ese prefijo antes de borrar.
const ESCUDO = `https://assets.prueba.local/${motul}/escudo-previo.png`;

const COLORES = {
  primario: "oklch(0.42 0.12 25)",
  primarioTexto: "#ffffff",
  secundario: "#ffd700",
};

const CON_ESCUDO = { ...COLORES, escudo: ESCUDO };

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await escribirMarca(CON_ESCUDO);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("quitarEscudo", () => {
  it("borra la referencia y conserva los colores del municipio", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    await quitarEscudo(actor("ADMIN_MUNICIPAL"));

    expect(await marcaDe()).toEqual(COLORES);
    // El lector que usa `(panel)/layout.tsx`: sin `escudo`, la banda queda
    // solo con el nombre, que es el estado sin escudo de la pantalla.
    expect(leerMarca(await marcaDe()).escudo).toBeUndefined();
  });

  it("borra del almacen el objeto que estaba guardado", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    await quitarEscudo(actor("ADMIN_MUNICIPAL"));

    expect(almacen.borrados).toEqual([ESCUDO]);
  });

  it("un borrado que falla no deja el escudo puesto", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    almacen.fallarEnBorrar();

    await expect(
      quitarEscudo(actor("ADMIN_MUNICIPAL")),
    ).resolves.toBeUndefined();
    expect(await marcaDe()).toEqual(COLORES);
  });

  it("deja la traza de la escritura en la misma transaccion", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    await quitarEscudo(actor("ADMIN_MUNICIPAL"));

    const [traza] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(bitacora)
        .where(eq(bitacora.accion, "CAMBIAR_MARCA"))
        .orderBy(bitacora.ocurridoEn),
    );

    expect(traza?.accion).toBe("CAMBIAR_MARCA");
  });

  it("sin escudo guardado no borra nada y no falla", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    await escribirMarca(COLORES);
    await quitarEscudo(actor("ADMIN_MUNICIPAL"));

    expect(await marcaDe()).toEqual(COLORES);
    expect(almacen.borrados).toEqual([]);
  });

  it("un rol que no cambia la marca no escribe nada", async () => {
    const almacen = crearAlmacenDePrueba();
    const quitarEscudo = crearQuitarEscudo(almacen, repositorioDeMarcaSql);

    await expect(quitarEscudo(actor("OPERADOR"))).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
    expect(await marcaDe()).toEqual(CON_ESCUDO);
    expect(almacen.borrados).toEqual([]);
  });
});
