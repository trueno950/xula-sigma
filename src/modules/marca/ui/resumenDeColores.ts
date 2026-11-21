import { type Marca, PALETA } from "@/shared/marca";

/**
 * El estado de los colores en **una linea**, para el resumen de la fila
 * plegada: con la fila cerrada, la operadora tiene que poder revisar la marca
 * sin abrir nada (artboard `02-vista-previa-primero`).
 *
 * Nombra el color de la paleta cuando lo reconoce y, si no, el valor crudo:
 * inventar un nombre para un color libre seria decir algo que el sistema no
 * sabe.
 */

const nombreDelColor = (valor: string | undefined): string | undefined => {
  if (!valor) return undefined;

  return PALETA.find((color) => color.valor === valor)?.nombre ?? valor;
};

const POR_DEFECTO = "Colores por defecto de XULA.";

export const resumenDeColores = (marca: Marca): string => {
  const primario = nombreDelColor(marca.primario);
  const acento = nombreDelColor(marca.secundario);

  if (!primario && !acento) return POR_DEFECTO;

  return `Primario ${primario ?? "por defecto"} · acento ${
    acento ?? "por defecto"
  }`;
};
