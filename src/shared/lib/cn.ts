import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `clsx` resuelve condicionales y valores falsy; `twMerge` resuelve el
 * conflicto que `clsx` no ve, dos utilidades de Tailwind para la misma
 * propiedad (`px-2` y `px-4` juntas), quedandose con la ultima.
 */
export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}
