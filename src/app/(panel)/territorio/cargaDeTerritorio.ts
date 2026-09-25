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
 * La navegacion que la URL pide, con las guardas de la regla 8 en el orden
 * de siempre: el subarbol de la raiz, las calles de la raiz abierta y la
 * direccion nombrada. La raiz viene resuelta por la pagina, antes del
 * Suspense: su guarda de 404 no puede correr dentro de un limite ya en
 * curso, porque el estado sale 200.
 */
const cargarNavegacion = async (
  contexto: ContextoActual,
  { nodoId, calleId, domicilioId }: ParametrosDeTerritorio,
  raiz: NodoSeleccionado | null,
) => {
  const raices = await listarRaices(contexto);

  const nodos = raiz ? await subarbol(raiz.id, contexto) : [];
  const nodo = nodoResuelto({ raiz, nodos, nodoId });

  // Con raiz propia pero `?nodo=` que no cuelga de ella -ajeno, o dado de
  // baja-: antes se renderizaba el panel vacio.
  if (raiz && !nodo) notFound();

  const calles = raiz && nodo ? await listarCalles(raiz.id, contexto) : [];
  if (calleId && !calles.some((calle) => calle.id === calleId)) notFound();

  const domicilio = await domicilioDelNodo(contexto, domicilioId, nodo);

  return { raices, raiz, nodos, nodo, calles, domicilio };
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

/**
 * Todo lo que la pantalla lee antes de dibujar. Vive fuera de la vista para
 * que la complejidad de la pantalla -dos formularios posibles y cuatro
 * estados de URL- no se sume a la de la carga. Corre dentro del Suspense de
 * `page.tsx`: la guarda de la raiz ya paso, y el esqueleto cubre la espera.
 */
export const cargarTerritorio = async (
  contexto: ContextoActual,
  parametros: ParametrosDeTerritorio,
  raiz: NodoSeleccionado | null,
) => {
  const navegacion = await cargarNavegacion(contexto, parametros, raiz);

  // El municipio entero, con raiz abierta o sin ella: alimenta el arbol de
  // la entrada y el destino del reparenteo, que mueve un lugar a cualquier
  // rama. Recortarlo al subarbol de la raiz abierta dejaba ese selector con
  // los lugares que ya estaban debajo del que se mueve, o con ninguno.
  const lugares = await listarLugares(contexto);
  const puedeCrearLugar = puedeEscribir(contexto.usuario.rol);
  const paneles = navegacion.raiz
    ? { hayCabecera: false, registroAbierto: false, callesDelMunicipio: [] }
    : await cargarPanelesDeEntrada(
        contexto,
        parametros.accion,
        puedeCrearLugar,
      );

  return { ...navegacion, lugares, puedeCrearLugar, ...paneles };
};
