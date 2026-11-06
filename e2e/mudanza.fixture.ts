import { randomBytes } from "node:crypto";
import postgres, { type TransactionSql } from "postgres";
import { MUNICIPIOS } from "./municipios";

type IdRow = { id: string };

export type EscenarioDeMudanza = {
  domicilioId: string;
  consulta: string;
  etiqueta: string;
  personaConJavaScriptId: string;
  personaSinJavaScriptId: string;
};

const exigirId = (fila: IdRow | undefined, concepto: string): string => {
  if (!fila) throw new Error(`Falta fila de ${concepto} en el escenario T7.`);
  return fila.id;
};

const insertarPersona = async (
  tx: TransactionSql,
  nombre: string,
): Promise<string> => {
  const [persona] = await tx<IdRow[]>`
    INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, nombre_normalizado)
    VALUES (${MUNICIPIOS.motul.id}, ${nombre}, 'Mudanza', ${`${nombre.toLowerCase()} mudanza`})
    RETURNING id
  `;
  return exigirId(persona, "persona");
};

/** Siembra una dirección identificable y dos personas sin residencia en Motul. */
export async function prepararEscenarioDeMudanza(): Promise<EscenarioDeMudanza> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de mudanza.");

  const marca = randomBytes(4).toString("hex");
  const nombreAsentamiento = `Asentamiento T7 ${marca}`;
  const nombreColonia = `Colonia T7 ${marca}`;
  const nombreCalle = `Calle T7 ${marca}`;
  const app = postgres(url, { max: 1 });

  try {
    const semilla = await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [asentamiento] = await tx<IdRow[]>`
        INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
        VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${nombreAsentamiento})
        RETURNING id
      `;
      const asentamientoId = exigirId(asentamiento, "asentamiento");
      const [colonia] = await tx<IdRow[]>`
        INSERT INTO lugares (ayuntamiento_id, tipo, nombre, padre_id)
        VALUES (${MUNICIPIOS.motul.id}, 'colonia', ${nombreColonia}, ${asentamientoId})
        RETURNING id
      `;
      const [calle] = await tx<IdRow[]>`
        INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
        VALUES (${MUNICIPIOS.motul.id}, ${nombreCalle}, ${asentamientoId})
        RETURNING id
      `;
      const [domicilio] = await tx<IdRow[]>`
        INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
        VALUES (${MUNICIPIOS.motul.id}, ${exigirId(colonia, "colonia")},
          ${exigirId(calle, "calle")}, '17-A')
        RETURNING id
      `;

      return {
        domicilioId: exigirId(domicilio, "domicilio"),
        personaConJavaScriptId: await insertarPersona(tx, `Conjs${marca}`),
        personaSinJavaScriptId: await insertarPersona(tx, `Sinjs${marca}`),
      };
    });

    return {
      ...semilla,
      consulta: nombreCalle,
      etiqueta: `${nombreCalle} #17-A, ${nombreColonia}, ${nombreAsentamiento}`,
    };
  } finally {
    await app.end();
  }
}

/** El domicilio de la residencia abierta de la persona, leído de la base. */
export async function leerDomicilioVigente(
  personaId: string,
): Promise<string | null> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E de mudanza.");

  const app = postgres(url, { max: 1 });
  try {
    return await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [fila] = await tx<{ domicilioId: string }[]>`
        SELECT domicilio_id AS "domicilioId" FROM residencias
         WHERE persona_id = ${personaId} AND hasta_en IS NULL
      `;
      return fila?.domicilioId ?? null;
    });
  } finally {
    await app.end();
  }
}
