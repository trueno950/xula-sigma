import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  appSinTenant,
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { historialDeIntervencion, intervencionPorId } from "./composicion";
import { comoIntervencionId } from "./domain";
import { repositorioDeIntervencionesSql } from "./infrastructure";
import {
  intervenciones,
  revisionesDeIntervenciones,
} from "./infrastructure/esquema";
import { intervencionDe } from "./intervencionDePrueba";

/**
 * El historial de S11 lee `revisiones_de_intervenciones` junto con `usuarios`
 * por primera vez en el modulo, y las dos son tablas de tenant: sin RLS, el
 * detalle de una obra de Motul mostraria quien la corrigio en Ticul. La
 * garantia la da Postgres, asi que la prueba va contra Postgres.
 */
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
  await appSinTenant.end();
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
          registradoPorUsuarioId: gente[municipio].ADMIN_MUNICIPAL,
        }),
      )
      .returning({ id: intervenciones.id }),
  );
  if (!fila) throw new Error("No se pudo sembrar la intervencion de prueba.");
  return fila.id;
};

const corregirDescripcion = (lugarId: string, id: string) =>
  withTenant(motul, (tx) =>
    repositorioDeIntervencionesSql.corregir(tx, {
      id: comoIntervencionId(id),
      ayuntamientoId: motul,
      usuarioId: gente.motul.OPERADOR,
      cambios: {
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId,
        calleId: null,
        reporteId: null,
        descripcion: "Rehabilitacion del parque con juegos nuevos",
      },
    }),
  );

describe("aislamiento del historial de intervenciones", () => {
  it("trae la revision con el nombre y el rol de quien la hizo, y quien registro la obra", async () => {
    const lugar = await lugarDe("motul", "Comisaria Motul Historial");
    const id = await insertar("motul", lugar);
    await corregirDescripcion(lugar, id);

    const contexto = contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
    const intervencion = await intervencionPorId(
      comoIntervencionId(id),
      contexto,
    );
    if (!intervencion) throw new Error("No se pudo leer la intervencion.");

    const historial = await historialDeIntervencion(intervencion, contexto);

    expect(historial.revisiones).toHaveLength(1);
    expect(historial.revisiones[0]?.titulo).toBe("Descripción corregida");
    expect(historial.revisiones[0]?.cambios).toEqual([
      "Antes decía «Rehabilitacion del parque municipal».",
    ]);
    expect(historial.revisiones[0]?.autor).toEqual({
      nombre: "OPERADOR de motul",
      rol: "OPERADOR",
    });
    expect(historial.registradaPor).toEqual({
      nombre: "ADMIN_MUNICIPAL de motul",
      rol: "ADMIN_MUNICIPAL",
    });
  });

  it("desde otro municipio el historial no devuelve revisiones ni autores", async () => {
    const lugar = await lugarDe("motul", "Comisaria Motul Ajena");
    const id = await insertar("motul", lugar);
    await corregirDescripcion(lugar, id);

    const contextoAjeno = contextoDe(gente, "ticul", "ADMIN_MUNICIPAL");
    const intervencion = await intervencionPorId(
      comoIntervencionId(id),
      contextoAjeno,
    );

    expect(intervencion).toBeNull();

    const revisionesAjenas = await withTenant(ticul, (tx) =>
      tx.select().from(revisionesDeIntervenciones),
    );
    expect(revisionesAjenas).toHaveLength(0);
  });
});
