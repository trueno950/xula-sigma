import type { ContextoActual } from "@/shared/auth/contexto";
import { ValidacionError } from "@/shared/lib/errores";
import type { BuscadorDeDirecciones } from "./puertosDeDirecciones";

export const MINIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES = 2;
export const MAXIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES = 120;
export const LIMITE_DE_BUSQUEDA_DE_DIRECCIONES = 15;

export type DireccionParaSelector = {
  id: string;
  etiqueta: string;
  lugarId: string;
};

export type ResultadoDeBusquedaParaSelector = {
  opciones: readonly DireccionParaSelector[];
  hayMas: boolean;
};

const etiquetaDe = (domicilio: {
  calle: string;
  numero: string | null;
  lugar: string;
  raiz: string;
}): string => {
  const direccion = domicilio.numero
    ? `${domicilio.calle} #${domicilio.numero}`
    : `${domicilio.calle} sin número`;
  const lugar =
    domicilio.lugar === domicilio.raiz
      ? domicilio.lugar
      : `${domicilio.lugar}, ${domicilio.raiz}`;

  return `${direccion}, ${lugar}`;
};

export function crearBuscarDireccionesParaReporte(
  buscador: BuscadorDeDirecciones,
) {
  return async function buscarDireccionesParaReporte(
    consulta: string,
    contexto: ContextoActual,
  ): Promise<ResultadoDeBusquedaParaSelector> {
    const normalizada = consulta.trim();

    if (normalizada.length < MINIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES) {
      return { opciones: [], hayMas: false };
    }
    if (normalizada.length > MAXIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES) {
      throw new ValidacionError({
        consulta: "La búsqueda es demasiado larga.",
      });
    }

    const resultado = await buscador.buscar(
      contexto,
      normalizada,
      LIMITE_DE_BUSQUEDA_DE_DIRECCIONES,
    );

    return {
      opciones: resultado.domicilios.map((domicilio) => ({
        id: domicilio.id,
        etiqueta: etiquetaDe(domicilio),
        lugarId: domicilio.lugarId,
      })),
      hayMas: resultado.hayMas,
    };
  };
}
