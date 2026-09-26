import { randomBytes } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import { CORREO, MUNICIPIOS } from "./municipios";

export type ConstanciasSembradas = {
  vigenteId: string;
  canceladaId: string;
  canceladaAjenaId: string;
};

type Municipio = keyof typeof MUNICIPIOS;

type Spec = { consecutivo: number; cancelada: boolean };

/** Siembra una persona y sus constancias con el tenant de `municipio` fijado. */
const sembrarMunicipio = async (
  tx: TransactionSql,
  municipio: Municipio,
  specs: Spec[],
): Promise<string[]> => {
  const { id } = MUNICIPIOS[municipio];
  const marca = randomBytes(3).toString("hex");
  await tx`SELECT set_config('app.tenant', ${id}, true)`;
  const [usuario] = await tx<{ id: string }[]>`
    SELECT id FROM usuarios WHERE email = ${CORREO} LIMIT 1
  `;
  const [persona] = await tx<{ id: string }[]>`
    INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, nombre_normalizado)
    VALUES (${id}, ${`Titular ${marca}`}, 'Prueba', ${`titular ${marca} prueba`})
    RETURNING id
  `;
  if (!usuario || !persona) throw new Error("Falta usuario o persona.");

  const datos = {
    titular: { nombreCompleto: `Titular ${marca} Prueba` },
    direccion: {
      texto: "Calle 20 #10",
      residenciaId: "residencia-1",
      desdeEn: "2024-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  };
  const ids: string[] = [];

  for (const { consecutivo, cancelada } of specs) {
    const [fila] = await tx<{ id: string }[]>`
      INSERT INTO constancias (ayuntamiento_id, tipo, folio, anio, consecutivo, codigo_verificacion, persona_id, datos, plantilla_version, emitida_por_usuario_id, cancelada_en, cancelada_por_usuario_id, motivo_cancelacion)
      VALUES (${id}, 'VECINDAD', ${`VEC-2026-${consecutivo}`}, 2026, ${consecutivo}, ${randomBytes(8).toString("hex")}, ${persona.id}, ${tx.json(datos)}, 'vecindad-v1', ${usuario.id},
        ${cancelada ? new Date() : null}, ${cancelada ? usuario.id : null}, ${cancelada ? "ERROR_DE_CAPTURA" : null})
      RETURNING id
    `;
    if (!fila) throw new Error("Falta la constancia sembrada.");
    ids.push(fila.id);
  }

  return ids;
};

/**
 * Una constancia vigente y una cancelada en Motul, y una cancelada en Ticul
 * para comprobar que su PDF sigue dando 404 desde Motul. Nada toca el
 * almacenamiento de escudos: los municipios del E2E no tienen marca.
 */
export async function sembrarConstancias(): Promise<ConstanciasSembradas> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [reserva] = await tx<{ ultimo_consecutivo: number }[]>`
        INSERT INTO folios_de_documentos (ayuntamiento_id, tipo, anio, ultimo_consecutivo)
        VALUES (${MUNICIPIOS.motul.id}, 'VECINDAD', 2026, 2)
        ON CONFLICT (ayuntamiento_id, tipo, anio)
        DO UPDATE SET ultimo_consecutivo = folios_de_documentos.ultimo_consecutivo + 2
        RETURNING ultimo_consecutivo
      `;
      if (!reserva) throw new Error("Falta la reserva de consecutivos.");
      const base = reserva.ultimo_consecutivo - 1;

      const [vigenteId, canceladaId] = await sembrarMunicipio(tx, "motul", [
        { consecutivo: base, cancelada: false },
        { consecutivo: base + 1, cancelada: true },
      ]);
      const [canceladaAjenaId] = await sembrarMunicipio(tx, "ticul", [
        { consecutivo: base, cancelada: true },
      ]);

      if (!vigenteId || !canceladaId || !canceladaAjenaId) {
        throw new Error("Falta una constancia sembrada.");
      }

      return { vigenteId, canceladaId, canceladaAjenaId };
    });
  } finally {
    await app.end();
  }
}
