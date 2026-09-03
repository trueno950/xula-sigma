/**
 * Que hacer con lo que hay escrito en los dos campos del alta: buscar
 * duplicados, o limpiar la lista porque no quedo nada que buscar.
 *
 * Vive aparte del componente para poder probar lo unico que decide, que es
 * el orden: **el numero de consulta avanza tambien cuando se limpia**. Sin
 * eso, una consulta ya en vuelo conservaba el numero vigente, pasaba la
 * comparacion al volver y repoblaba las sugerencias de campos que la
 * operadora acababa de vaciar.
 */
export type PlanDeConsulta =
  | { tipo: "limpiar"; id: number }
  | { tipo: "buscar"; id: number; cadena: string };

export const planDeConsulta = (
  nombres: string,
  apellido: string,
  siguienteId: () => number,
): PlanDeConsulta => {
  const id = siguienteId();
  const cadena = `${nombres} ${apellido}`.trim();

  return cadena ? { tipo: "buscar", id, cadena } : { tipo: "limpiar", id };
};
