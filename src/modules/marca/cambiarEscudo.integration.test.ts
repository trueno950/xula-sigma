import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearCambiarEscudo } from "./application/cambiarEscudo";
import { escribirMarca, marcaDe, pngValido } from "./escudoDePrueba";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * El caso de uso completo contra Postgres real: `withTenant`, RLS y
 * bitacora no se pueden simular con un mock. `almacenDePrueba` reemplaza
 * solo la parte que necesita credenciales de verdad — `RepositorioDeMarca`
 * no tiene doble: `repositorioDeMarcaSql` es la unica implementacion, real
 * en produccion y en este test, porque no hay credenciales externas que
 * fakear (design.md, `infrastructure/repositorioDeMarcaSql.ts`).
 *
 * Este archivo vive en la raiz del modulo y no en `application/` a
 * proposito: `application-no-importa-infra-ni-ui` esta anclada a
 * `^src/modules/[^/]+/application/`, y un test ahi adentro que importara
 * `repositorioDeMarcaSql` desde `infrastructure/` la violaria en el test
 * mismo — el mismo motivo mecanico por el que `almacenDePrueba.ts` vive en
 * `application/` y no en `infrastructure/`.
 */

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await escribirMarca({});
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("cambiarEscudo", () => {
  it("la clave lleva el ayuntamientoId del contexto, no de un parametro", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    await cambiarEscudo({ bytes: pngValido() }, actor("ADMIN_MUNICIPAL"));

    const [clave] = almacen.guardados.keys();

    expect(clave).toMatch(new RegExp(`^${motul}/escudo-`));
  });

  it("un admin sube un escudo valido: queda en la fila y en bitacora, en la misma transaccion", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const contexto = actor("ADMIN_MUNICIPAL");

    const resultado = await cambiarEscudo({ bytes: pngValido() }, contexto);

    expect(resultado.escudo).toContain(motul);

    const marca = await marcaDe();
    expect(marca?.escudo).toBe(resultado.escudo);

    const [traza] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(bitacora)
        .where(eq(bitacora.accion, "CAMBIAR_MARCA"))
        .orderBy(bitacora.ocurridoEn),
    );

    expect(traza?.actor).toBe(contexto.usuario.id);
    expect(traza?.entidadId).toBe(motul);
  });

  it("reemplazar un escudo borra el anterior despues del commit", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const contexto = actor("ADMIN_MUNICIPAL");

    const primero = await cambiarEscudo({ bytes: pngValido() }, contexto);
    const segundo = await cambiarEscudo({ bytes: pngValido() }, contexto);

    expect(segundo.escudo).not.toBe(primero.escudo);
    expect(almacen.borrados).toEqual([primero.escudo]);
  });

  it("un borrado que falla no cambia el resultado de la subida", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const contexto = actor("ADMIN_MUNICIPAL");

    await cambiarEscudo({ bytes: pngValido() }, contexto);
    almacen.fallarEnBorrar();

    const segundo = await cambiarEscudo({ bytes: pngValido() }, contexto);

    expect(segundo.escudo).toBeTruthy();
    expect((await marcaDe())?.escudo).toBe(segundo.escudo);
  });
});
