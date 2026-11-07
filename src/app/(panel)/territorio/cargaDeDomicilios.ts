import type { NodoSeleccionado } from "@/modules/territorio";
import { registroDeDomicilios } from "@/modules/territorio";
import type { DomicilioGuardado } from "@/modules/territorio/application/puertosDeDomicilios";
import {
  LIMITE_MAXIMO,
  TAMANO_DE_PAGINA,
} from "@/modules/territorio/application/registroDeDomicilios";
import type { PaginaDeDomicilios } from "@/modules/territorio/ui/contenido";
import { vistaVisibleDeLugar } from "@/modules/territorio/ui/vistaDePanel";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { ParametrosDeTerritorio } from "./parametros";

type Entrada = {
  contexto: ContextoActual;
  parametros: Pick<ParametrosDeTerritorio, "vista" | "busqueda" | "limite">;
  raiz: NodoSeleccionado | null;
  seleccion: {
    nodo: NodoSeleccionado | null;
    domicilio: Pick<DomicilioGuardado, "calleId" | "numero"> | null;
  };
};

/**
 * La pagina de la pestana Domicilios: solo cuando es la que se muestra, y
 * del subarbol del nodo, que es lo que cuenta su pestana.
 */
const paginaDeLaPestana = async ({
  contexto,
  parametros,
  seleccion: { nodo },
}: Entrada): Promise<PaginaDeDomicilios | undefined> => {
  if (
    !nodo ||
    vistaVisibleDeLugar(parametros.vista, nodo.tipo) !== "domicilios"
  ) {
    return undefined;
  }

  const { domicilios, hayMas } = await registroDeDomicilios(
    {
      raizId: nodo.id,
      ...(parametros.busqueda ? { busqueda: parametros.busqueda } : {}),
    },
    contexto,
    parametros.limite ?? TAMANO_DE_PAGINA,
  );

  return { filas: domicilios, hayMas };
};

/**
 * Los candidatos a hermano del domicilio abierto, en el subarbol del
 * asentamiento (`hermanosDeDireccion` en `ui/contenido.ts` dice por que
 * alcanza). Con el tope del registro: una misma direccion repetida mas
 * veces que eso no es un caso que la pantalla tenga que listar entero.
 */
const mismaDireccionDe = async ({ contexto, raiz, seleccion }: Entrada) => {
  const { domicilio } = seleccion;
  if (!raiz || !domicilio || domicilio.numero === null) return [];

  const { domicilios } = await registroDeDomicilios(
    { raizId: raiz.id, calleId: domicilio.calleId, numero: domicilio.numero },
    contexto,
    LIMITE_MAXIMO,
  );

  return domicilios;
};

/**
 * Los domicilios de la vista de un lugar. Antes llegaban todos los del
 * asentamiento con el subarbol en cada pestana; ahora solo la pagina que se
 * ve y, con un domicilio abierto, los de su misma direccion.
 */
export const cargarDomiciliosDeLaVista = async (entrada: Entrada) => {
  const [domicilios, mismaDireccion] = await Promise.all([
    paginaDeLaPestana(entrada),
    mismaDireccionDe(entrada),
  ]);

  return { domicilios, mismaDireccion };
};
