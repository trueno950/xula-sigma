import { randomBytes } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import { anioEnMerida } from "@/shared/lib/fecha";
import { CORREO, MUNICIPIOS } from "./municipios";

type IdRow = { id: string };
type ReporteUbicacion = {
  domicilioId: string | null;
  lugarId: string;
  calleId: string | null;
  numero: string | null;
};

export type EscenarioDeDireccionDeReporte = {
  asentamientoId: string;
  coloniaId: string;
  calleId: string;
  domicilioId: string;
  consulta: string;
  etiqueta: string;
  folioSimilar: string;
};

const exigirFila = <T>(fila: T | undefined, concepto: string): T => {
  if (!fila) throw new Error(`Falta fila de ${concepto} en el escenario T6b.`);
  return fila;
};

const insertarLugar = (
  tx: TransactionSql,
  opciones: { tipo: string; nombre: string; padreId?: string },
) => tx<IdRow[]>`
  INSERT INTO lugares (ayuntamiento_id, tipo, nombre, padre_id)
  VALUES (
    ${MUNICIPIOS.motul.id}, ${opciones.tipo}, ${opciones.nombre},
    ${opciones.padreId ?? null}
  )
  RETURNING id
`;

const insertarReporteSimilar = async (
  tx: TransactionSql,
  ubicacion: { coloniaId: string; calleId: string; usuarioId: string },
): Promise<string> => {
  const anio = anioEnMerida();
  const [contador] = await tx<{ consecutivo: number }[]>`
    INSERT INTO folios_de_reportes (ayuntamiento_id, anio, ultimo_consecutivo)
    VALUES (${MUNICIPIOS.motul.id}, ${anio},
      (SELECT COALESCE(MAX(consecutivo), 0) + 1 FROM reportes WHERE anio = ${anio}))
    ON CONFLICT (ayuntamiento_id, anio) DO UPDATE SET ultimo_consecutivo =
      GREATEST(folios_de_reportes.ultimo_consecutivo,
        (SELECT COALESCE(MAX(consecutivo), 0) FROM reportes WHERE anio = ${anio})) + 1
    RETURNING ultimo_consecutivo AS consecutivo
  `;
  const consecutivo = exigirFila(contador, "contador").consecutivo;
  const folio = `REP-${anio}-${String(consecutivo).padStart(6, "0")}`;
  const [reporte] = await tx<{ folio: string }[]>`
    INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo,
      estado, lugar_id, calle_id, descripcion, registrado_por_usuario_id)
    VALUES (${MUNICIPIOS.motul.id}, ${folio}, ${anio}, ${consecutivo}, 'BACHE',
      'RECIBIDO', ${ubicacion.coloniaId}, ${ubicacion.calleId},
      'Reporte similar sembrado para la prueba del selector', ${ubicacion.usuarioId})
    RETURNING folio
  `;
  return exigirFila(reporte, "reporte similar").folio;
};

/** Siembra una dirección identificable y un reporte abierto para las sugerencias del alta. */
export async function prepararEscenarioDeDireccionDeReporte(): Promise<EscenarioDeDireccionDeReporte> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de direcciones.");

  const marca = randomBytes(4).toString("hex");
  const nombreAsentamiento = `Asentamiento T6b ${marca}`;
  const nombreColonia = `Colonia T6b ${marca}`;
  const nombreCalle = `Calle T6b ${marca}`;
  const app = postgres(url, { max: 1 });

  try {
    const semilla = await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [usuario] = await tx<IdRow[]>`
        SELECT id FROM usuarios WHERE email = ${CORREO} LIMIT 1
      `;
      const usuarioId = exigirFila(usuario, "usuario").id;
      const [asentamiento] = await insertarLugar(tx, {
        tipo: "comisaria",
        nombre: nombreAsentamiento,
      });
      const asentamientoId = exigirFila(asentamiento, "asentamiento").id;
      const [colonia] = await insertarLugar(tx, {
        tipo: "colonia",
        nombre: nombreColonia,
        padreId: asentamientoId,
      });
      const coloniaId = exigirFila(colonia, "colonia").id;
      const [calle] = await tx<IdRow[]>`
        INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
        VALUES (${MUNICIPIOS.motul.id}, ${nombreCalle}, ${asentamientoId})
        RETURNING id
      `;
      const calleId = exigirFila(calle, "calle").id;
      const [domicilio] = await tx<IdRow[]>`
        INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
        VALUES (${MUNICIPIOS.motul.id}, ${coloniaId}, ${calleId}, '42-B')
        RETURNING id
      `;
      const domicilioId = exigirFila(domicilio, "domicilio").id;

      const folioSimilar = await insertarReporteSimilar(tx, {
        coloniaId,
        calleId,
        usuarioId,
      });
      return { asentamientoId, coloniaId, calleId, domicilioId, folioSimilar };
    });

    return {
      asentamientoId: semilla.asentamientoId,
      coloniaId: semilla.coloniaId,
      calleId: semilla.calleId,
      domicilioId: semilla.domicilioId,
      consulta: nombreCalle,
      etiqueta: `${nombreCalle} #42-B, ${nombreColonia}, ${nombreAsentamiento}`,
      folioSimilar: semilla.folioSimilar,
    };
  } finally {
    await app.end();
  }
}

/** Lee el vínculo y su número reales luego del POST nativo de alta. */
export async function leerUbicacionDeReporte(
  reporteId: string,
): Promise<ReporteUbicacion | null> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de direcciones.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [fila] = await tx<ReporteUbicacion[]>`
        SELECT r.domicilio_id AS "domicilioId", r.lugar_id AS "lugarId",
               r.calle_id AS "calleId", d.numero
          FROM reportes r
          LEFT JOIN domicilios d ON d.id = r.domicilio_id
         WHERE r.id = ${reporteId}
      `;
      return fila ?? null;
    });
  } finally {
    await app.end();
  }
}
