import { type SQL, sql } from "drizzle-orm";

/**
 * La version en SQL de `normalizarParaBusqueda` (`shared/lib/textoDeBusqueda.ts`):
 * sin mayusculas y sin acentos, con la enie como letra propia. Sin migracion:
 * `unaccent` existe (`drizzle/0004_padron.sql`) pero tambien quita la tilde
 * de la enie, y "peña" no es "pena".
 *
 * `normalize(..., NFC)` junta una vocal y su acento combinante en un solo
 * caracter antes de traducir. Las mayusculas acentuadas tambien van en la
 * tabla: `lower()` depende del collation de la base, y con `C` no las baja.
 */
const EQUIVALENCIAS: readonly (readonly [string, string])[] = [
  ["a", "áàâäãåÁÀÂÄÃÅ"],
  ["e", "éèêëÉÈÊË"],
  ["i", "íìîïÍÌÎÏ"],
  ["o", "óòôöõÓÒÔÖÕ"],
  ["u", "úùûüÚÙÛÜ"],
  ["y", "ýÿÝ"],
  ["c", "çÇ"],
  ["ñ", "Ñ"],
];

const CON_ACENTO = EQUIVALENCIAS.map(([, variantes]) => variantes).join("");
const SIN_ACENTO = EQUIVALENCIAS.map(([base, variantes]) =>
  base.repeat([...variantes].length),
).join("");

export const textoDeBusquedaSql = (expresion: SQL): SQL =>
  sql`translate(lower(normalize(${expresion}, NFC)), ${CON_ACENTO}, ${SIN_ACENTO})`;
