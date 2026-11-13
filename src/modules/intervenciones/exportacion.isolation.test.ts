import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeIntervenciones } from "./composicion";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

/**
 * Las porciones de exportacion que `intervenciones` agrega: el registro y su
 * historial de correcciones, leidos con el tenant fijado en dos municipios.
 *
 * `lugarId` se crea por la superficie publica de `territorio` -nunca por SQL
 * directo contra sus tablas-, mismo criterio que `reportes.isolation.test.ts`.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const porcionLLamada = (nombre: string) => {
  const porcion = porcionesDeIntervenciones.find(
    (candidata) => candidata.nombre === nombre,
  );

  if (!porcion) throw new Error(`La exportacion no declara "${nombre}".`);

  return porcion;
};

const valoresDe = async (
  conjunto: string,
  campo: string,
  ayuntamientoId: AyuntamientoId,
): Promise<readonly unknown[]> => {
  const filas = await withTenant(ayuntamientoId, (tx) =>
    porcionLLamada(conjunto).leer(tx),
  );

  return filas.map((fila) => (fila as Record<string, unknown>)[campo]);
};

const sembrarIntervencion = async (municipio: Municipio) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre: `Comisaria ${municipio}`, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  const [intervencion] = await withTenant(ayuntamientoId, (tx) =>
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

  if (!intervencion)
    throw new Error(`No se sembro la intervencion de ${municipio}.`);

  await withTenant(ayuntamientoId, (tx) =>
    tx.insert(revisionesDeIntervenciones).values({
      ayuntamientoId,
      intervencionId: intervencion.id,
      usuarioId: gente[municipio].OPERADOR,
      valoresAnteriores: {
        tipo: "OBRA",
        estado: "PLANIFICADA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque municipal",
      },
    }),
  );

  return intervencion.id;
};

let intervencionDeMotul: string;
let intervencionDeTicul: string;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  intervencionDeMotul = await sembrarIntervencion("motul");
  intervencionDeTicul = await sembrarIntervencion("ticul");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("porciones de exportacion de intervenciones", () => {
  it("intervenciones solo trae las del municipio activo", async () => {
    expect(await valoresDe("intervenciones", "id", motul)).toEqual([
      intervencionDeMotul,
    ]);
    expect(await valoresDe("intervenciones", "id", ticul)).toEqual([
      intervencionDeTicul,
    ]);
  });

  it("revisiones_de_intervenciones solo trae las del municipio activo", async () => {
    expect(
      await valoresDe("revisiones_de_intervenciones", "intervencionId", motul),
    ).toEqual([intervencionDeMotul]);
    expect(
      await valoresDe("revisiones_de_intervenciones", "intervencionId", ticul),
    ).toEqual([intervencionDeTicul]);
  });
});
