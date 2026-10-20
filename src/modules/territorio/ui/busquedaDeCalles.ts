import type { OpcionDeLista } from "@/shared/ui";

/**
 * La busqueda del selector de calle: sin mayusculas ni acentos, porque la
 * operadora escribe `alamo` y el padron dice `Álamo`. `NFD` separa la tilde
 * de la letra y `\p{Diacritic}` la borra, asi que las dos formas quedan
 * iguales sin una tabla de equivalencias que se quedaria corta.
 */
const normalizar = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();

/**
 * Las calles que quedan al escribir en el buscador. `elegida` se conserva
 * aunque no coincida: si el operador ya eligio una calle y despues toca la
 * busqueda, el `<select>` no puede perder esa eleccion por un filtro.
 */
export const callesQueCoinciden = (
  opciones: readonly OpcionDeLista[],
  busqueda: string,
  elegida = "",
): readonly OpcionDeLista[] => {
  const filtro = normalizar(busqueda);
  if (!filtro) return opciones;

  return opciones.filter(
    (opcion) =>
      opcion.valor === elegida || normalizar(opcion.etiqueta).includes(filtro),
  );
};

/** El conteo del buscador: sin coincidencias dice como volver a la lista. */
export const mensajeDeCoincidencias = (cantidad: number): string => {
  if (cantidad === 0) {
    return "Ninguna calle coincide. Borre la búsqueda para ver la lista completa.";
  }
  if (cantidad === 1) return "1 calle coincide.";

  return `${cantidad} calles coinciden.`;
};
