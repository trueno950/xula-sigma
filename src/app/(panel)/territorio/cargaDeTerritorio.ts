import { notFound } from "next/navigation";
import {
  type DomicilioId,
  domicilioPorId,
  existeCabecera,
  listarCalles,
  listarCallesDelMunicipio,
  listarLugares,
  listarRaices,
  type NodoSeleccionado,
  subarbol,
} from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
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
 * Las lecturas que pueden producir 404, y que por eso corren antes del
 * Suspense de `page.tsx`: un `notFound()` dentro de un limite ya en curso
 * no puede cambiar el estado, que sale 200. Todas pasan por sus puertos
 * tenant-scoped; la raiz ya llego resuelta desde la pagina.
 */
export const resolverSeleccionDeTerritorio = async (
  contexto: ContextoActual,
  { nodoId, calleId, domicilioId }: ParametrosDeTerritorio,
  raiz: NodoSeleccionado | null,
) => {
  const nodos = raiz ? await subarbol(raiz.id, contexto) : [];
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
 * Las lecturas restantes de la pantalla, ya con la seleccion validada.
 * Corren dentro del Suspense de `page.tsx` y el esqueleto cubre su espera.
 */
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
  const lugares = await listarLugares(contexto);
  const puedeCrearLugar = puedeEscribir(contexto.usuario.rol);
  const paneles = raiz
    ? { hayCabecera: false, registroAbierto: false, callesDelMunicipio: [] }
    : await cargarPanelesDeEntrada(
        contexto,
        parametros.accion,
        puedeCrearLugar,
      );

  return { ...seleccion, raices, lugares, puedeCrearLugar, ...paneles };
};

/**
 * Los paneles de alta, cada uno con la lectura que necesita y ninguna mas:
 * `hayCabecera` no cambia nada en el resto de la pantalla, y la lista de
 * calles del municipio -la entrada no conoce el asentamiento de antemano, y
 * el caso de uso deriva cual es el de la elegida- solo alimenta el
 * formulario de domicilio.
 */
const cargarPanelesDeEntrada = async (
  contexto: ContextoActual,
  accion: ParametrosDeTerritorio["accion"],
  puedeCrearLugar: boolean,
) => {
  const registroAbierto = accion === "domicilio" && puedeCrearLugar;
  const callesDelMunicipio = registroAbierto
    ? await listarCallesDelMunicipio(contexto)
    : [];

  return {
    hayCabecera:
      accion === "lugar" && puedeCrearLugar
        ? await existeCabecera(contexto)
        : false,
    registroAbierto,
    callesDelMunicipio,
  };
};
