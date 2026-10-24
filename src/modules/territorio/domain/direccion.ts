import type { CalleId } from "./identificadores";

const iguales = (a: CalleId | null, b: CalleId | null): boolean =>
  a !== null && b !== null && a === b;

/**
 * Espejo en TypeScript del CHECK `domicilios_calles_distintas` (design.md
 * seccion 4): rechaza solo si dos de las tres calles presentes coinciden.
 * Una transversal nula no choca con nada -son nullable a proposito para
 * una comisaria rural, proposal.md decision 5- porque `iguales` exige que
 * las dos puntas esten presentes, mismo criterio "NULL no rechaza" que el
 * CHECK de Postgres. `altaDeDomicilio` la usa para rechazar antes de
 * escribir, en vez de dejar que el CHECK lo haga en Postgres.
 */
export const transversalesValidas = (
  calleId: CalleId,
  entreCalleAId: CalleId | null,
  entreCalleBId: CalleId | null,
): boolean =>
  !iguales(calleId, entreCalleAId) &&
  !iguales(calleId, entreCalleBId) &&
  !iguales(entreCalleAId, entreCalleBId);

/**
 * Entrada de `componerDireccion`, ya resuelta a nombres -sin ids, sin
 * `padreId` que subir a mano-. `ancestros` viene del mas profundo al mas
 * superficial (colonia -> asentamiento, el orden de rango de
 * `tipoDeLugar.ts` invertido), el mismo orden en el que
 * `lectorDeDireccionesSql` recorre el `WITH RECURSIVE` (design.md seccion
 * 7).
 */
export type PartesDeDireccion = {
  calle: string;
  numero: string | null;
  entreCalleA: string | null;
  entreCalleB: string | null;
  referencia: string | null;
  ancestros: readonly string[];
};

/**
 * Pura, en `domain`. **"S/N" se escribe aca**, no en la columna: `numero`
 * es `NULL` a proposito (`esquema.ts:110`), y el unico lugar donde esa
 * ausencia se vuelve texto es el momento de imprimirla (design.md
 * seccion 7).
 */
export const componerDireccion = (partes: PartesDeDireccion): string => {
  const numero = partes.numero ?? "S/N";
  // Una comisaria rural puede conocer una sola transversal
  // (`transversalesValidas` la acepta con la otra en null); omitir el
  // segmento entero perdia esa calle en el texto impreso.
  const entreCalles =
    partes.entreCalleA && partes.entreCalleB
      ? `entre ${partes.entreCalleA} y ${partes.entreCalleB}`
      : (partes.entreCalleA ?? partes.entreCalleB)
        ? `entre ${partes.entreCalleA ?? partes.entreCalleB}`
        : null;

  const segmentos = [
    `${partes.calle} ${numero}`,
    entreCalles,
    partes.referencia,
    ...partes.ancestros,
  ].filter((segmento): segmento is string => segmento !== null);

  return segmentos.join(", ");
};

/**
 * Entrada de `componerUbicacion`: `lugarId` obligatorio, `calleId` opcional
 * -sin domicilio ni residencia-, el corte que pide `jerarquia-territorial`
 * para un reporte ciudadano. `ancestros` en el mismo orden que
 * `PartesDeDireccion`: del mas profundo al mas superficial.
 */
export type PartesDeUbicacion = {
  calle: string | null;
  ancestros: readonly string[];
};

/**
 * Pura, en `domain`, y funcion nueva -no reuso de `componerDireccion`
 * (design.md seccion 9)-: `PartesDeDireccion` exige `calle: string` no nula
 * y produce "S/N" cuando falta el numero, y esa suplencia no aplica a la
 * ubicacion de un bache o una fuga sin domicilio.
 */
export const componerUbicacion = (partes: PartesDeUbicacion): string =>
  [partes.calle, ...partes.ancestros]
    .filter((segmento): segmento is string => segmento !== null)
    .join(", ");
