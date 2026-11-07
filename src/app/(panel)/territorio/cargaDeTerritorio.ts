import { notFound } from "next/navigation";
import {
  contarContenidoDeLugares,
  type DomicilioId,
  domicilioPorId,
  listarCalles,
  listarLugares,
  listarRaices,
  type NodoSeleccionado,
  residentesDeDomicilio,
  subarbol,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cargarBloqueos } from "./cargaDeBloqueos";
import { cargarDomiciliosDeLaVista } from "./cargaDeDomicilios";
import { cargarEntrada } from "./cargaDeEntrada";
import { nodoResuelto, type ParametrosDeTerritorio } from "./parametros";

/**
 * La direccion que la URL nombra, si es de este nodo: una de otro nodo, de
 * otro municipio o ya dada de baja cae en el 404 de la regla 8, mismo
 * criterio que `?calle=`.
 */
const domicilioDelNodo = async (
  contexto: ContextoActual,
  domicilioId: DomicilioId | undefined,
  nodo: NodoSeleccionado | null,
) => {
  if (!domicilioId) return null;

  const domicilio = await domicilioPorId(domicilioId, contexto);
  if (!domicilio || domicilio.lugarId !== nodo?.id) notFound();

  return domicilio;
};

/**
 * Las lecturas que pueden producir 404. Todas pasan por sus puertos
 * tenant-scoped; la raiz ya llego resuelta desde la pagina.
 */
export const resolverSeleccionDeTerritorio = async (
  contexto: ContextoActual,
  { nodoId, calleId, domicilioId }: ParametrosDeTerritorio,
  raiz: NodoSeleccionado | null,
) => {
  // Solo lugares: los domicilios los lee `cargaDeDomicilios.ts`, paginados
  // y solo cuando su pestana se muestra.
  const nodos = raiz
    ? await subarbol(raiz.id, contexto, { soloLugares: true })
    : [];
  const nodo = nodoResuelto({ raiz, nodos, nodoId });

  // Con raiz propia pero `?nodo=` que no cuelga de ella -ajeno, o dado de
  // baja-: antes se renderizaba el panel vacio.
  if (raiz && !nodo) notFound();

  const calles = raiz && nodo ? await listarCalles(raiz.id, contexto) : [];
  if (calleId && !calles.some((calle) => calle.id === calleId)) notFound();

  const domicilio = await domicilioDelNodo(contexto, domicilioId, nodo);

  return { nodos, nodo, calles, domicilio };
};

export type SeleccionDeTerritorio = Awaited<
  ReturnType<typeof resolverSeleccionDeTerritorio>
>;

type EntradaDeCarga = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  raiz: NodoSeleccionado | null;
  seleccion: SeleccionDeTerritorio;
};

/**
 * Las cuentas son decoracion de las filas: si su consulta falla la pantalla
 * sale sin ellas. Un `NoAutorizadoError` se relanza (ver `errores.ts`); el
 * arbol y las pestanas siguen en pie, y las lecturas primarias no pasan por
 * aqui y siguen propagando.
 */
const contarSinRomper = async (contexto: ContextoActual) => {
  try {
    return await contarContenidoDeLugares(contexto);
  } catch (error) {
    if (error instanceof NoAutorizadoError) throw error;
    console.error(
      "[territorio] no se pudieron contar los lugares",
      datosSegurosDeError(error),
    );

    return undefined;
  }
};

/**
 * Mismo criterio que las cuentas: si quien vive en el domicilio no se puede
 * leer, el panel sale igual con su aviso (`null`) en vez de tumbar la
 * pantalla. El registro lleva el id y nunca el error crudo, que puede traer
 * un nombre o una direccion en su texto.
 */
const residentesSinRomper = async (
  domicilioId: DomicilioId,
  contexto: ContextoActual,
) => {
  try {
    return await residentesDeDomicilio(domicilioId, contexto);
  } catch (error) {
    if (error instanceof NoAutorizadoError) throw error;
    console.error(
      "[territorio] no se pudieron leer los residentes del domicilio",
      { domicilioId, ...datosSegurosDeError(error) },
    );

    return null;
  }
};

/** Las lecturas restantes de la pantalla, ya con la seleccion validada. */
export const cargarTerritorio = async ({
  contexto,
  parametros,
  raiz,
  seleccion,
}: EntradaDeCarga) => {
  const raices = await listarRaices(contexto);

  // El municipio entero, con raiz abierta o sin ella: alimenta el arbol de
  // la entrada y el destino del reparenteo, que mueve un lugar a cualquier
  // rama. Recortarlo al subarbol de la raiz abierta dejaba ese selector con
  // los lugares que ya estaban debajo del que se mueve, o con ninguno.
  // Las cuentas alimentan el arbol de la entrada y las filas de la pestana
  // Lugares: una consulta agrupada para todo el municipio.
  const [lugares, cuentas, residentes, deLaVista, bloqueos] = await Promise.all(
    [
      listarLugares(contexto),
      contarSinRomper(contexto),
      seleccion.domicilio
        ? residentesSinRomper(seleccion.domicilio.id, contexto)
        : [],
      cargarDomiciliosDeLaVista({ contexto, parametros, raiz, seleccion }),
      cargarBloqueos({ contexto, parametros, nodo: seleccion.nodo }),
    ],
  );
  const puedeCrearLugar = puedeEscribir(contexto.usuario.rol);
  const entrada = await cargarEntrada({
    contexto,
    parametros,
    lugares,
    puedeCrearLugar,
    conRaiz: Boolean(raiz),
  });

  return {
    ...seleccion,
    raices,
    lugares,
    cuentas,
    residentes,
    ...deLaVista,
    ...bloqueos,
    puedeCrearLugar,
    ...entrada,
  };
};

export type CargaDeTerritorio = Awaited<ReturnType<typeof cargarTerritorio>>;
