import postgres, { type TransactionSql } from "postgres";
import { CORREO, MUNICIPIOS } from "./municipios";

export type Scenario = {
  origenId: string;
  destino: string;
  vacioId: string;
  movibleId: string;
  reporteCalleId: string;
  movible: string;
  duplicada: string;
  domicilio: string;
  reporte: string;
  intervencionId: string;
};

type IdRow = { id: string };

const marca = Date.now();
const consecutivo = 100000 + (marca % 100000);
const nombres = {
  origen: `Calles origen ${marca}`,
  destino: `Calles destino ${marca}`,
  vacio: `Calles vacio ${marca}`,
  libre: `Calle libre ${marca}`,
  movible: `Calle movible ${marca}`,
  domicilio: `Calle con domicilio ${marca}`,
  reporte: `Calle con reporte ${marca}`,
};

const filaAusente = (nombre: string): never => {
  throw new Error(`Falta fila de ${nombre} en el escenario E2E.`);
};

const insertarLugar = (tx: TransactionSql, tipo: string, nombre: string) =>
  tx<IdRow[]>`
    INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
    VALUES (${MUNICIPIOS.motul.id}, ${tipo}, ${nombre})
    RETURNING id
  `;

const insertarCalle = (tx: TransactionSql, nombre: string, lugarId: string) =>
  tx<IdRow[]>`
    INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
    VALUES (${MUNICIPIOS.motul.id}, ${nombre}, ${lugarId})
    RETURNING id
  `;

type LugaresDelEscenario = {
  origen: IdRow;
  destino: IdRow;
  vacio: IdRow;
};

const crearLugares = async (
  tx: TransactionSql,
): Promise<LugaresDelEscenario> => {
  const [origen = { id: filaAusente("origen") }] = await insertarLugar(
    tx,
    "cabecera",
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

type CallesDelEscenario = {
  movible: IdRow;
  domicilio: IdRow;
  reporte: IdRow;
};

const crearCalles = async (
  tx: TransactionSql,
  lugares: LugaresDelEscenario,
): Promise<CallesDelEscenario> => {
  const [movible = { id: filaAusente("movible") }] = await insertarCalle(
    tx,
    nombres.movible,
    lugares.origen.id,
  );
  await insertarCalle(tx, nombres.libre, lugares.origen.id);
  await insertarCalle(tx, nombres.libre, lugares.destino.id);
  const [domicilio = { id: filaAusente("domicilio") }] = await insertarCalle(
    tx,
    nombres.domicilio,
    lugares.origen.id,
  );
  const [reporte = { id: filaAusente("reporte") }] = await insertarCalle(
    tx,
    nombres.reporte,
    lugares.origen.id,
  );

  return { movible, domicilio, reporte };
};

type DatosDeReporte = {
  tx: TransactionSql;
  lugarId: string;
  calleId: string;
  usuarioId: string;
};

const insertarDomicilio = (
  tx: TransactionSql,
  lugarId: string,
  calleId: string,
) =>
  tx`
    INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id)
    VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${calleId})
  `;

const insertarReporte = ({ tx, lugarId, calleId, usuarioId }: DatosDeReporte) =>
  tx`
    INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo, estado, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, ${`REP-E2E-${marca}`}, 2026, ${consecutivo}, 'BACHE', 'RECIBIDO', ${lugarId}, ${calleId}, 'Reporte de prueba', ${usuarioId})
  `;

const sembrarEscenario = async (tx: TransactionSql): Promise<Scenario> => {
  await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
  const [usuario = { id: filaAusente("usuario") }] = await tx<IdRow[]>`
    SELECT id FROM usuarios WHERE email = ${CORREO} LIMIT 1
  `;
  const lugares = await crearLugares(tx);
  const calles = await crearCalles(tx, lugares);
  await insertarDomicilio(tx, lugares.origen.id, calles.domicilio.id);
  await insertarReporte({
    tx,
    lugarId: lugares.origen.id,
    calleId: calles.reporte.id,
    usuarioId: usuario.id,
  });
  const [intervencion = { id: filaAusente("intervencion") }] = await tx<
    IdRow[]
  >`
    INSERT INTO intervenciones (ayuntamiento_id, tipo, estado, fecha_de_ocurrencia, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, 'OBRA', 'PLANIFICADA', '2026-01-15', ${lugares.origen.id}, ${calles.domicilio.id}, 'Rehabilitacion del parque municipal', ${usuario.id})
    RETURNING id
  `;

  return {
    origenId: lugares.origen.id,
    destino: nombres.destino,
    vacioId: lugares.vacio.id,
    movibleId: calles.movible.id,
    reporteCalleId: calles.reporte.id,
    movible: nombres.movible,
    duplicada: nombres.libre,
    domicilio: nombres.domicilio,
    reporte: nombres.reporte,
    intervencionId: intervencion.id,
  };
};

export async function prepararEscenario(): Promise<Scenario> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(sembrarEscenario);
  } finally {
    await app.end();
  }
}

export async function leerAuditoria(escenario: Scenario): Promise<string[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const filas = await tx<{ accion: string }[]>`
        SELECT accion
          FROM bitacora
         WHERE entidad = 'calles'
           AND entidad_id IN (${escenario.movibleId}, ${escenario.reporteCalleId})
         ORDER BY ocurrido_en
      `;
      return filas.map((fila) => fila.accion);
    });
  } finally {
    await app.end();
  }
}
