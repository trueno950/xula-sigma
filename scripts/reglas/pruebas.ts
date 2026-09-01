import { revisar, revisarMetricas } from "./index";
import type { Archivo } from "./tipos";

/**
 * Ayudantes compartidos por los tests de las reglas.
 *
 * Viven en su propio archivo y no en cada suite para que el corte por tema
 * —que salio del limite de 200 lineas por archivo— no obligue a copiar los
 * mismos cuatro renglones tres veces. Esa copia es el antipatron 23.
 */
export const archivo = (ruta: string, contenido: string): Archivo => ({
  ruta,
  contenido,
});

export const hallazgosDe = (id: string, archivos: Archivo[]) =>
  revisar(archivos).filter((hallazgo) => hallazgo.regla === id);

export const hallazgosDeMetrica = (id: string, archivos: Archivo[]) =>
  revisarMetricas(archivos).filter((hallazgo) => hallazgo.metrica === id);

/**
 * Las dos mitades de una migracion, para los tests de `rls-tabla-nueva`.
 *
 * Viven aca por la misma razon que `archivo`: el corte por tema reparte los
 * casos de una sola regla en dos archivos, y copiar el fixture en los dos
 * es lo que hace que uno de ellos quede viejo sin que nada avise.
 */
export const tablaSql = (
  nombre: string,
  conAyuntamientoId = true,
  prefijo = "",
) =>
  `CREATE TABLE ${prefijo}"${nombre}" (\n\t"id" uuid PRIMARY KEY NOT NULL${
    conAyuntamientoId ? ',\n\t"ayuntamiento_id" uuid NOT NULL' : ""
  }\n);\n`;

export const rlsSql = (nombre: string) =>
  `ALTER TABLE "${nombre}" ENABLE ROW LEVEL SECURITY;\n` +
  `ALTER TABLE "${nombre}" FORCE ROW LEVEL SECURITY;\n` +
  `CREATE POLICY "${nombre}_tenant" ON "${nombre}" AS PERMISSIVE FOR ALL TO "xula_app" USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid);\n` +
  `GRANT SELECT, INSERT, UPDATE ON "${nombre}" TO "xula_app";\n`;
