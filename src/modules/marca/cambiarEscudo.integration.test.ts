import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { ayuntamientos, bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearCambiarEscudo } from "./application/cambiarEscudo";
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

/** 80x80, la firma y el IHDR minimos para que `validarPng` lo acepte. */
function pngValido(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  bytes.set([0, 0, 0, 80], 16);
  bytes.set([0, 0, 0, 80], 20);
  return bytes;
}

const marcaDe = async (): Promise<Record<string, unknown> | undefined> => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, motul)),
  );

  return fila?.marca as Record<string, unknown> | undefined;
};

const escribirMarca = (marca: Record<string, unknown>) =>
  withTenant(motul, (tx) =>
    tx.update(ayuntamientos).set({ marca }).where(eq(ayuntamientos.id, motul)),
  );

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
  it("un rol distinto de ADMIN_MUNICIPAL no puede cambiar la marca", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: pngValido() }, actor("OPERADOR")),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(almacen.guardados.size).toBe(0);
  });

  it("una marca previa con color invalido no escribe nada y ya guardo en el almacen", async () => {
    /**
     * Las dos afirmaciones en un solo test y no en dos: la segunda solo
     * tiene sentido si la primera es cierta, y separarlas invitaria a que
     * una corriera sin la otra en algun refactor futuro.
     */
    const colorInvalido = { primario: "red;background:url(//x)" };
    await escribirMarca(colorInvalido);

    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: pngValido() }, actor("ADMIN_MUNICIPAL")),
    );

    expect(motivo.codigo).toBe("VALIDACION");
    expect(await marcaDe()).toEqual(colorInvalido);
    // El PUT ya paso para cuando la transaccion descubre el color
    // invalido: el huerfano queda en el almacen, aceptado por la
    // decision 4 de proposal.md.
    expect(almacen.guardados.size).toBe(1);
  });

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
