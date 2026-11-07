import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import {
  cerrarConexion,
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { comoDomicilioId, type LugarId } from "./domain";
import { lugares } from "./infrastructure/esquema";
import { lectorDeDireccionesSql } from "./infrastructure/lectorDeDireccionesSql";
import { lectorDeUbicacionesSql } from "./infrastructure/lectorDeUbicacionesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const enTenant = <T>(trabajo: (tx: TransaccionTenant) => Promise<T>) =>
  withTenant(contextoDe().ayuntamientoId, trabajo);

/**
 * Los casos de uso rechazan el ciclo; un UPDATE directo bajo el tenant lo
 * fabrica. El owner no sirve: las politicas de `lugares` son de xula_app.
 */
const crearCiclo = async (nombre: string) => {
  const a = await crearLugar("comisaria", `${nombre} A`);
  const b = await crearLugar("colonia", `${nombre} B`, a);
  const calle = await crearCalle(a, `Calle de ${nombre}`);
  const domicilio = await crearDomicilioEnCalle(b, calle, "1");
  await enTenant((tx) =>
    tx.update(lugares).set({ padreId: b }).where(eq(lugares.id, a)),
  );

  return { a, b, domicilio };
};

const domicilioInexistente = comoDomicilioId(
  "99999999-9999-4999-8999-999999999999",
);

const darDeBaja = (lugarId: LugarId) =>
  enTenant((tx) =>
    tx
      .update(lugares)
      .set({ bajaEn: new Date() })
      .where(eq(lugares.id, lugarId)),
  );

describe("bajar por la jerarquia con un ciclo de padre_id", () => {
  it("el subarbol termina y trae la colonia y su domicilio", async () => {
    const { a, b, domicilio } = await crearCiclo("Subarbol");

    const nodos = await enTenant((tx) =>
      repositorioDeLugaresSql.subarbol(tx, a),
    );

    expect(new Set(nodos.map((nodo) => nodo.id))).toEqual(
      new Set([b, domicilio]),
    );
  });

  it("los domicilios del subarbol terminan y traen el de la colonia", async () => {
    const { a, domicilio } = await crearCiclo("Por lugar");

    const domicilios = await enTenant((tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, a),
    );

    expect(new Set(domicilios.map((d) => d.id))).toEqual(new Set([domicilio]));
  });

  it("el registro filtrado por la raiz trae el domicilio una sola vez", async () => {
    const { a, domicilio } = await crearCiclo("Registro");

    const filas = await enTenant((tx) =>
      repositorioDeDomiciliosSql.registro(tx, {
        limite: 50,
        filtros: { raizId: a },
      }),
    );

    expect(filas.map((fila) => fila.id)).toEqual([domicilio]);
  });
});

describe("subir por la jerarquia", () => {
  it("con un ciclo, la subida se corta en la profundidad 8: nueve eslabones", async () => {
    const { b, domicilio } = await crearCiclo("Subida");

    const ubicacion = await enTenant((tx) =>
      lectorDeUbicacionesSql.partesDe(tx, b, null),
    );
    const direccion = await enTenant((tx) =>
      lectorDeDireccionesSql.partesDe(tx, domicilio),
    );

    expect(ubicacion?.ancestros).toHaveLength(9);
    expect(direccion?.ancestros).toHaveLength(9);
  });

  it("un ancestro dado de baja corta la cadena en el ultimo eslabon activo", async () => {
    const asentamiento = await crearLugar("comisaria", "Asentamiento de baja");
    const colonia = await crearLugar("colonia", "Colonia viva", asentamiento);
    const calle = await crearCalle(asentamiento, "Calle de la baja");
    const domicilio = await crearDomicilioEnCalle(colonia, calle, "2");
    await darDeBaja(asentamiento);

    const ubicacion = await enTenant((tx) =>
      lectorDeUbicacionesSql.partesDe(tx, colonia, null),
    );
    const direccion = await enTenant((tx) =>
      lectorDeDireccionesSql.partesDe(tx, domicilio),
    );

    expect(ubicacion?.ancestros).toEqual(["Colonia viva"]);
    expect(direccion?.ancestros).toEqual(["Colonia viva"]);
  });

  it("un domicilio que no existe no tiene direccion", async () => {
    const direccion = await enTenant((tx) =>
      lectorDeDireccionesSql.partesDe(tx, domicilioInexistente),
    );

    expect(direccion).toBeNull();
  });
});
