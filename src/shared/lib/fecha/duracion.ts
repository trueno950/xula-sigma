import { fechaCivilComoDate } from "../fecha";

const MILISEGUNDOS_POR_DIA = 86_400_000;

/**
 * El dia en que cae un mes, sin tabla de meses: el dia 0 del mes siguiente
 * es el ultimo del mes pedido. `getUTC*` y no los `get*` de siempre: la
 * medianoche UTC de una fecha civil ES el dia civil, y en Merida (UTC-6)
 * los otros la correrian un dia atras.
 */
const diasDelMes = (anio: number, mes: number): number =>
  new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

/**
 * Suma meses a una fecha civil recortando el dia al ultimo del mes destino:
 * el 31 de enero mas un mes es el 28 (o 29) de febrero, no el 3 de marzo.
 */
const sumarMeses = (fecha: Date, meses: number): Date => {
  const total = fecha.getUTCMonth() + meses;
  const anio = fecha.getUTCFullYear() + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const dia = Math.min(fecha.getUTCDate(), diasDelMes(anio, mes));

  return new Date(Date.UTC(anio, mes, dia));
};

/** Meses completos entre dos fechas civiles, sin contar el mes a medias. */
const mesesEntre = (inicio: Date, fin: Date): number => {
  const meses =
    (fin.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
    fin.getUTCMonth() -
    inicio.getUTCMonth();

  return sumarMeses(inicio, meses) > fin ? meses - 1 : meses;
};

const enumerar = (partes: readonly string[]): string => {
  const ultima = partes.at(-1) ?? "";

  return partes.length < 2
    ? ultima
    : `${partes.slice(0, -1).join(", ")} y ${ultima}`;
};

/**
 * Cuanto tiempo paso entre dos fechas civiles (`YYYY-MM-DD`, las dos del
 * calendario de `America/Merida`), en palabras: `hoy`, `5 días`, `1 mes y 17
 * días`, `2 años, 10 meses y 17 días`.
 *
 * Cuenta anios y meses completos y el resto en dias, recortando el dia al
 * ultimo del mes cuando el mes destino no lo tiene: el 31 de enero mas un
 * mes es el 28 de febrero. Devuelve `null` cuando alguna fecha no es civil o
 * el fin es anterior al inicio —una residencia que empieza manana es un dato
 * invalido, y decir `hoy` lo escondería—.
 *
 * Existe por S6 de `constancias-ux`: el aviso de la emision le dice a la
 * operadora cuanto lleva la persona en su domicilio, para que compruebe la
 * fecha de un vistazo. En dias sueltos no sirve: nadie divide entre 30.
 */
export const duracionCivil = (desde: string, hasta: string): string | null => {
  const inicio = fechaCivilComoDate(desde);
  const fin = fechaCivilComoDate(hasta);

  if (!inicio || !fin || fin < inicio) return null;

  const meses = mesesEntre(inicio, fin);
  const dias = Math.round(
    (fin.getTime() - sumarMeses(inicio, meses).getTime()) /
      MILISEGUNDOS_POR_DIA,
  );

  if (meses === 0 && dias === 0) return "hoy";

  const anios = Math.floor(meses / 12);
  const restoDeMeses = meses % 12;

  return enumerar([
    ...(anios > 0 ? [`${anios} ${anios === 1 ? "año" : "años"}`] : []),
    ...(restoDeMeses > 0
      ? [`${restoDeMeses} ${restoDeMeses === 1 ? "mes" : "meses"}`]
      : []),
    ...(dias > 0 ? [`${dias} ${dias === 1 ? "día" : "días"}`] : []),
  ]);
};
