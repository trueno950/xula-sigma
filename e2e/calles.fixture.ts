import { randomBytes } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import {
  crearCalles,
  crearLugares,
  filaAusente,
  type IdRow,
  insertarDomicilio,
  insertarReporte,
  nombresDe,
} from "./escenarioSql";
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
  folio: string;
  intervencionId: string;
};

/**
 * `cabecera` solo admite una fila viva por municipio
 * (`lugares_una_cabecera`), asi que solo un escenario por base puede raizar
 * ahi: el de `calles.spec.ts`, que es el valor por defecto. Cualquier otro
 * spec que siembre Motul en la misma base pide `comisaria`.
 */
export type OpcionesDeEscenario = { tipoDeRaiz?: "cabecera" | "comisaria" };

// Una marca por llamada: nombres y folio son unicos por municipio, y dos
// specs que siembran en la misma corrida no pueden repetirlos.
const marcaNueva = () => `${Date.now()}-${randomBytes(3).toString("hex")}`;

const sembrarEscenario = async (
  tx: TransactionSql,
  tipoDeRaiz: string,
): Promise<Scenario> => {
  const marca = marcaNueva();
  const nombres = nombresDe(marca);
  const folio = `REP-E2E-${marca}`;
  await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
  const [usuario = { id: filaAusente("usuario") }] = await tx<IdRow[]>`
    SELECT id FROM usuarios WHERE email = ${CORREO} LIMIT 1
  `;
  const lugares = await crearLugares(tx, nombres, tipoDeRaiz);
  const calles = await crearCalles(tx, lugares, nombres);
  await insertarDomicilio(tx, lugares.origen.id, calles.domicilio.id);
  await insertarReporte({
    tx,
    lugarId: lugares.origen.id,
    calleId: calles.reporte.id,
    usuarioId: usuario.id,
    folio,
  });
  const [intervencion = { id: filaAusente("intervencion") }] = await tx<
    IdRow[]
  >`
    INSERT INTO intervenciones (ayuntamiento_id, tipo, estado, fecha_de_ocurrencia, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, 'OBRA', 'PLANIFICADA', '2026-01-15', ${lugares.origen.id}, ${calles.reporte.id}, 'Rehabilitacion del parque municipal', ${usuario.id})
    RETURNING id
  `;
  await tx`
    INSERT INTO intervenciones (ayuntamiento_id, tipo, estado, fecha_de_ocurrencia, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, 'MANTENIMIENTO', 'PLANIFICADA', '2026-01-14', ${lugares.origen.id}, ${calles.domicilio.id}, 'Cobertura sin punto', ${usuario.id})
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
    folio,
    intervencionId: intervencion.id,
  };
};

export async function prepararEscenario({
  tipoDeRaiz = "cabecera",
}: OpcionesDeEscenario = {}): Promise<Scenario> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin((tx) => sembrarEscenario(tx, tipoDeRaiz));
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

/**
 * Vacia la ventana del limitador de ritmo de acceso. Los specs anteriores de
 * la corrida ya gastaron intentos del mismo correo, y un spec que entra dos
 * veces mas se topa con "Demasiados intentos" por el orden alfabetico de los
 * archivos, no por lo que prueba. Es el mismo `TRUNCATE` de
 * `bajaDeLugar.spec.ts`.
 */
export async function liberarVentanaDeRitmo(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("Falta MIGRATION_DATABASE_URL para el E2E.");

  const owner = postgres(url, { max: 1 });
  try {
    await owner`TRUNCATE intentos_acceso`;
  } finally {
    await owner.end();
  }
}
