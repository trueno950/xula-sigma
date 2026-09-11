import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarEstadoDeIntervencion } from "./application/cambiarEstadoDeIntervencion";
import { repositorioDeIntervencionesSql } from "./infrastructure";
import { intervenciones } from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

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

const lugarDe = async (nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
  );
  return id;
};

const insertar = async (lugarId: string) => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .insert(intervenciones)
      .values(
        intervencionDe({
          ayuntamientoId: motul,
          lugarId,
          registradoPorUsuarioId: gente.motul.OPERADOR,
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

describe("rollback del estado de intervenciones", () => {
  it("revierte el estado si falla la insercion de bitacora", async () => {
    const lugarMotul = await lugarDe("Comisaria Motul Rollback Estado");
    const id = await insertar(lugarMotul);
    const contexto = {
      ...contextoDe(gente, "motul", "ADMIN_MUNICIPAL"),
      usuario: { id: "actor-no-uuid", rol: "ADMIN_MUNICIPAL" as const },
    };

    const motivo = await motivoDeFalla(() =>
      cambiarEstado({ id, estadoNuevo: "EN_EJECUCION" }, contexto),
    );

    expect(motivo).toMatch(/invalid input syntax for type uuid/i);
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({ estado: intervenciones.estado })
          .from(intervenciones)
          .where(eq(intervenciones.id, id)),
      ),
    ).resolves.toEqual([{ estado: "PLANIFICADA" }]);
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({ id: bitacora.id })
          .from(bitacora)
          .where(
            and(
              eq(bitacora.accion, "CAMBIAR_ESTADO_INTERVENCION"),
              eq(bitacora.entidadId, id),
            ),
          ),
      ),
    ).resolves.toEqual([]);
  });
});
