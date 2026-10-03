import { notFound } from "next/navigation";
import {
  contarContenidoDeLugares,
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
import type { LugarConPadre } from "@/modules/territorio/ui/vistaDeDomicilios";
import { zonaDelFormulario } from "@/modules/territorio/ui/vistaDeDomicilios";
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

type EstadoDeEntrada = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  lugares: readonly LugarConPadre[];
  puedeCrearLugar: boolean;
  conRaiz: boolean;
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
  // Las cuentas alimentan el arbol de la entrada y las filas de la pestana
  // Lugares: una consulta agrupada para todo el municipio.
  const [lugares, cuentas] = await Promise.all([
    listarLugares(contexto),
    contarContenidoDeLugares(contexto),
  ]);
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
    puedeCrearLugar,
    ...entrada,
  };
};

const cargarEntrada = async ({
  contexto,
  parametros,
  lugares,
  puedeCrearLugar,
  conRaiz,
}: EstadoDeEntrada) => {
  const paneles = conRaiz
    ? { hayCabecera: false }
    : await cargarPanelesDeEntrada(
        contexto,
        parametros.accion,
        puedeCrearLugar,
      );
  const registro = await cargarRegistroDeEntrada(contexto, parametros, {
    puedeCrearLugar,
    conRaiz,
    lugares,
  });

  return {
    domicilioAbierto:
      conRaiz && parametros.accion === "domicilio" && puedeCrearLugar,
    ...paneles,
    ...registro,
  };
};

/**
 * El alta de domicilio servida desde la entrada, cuando la piden sin
 * `?raiz=`: el registro abierto para el rol con permiso, las calles del
 * municipio para el select y su zona.
 */
const cargarRegistroDeEntrada = async (
  contexto: ContextoActual,
  parametros: ParametrosDeTerritorio,
  {
    puedeCrearLugar,
    conRaiz,
    lugares,
  }: {
    puedeCrearLugar: boolean;
    conRaiz: boolean;
    lugares: readonly LugarConPadre[];
  },
) => {
  const registroAbierto =
    !conRaiz && parametros.accion === "domicilio" && puedeCrearLugar;
  const callesDelMunicipio = registroAbierto
    ? await listarCallesDelMunicipio(contexto)
    : [];
  const zonaDeLaEntrada = registroAbierto
    ? zonaDelFormulario(lugares, undefined, undefined)
    : undefined;

  return { registroAbierto, callesDelMunicipio, zonaDeLaEntrada };
};

/**
 * Los paneles de alta de la entrada: hoy solo el asentamiento dispara
 * lectura.
 */
const cargarPanelesDeEntrada = async (
  contexto: ContextoActual,
  accion: ParametrosDeTerritorio["accion"],
  puedeCrearLugar: boolean,
) => {
  return {
    hayCabecera:
      accion === "lugar" && puedeCrearLugar
        ? await existeCabecera(contexto)
        : false,
  };
};
