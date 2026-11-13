import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { altaDePersona } from "@/modules/padron";
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
import { porcionesDeConstancias } from "./composicion";
import {
  configuracionDeDocumentos,
  constancias,
  foliosDeDocumentos,
  reimpresiones,
} from "./infrastructure/esquema";

/**
 * Las porciones de exportacion que `constancias` agrega al rebanada 8: el
 * historial de reimpresiones, el bloque de firma y los contadores de folio.
 *
 * Los dos conjuntos sin `id` -`configuracion_de_documentos` y
 * `folios_de_documentos`- se siembran con la MISMA llave en los dos
 * municipios: si el filtro de tenant no existiera, la lectura devolveria las
 * dos filas y la igualdad exacta de abajo fallaria.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const porcionLLamada = (nombre: string) => {
  const porcion = porcionesDeConstancias.find(
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

const sembrarMunicipio = async (municipio: Municipio) => {
  const ayuntamientoId = municipio === "motul" ? motul : ticul;
  const { id: personaId } = await altaDePersona(
    {
      nombres: `Titular ${municipio}`,
      primerApellido: "Poot",
      segundoApellido: null,
      curp: null,
    },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );
  const [constancia] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(constancias)
      .values({
        ayuntamientoId,
        tipo: "VECINDAD",
        folio: "VEC-2026-000001",
        anio: 2026,
        consecutivo: 1,
        codigoVerificacion: "a1b2c3d4e5f60718",
        personaId,
        datos: {},
        plantillaVersion: "vecindad-v1",
        emitidaPorUsuarioId: gente[municipio].OPERADOR,
      })
      .returning({ id: constancias.id }),
  );

  if (!constancia)
    throw new Error(`No se sembro la constancia de ${municipio}.`);

  await withTenant(ayuntamientoId, (tx) =>
    tx.insert(reimpresiones).values({
      ayuntamientoId,
      constanciaId: constancia.id,
      usuarioId: gente[municipio].OPERADOR,
      motivo: "EXTRAVIO",
    }),
  );
  await withTenant(ayuntamientoId, (tx) =>
    tx.insert(configuracionDeDocumentos).values({
      ayuntamientoId,
      datos: { firmanteNombre: `Firmante ${municipio}` },
    }),
  );
  await withTenant(ayuntamientoId, (tx) =>
    tx.insert(foliosDeDocumentos).values({
      ayuntamientoId,
      tipo: "VECINDAD",
      anio: 2026,
      ultimoConsecutivo: municipio === "motul" ? 7 : 9,
    }),
  );
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  await sembrarMunicipio("motul");
  await sembrarMunicipio("ticul");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("porciones de exportacion de constancias", () => {
  it("reimpresiones solo trae las del municipio activo", async () => {
    expect(await valoresDe("reimpresiones", "motivo", motul)).toEqual([
      "EXTRAVIO",
    ]);
    expect(await valoresDe("reimpresiones", "motivo", ticul)).toEqual([
      "EXTRAVIO",
    ]);
  });

  it("configuracion_de_documentos solo trae el bloque de firma del municipio activo", async () => {
    expect(
      await valoresDe("configuracion_de_documentos", "datos", motul),
    ).toEqual([{ firmanteNombre: "Firmante motul" }]);
    expect(
      await valoresDe("configuracion_de_documentos", "datos", ticul),
    ).toEqual([{ firmanteNombre: "Firmante ticul" }]);
  });

  it("folios_de_documentos solo trae el contador del municipio activo", async () => {
    expect(
      await valoresDe("folios_de_documentos", "ultimoConsecutivo", motul),
    ).toEqual([7]);
    expect(
      await valoresDe("folios_de_documentos", "ultimoConsecutivo", ticul),
    ).toEqual([9]);
  });
});
