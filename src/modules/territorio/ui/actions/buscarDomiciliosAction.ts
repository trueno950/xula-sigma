"use server";

import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  type ActionResult,
  mapearError,
  NoAutorizadoError,
  ValidacionError,
} from "@/shared/lib/errores";
import type { DomicilioDelRegistro } from "../../application/puertosDeDomicilios";
import { registroDeDomicilios } from "../../composicion";

const MINIMO_DE_CARACTERES = 2;
const MAXIMO_DE_CARACTERES = 120;
const LIMITE_DE_OPCIONES = 15;

const esquemaDeEntrada = z.object({
  consulta: z
    .string()
    .trim()
    .min(MINIMO_DE_CARACTERES)
    .max(MAXIMO_DE_CARACTERES),
});

export type DomicilioParaSelector = { id: string; etiqueta: string };

export type ResultadoDeBusquedaDeDomicilios = {
  opciones: readonly DomicilioParaSelector[];
  hayMas: boolean;
};

const etiquetaDe = (domicilio: DomicilioDelRegistro): string => {
  const direccion = domicilio.numero
    ? `${domicilio.calle} #${domicilio.numero}`
    : `${domicilio.calle} sin número`;
  const raiz = domicilio.raiz ?? domicilio.lugar;
  const lugar =
    domicilio.lugar === raiz ? domicilio.lugar : `${domicilio.lugar}, ${raiz}`;

  return `${direccion}, ${lugar}`;
};

/**
 * Lectura tenant-scoped que alimenta el buscador de `FormularioDeMudanza`.
 * Solo viajan el id y la dirección escrita: `registrarMudanza` vuelve a
 * validar el `domicilioId` bajo RLS al enviar el formulario.
 */
export async function buscarDomiciliosAction(
  criterio: unknown,
): Promise<ActionResult<ResultadoDeBusquedaDeDomicilios>> {
  const analisis = esquemaDeEntrada.safeParse(criterio);

  if (!analisis.success) {
    return mapearError(
      new ValidacionError({
        consulta: "Escriba al menos dos caracteres para buscar direcciones.",
      }),
    );
  }

  try {
    const contexto = await contextoActual();
    if (!contexto) throw new NoAutorizadoError();

    const resultado = await registroDeDomicilios(
      { busqueda: analisis.data.consulta },
      contexto,
      LIMITE_DE_OPCIONES,
    );

    return {
      ok: true,
      data: {
        opciones: resultado.domicilios.map((domicilio) => ({
          id: domicilio.id,
          etiqueta: etiquetaDe(domicilio),
        })),
        hayMas: resultado.hayMas,
      },
    };
  } catch (error) {
    return mapearError(error);
  }
}
