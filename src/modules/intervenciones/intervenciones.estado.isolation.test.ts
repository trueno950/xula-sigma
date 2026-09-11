import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { NoEncontradoError } from "@/shared/lib/errores";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarEstadoDeIntervencion } from "./application/cambiarEstadoDeIntervencion";
import { repositorioDeIntervencionesSql } from "./infrastructure";
import { intervenciones } from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (municipio: Municipio, lugarId: string) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId,
          lugarId,
          registradoPorUsuarioId: gente[municipio].OPERADOR,
        }),
      )
      .returning({ id: intervenciones.id }),
  );

  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");

  return fila.id;
};

const cambiarEstado = crearCambiarEstadoDeIntervencion({
  repositorio: repositorioDeIntervencionesSql,
});

describe("estado de intervenciones", () => {
  it("administra estado, audita por id y oculta otro tenant", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Estado");
    const idMotul = await insertar("motul", lugarMotul);
    const adminMotul = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

    await cambiarEstado(
      { id: idMotul, estadoNuevo: "EN_EJECUCION" },
      adminMotul,
    );

    await expect(
      withTenant(motul, (tx) =>
        tx.select({ estado: intervenciones.estado }).from(intervenciones),
      ),
    ).resolves.toEqual([{ estado: "EN_EJECUCION" }]);
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({ accion: bitacora.accion, entidadId: bitacora.entidadId })
          .from(bitacora)
          .where(eq(bitacora.entidadId, idMotul)),
      ),
    ).resolves.toContainEqual({
      accion: "CAMBIAR_ESTADO_INTERVENCION",
      entidadId: idMotul,
    });

    const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Estado Ajeno");
    const idTicul = await insertar("ticul", lugarTicul);
    await expect(
      cambiarEstado({ id: idTicul, estadoNuevo: "EN_EJECUCION" }, adminMotul),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("no pisa un estado nuevo cuando la lectura quedó obsoleta", async () => {
    const lugarMotul = await lugarDe("motul", "Comisaria Motul Carrera Estado");
    const id = await insertar("motul", lugarMotul);
    const admin = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    let continuar: () => void = () => {};
    const lecturaCompleta = new Promise<void>((resolve) => {
      continuar = resolve;
    });
    let liberar: () => void = () => {};
    const puedeContinuar = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const repositorioConCarrera = {
      buscarPorId: async (
        tx: Parameters<typeof repositorioDeIntervencionesSql.buscarPorId>[0],
        intervencionId: Parameters<
          typeof repositorioDeIntervencionesSql.buscarPorId
        >[1],
      ) => {
        const actual = await repositorioDeIntervencionesSql.buscarPorId(
          tx,
          intervencionId,
        );
        continuar();
        await puedeContinuar;
        return actual;
      },
      aplicarTransicion: repositorioDeIntervencionesSql.aplicarTransicion,
    };
    const cambiarEstadoObsoleto = crearCambiarEstadoDeIntervencion({
      repositorio: repositorioConCarrera,
    });
    const intento = cambiarEstadoObsoleto(
      { id, estadoNuevo: "EN_EJECUCION" },
      admin,
    );

    try {
      await lecturaCompleta;
      const actualizada = await enTransaccionParalela(
        motul,
        (tx) =>
          tx`
          UPDATE intervenciones
             SET estado = 'CANCELADA'
           WHERE id = ${id} AND estado = 'PLANIFICADA'
           RETURNING id
          `,
      );
      expect(actualizada).toHaveLength(1);
      liberar();
      await expect(intento).rejects.toBeInstanceOf(NoEncontradoError);
    } finally {
      liberar();
      await intento.catch(() => undefined);
    }

    await expect(
      withTenant(motul, (tx) =>
        tx.select({ estado: intervenciones.estado }).from(intervenciones),
      ),
    ).resolves.toEqual([{ estado: "CANCELADA" }]);
  });
});
