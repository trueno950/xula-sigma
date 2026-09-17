import { notFound } from "next/navigation";
import {
  type DomicilioId,
  domicilioPorId,
  listarCalles,
  listarCallesDelMunicipio,
  listarDomicilios,
  listarLugares,
  listarRaices,
  lugarPorId,
  type NodoSeleccionado,
  subarbol,
  VistaDeRaices,
} from "@/modules/territorio";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";
import {
  opcionesDeCallesDelMunicipio,
  zonaDelFormulario,
} from "@/modules/territorio/ui/vistaDeDomicilios";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { Aviso, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";
import { accionesDeRaiz } from "./AccionesDeRaiz";
import { leerParametros, nodoResuelto } from "./parametros";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";
import { VistaDeLugar } from "./VistaDeLugar";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Parametros = ReturnType<typeof leerParametros>;

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
 * Todo lo que la pantalla lee antes de dibujar, con sus guardas en el orden
 * de siempre. Vive fuera del componente para que la complejidad de la
 * pantalla -dos formularios posibles y cuatro estados de URL- no se sume a
 * la de la carga: juntas pasaban el tope de la metrica.
 */
const cargarTerritorio = async (
  contexto: ContextoActual,
  { raizId, nodoId, calleId, domicilioId, accion }: Parametros,
) => {
  const raices = await listarRaices(contexto);
  const raiz = raizId ? await lugarPorId(raizId, contexto) : null;

  // Regla 8. Sin esto una raiz de otro municipio volvia `null` y la
  // pantalla caia al listado del municipio propio: 200, y ademas otra cosa
  // que la pedida.
  if (raizId && !raiz) notFound();

  const nodos = raiz ? await subarbol(raiz.id, contexto) : [];
  const domicilios = await listarDomicilios(contexto);
  const nodo = nodoResuelto({ raiz, nodos, nodoId });

  // Con raiz propia pero `?nodo=` que no cuelga de ella -ajeno, o dado de
  // baja-: antes se renderizaba el panel vacio.
  if (raiz && !nodo) notFound();

  const calles = raiz && nodo ? await listarCalles(raiz.id, contexto) : [];
  if (calleId && !calles.some((calle) => calle.id === calleId)) notFound();

  const domicilio = await domicilioDelNodo(contexto, domicilioId, nodo);

  // El municipio entero, con raiz abierta o sin ella: alimenta el arbol de
  // la entrada y el destino del reparenteo, que mueve un lugar a cualquier
  // rama. Recortarlo al subarbol de la raiz abierta dejaba ese selector con
  // los lugares que ya estaban debajo del que se mueve, o con ninguno.
  const lugares = await listarLugares(contexto);
  const puedeCrearLugar = puedeEscribir(contexto.usuario.rol);

  // La entrada no conoce el asentamiento de antemano: lista las calles del
  // municipio entero y el caso de uso deriva cual es el de la elegida.
  const registroAbierto = !raiz && accion === "domicilio" && puedeCrearLugar;
  const callesDelMunicipio = registroAbierto
    ? await listarCallesDelMunicipio(contexto)
    : [];

  return {
    raices,
    raiz,
    nodos,
    domicilios,
    nodo,
    calles,
    domicilio,
    lugares,
    puedeCrearLugar,
    registroAbierto,
    callesDelMunicipio,
  };
};

/**
 * El registro territorial: navegar es entrar. Sin `?raiz=` se listan las
 * raices del municipio para entrar con un clic; con `?raiz=` el lugar
 * actual con sus acciones y lo que tiene adentro, y cada hijo fija
 * `?nodo=` al entrar. Cero `"use client"`: toda la navegacion viaja por
 * la URL, y el formulario de domicilio tambien se sirve desde la entrada.
 */
export default async function PaginaDeTerritorio({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const parametros = leerParametros(await searchParams);
  const {
    raiz,
    nodos,
    domicilios,
    nodo,
    calles,
    domicilio,
    lugares,
    raices,
    puedeCrearLugar,
    registroAbierto,
    callesDelMunicipio,
  } = await cargarTerritorio(contexto, parametros);
  const permisos = permisosDeTerritorio(contexto.usuario.rol);
  const { accion, calleId, domicilioId, error, vista } = parametros;

  return (
    <PaginaDePanel
      titulo="Territorio"
      accion={raiz ? undefined : accionesDeRaiz({ puedeCrearLugar, accion })}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!raiz ? (
        <>
          {registroAbierto ? (
            <RegistroDeDomicilio
              calles={opcionesDeCallesDelMunicipio(callesDelMunicipio)}
              zona={zonaDelFormulario(lugares, undefined, undefined)}
            />
          ) : null}

          <VistaDeRaices
            raices={raices}
            lugares={lugares}
            puedeEscribir={puedeCrearLugar}
            altaAbierta={accion === "lugar"}
          />
        </>
      ) : nodo ? (
        <VistaDeLugar
          raiz={raiz}
          nodos={nodos}
          domicilios={domicilios}
          nodo={nodo}
          calles={calles}
          lugares={lugares}
          vista={vista}
          accion={accion}
          calleId={calleId}
          domicilioId={domicilioId}
          domicilio={domicilio ?? undefined}
          permisos={permisos}
        />
      ) : null}
    </PaginaDePanel>
  );
}
