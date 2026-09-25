import type { TransactionSql } from "postgres";
import { MUNICIPIOS } from "./municipios";

/** Inserciones SQL del escenario de `calles.fixture.ts`. */
export type IdRow = { id: string };

export type Nombres = ReturnType<typeof nombresDe>;

export const nombresDe = (marca: string) => ({
  origen: `Calles origen ${marca}`,
  destino: `Calles destino ${marca}`,
  vacio: `Calles vacio ${marca}`,
  libre: `Calle libre ${marca}`,
  movible: `Calle movible ${marca}`,
  domicilio: `Calle con domicilio ${marca}`,
  reporte: `Calle con reporte ${marca}`,
});

export const filaAusente = (nombre: string): never => {
  throw new Error(`Falta fila de ${nombre} en el escenario E2E.`);
};

const insertarLugar = (tx: TransactionSql, tipo: string, nombre: string) =>
  tx<IdRow[]>`
    INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
    VALUES (${MUNICIPIOS.motul.id}, ${tipo}, ${nombre})
    RETURNING id
  `;

type CalleNueva = {
  nombre: string;
  lugarId: string;
  punto?: { latitud: number; longitud: number };
};

const insertarCalle = (
  tx: TransactionSql,
  { nombre, lugarId, punto }: CalleNueva,
) =>
  tx<IdRow[]>`
    INSERT INTO calles (ayuntamiento_id, nombre, lugar_id, latitud, longitud)
    VALUES (${MUNICIPIOS.motul.id}, ${nombre}, ${lugarId}, ${punto?.latitud ?? null}, ${punto?.longitud ?? null})
    RETURNING id
  `;

export type LugaresDelEscenario = {
  origen: IdRow;
  destino: IdRow;
  vacio: IdRow;
};

export const crearLugares = async (
  tx: TransactionSql,
  nombres: Nombres,
  tipoDeRaiz: string,
): Promise<LugaresDelEscenario> => {
  const [origen = { id: filaAusente("origen") }] = await insertarLugar(
    tx,
    tipoDeRaiz,
    nombres.origen,
  );
  const [destino = { id: filaAusente("destino") }] = await insertarLugar(
    tx,
    "comisaria",
    nombres.destino,
  );
  const [vacio = { id: filaAusente("vacio") }] = await insertarLugar(
    tx,
    "comisaria",
    nombres.vacio,
  );

  return { origen, destino, vacio };
};

export type CallesDelEscenario = {
  movible: IdRow;
  domicilio: IdRow;
  reporte: IdRow;
};

export const crearCalles = async (
  tx: TransactionSql,
  lugares: LugaresDelEscenario,
  nombres: Nombres,
): Promise<CallesDelEscenario> => {
  const [movible = { id: filaAusente("movible") }] = await insertarCalle(tx, {
    nombre: nombres.movible,
    lugarId: lugares.origen.id,
  });
  await insertarCalle(tx, {
    nombre: nombres.libre,
    lugarId: lugares.origen.id,
  });
  await insertarCalle(tx, {
    nombre: nombres.libre,
    lugarId: lugares.destino.id,
  });
  const [domicilio = { id: filaAusente("domicilio") }] = await insertarCalle(
    tx,
    {
      nombre: nombres.domicilio,
      lugarId: lugares.origen.id,
    },
  );
  const [reporte = { id: filaAusente("reporte") }] = await insertarCalle(tx, {
    nombre: nombres.reporte,
    lugarId: lugares.origen.id,
    punto: { latitud: 21.283, longitud: -89.667 },
  });

  return { movible, domicilio, reporte };
};

export type DatosDeReporte = {
  tx: TransactionSql;
  lugarId: string;
  calleId: string;
  usuarioId: string;
  folio: string;
};

export const insertarDomicilio = (
  tx: TransactionSql,
  lugarId: string,
  calleId: string,
) =>
  tx`
    INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id)
    VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${calleId})
  `;

// La serie `(municipio, anio, consecutivo)` es unica: se toma el siguiente
// libre en la misma transaccion en vez de adivinarlo desde el reloj.
export const insertarReporte = ({
  tx,
  lugarId,
  calleId,
  usuarioId,
  folio,
}: DatosDeReporte) =>
  tx`
    INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo, estado, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, ${folio}, 2026, (SELECT COALESCE(MAX(consecutivo), 0) + 1 FROM reportes WHERE anio = 2026), 'BACHE', 'RECIBIDO', ${lugarId}, ${calleId}, 'Reporte de prueba', ${usuarioId})
  `;
