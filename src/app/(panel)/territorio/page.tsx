import { Plus } from "@phosphor-icons/react/ssr";
import {
  comoLugarId,
  listarCalles,
  listarDomicilios,
  listarLugares,
  listarRaices,
  lugarPorId,
  subarbol,
  VistaDeRaices,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarTerritorio, puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros, nodoResuelto } from "./parametros";
import { VistaDeLugar } from "./VistaDeLugar";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * El registro territorial: navegar es entrar. Sin `?raiz=` se listan las
 * raices del municipio para entrar con un clic; con `?raiz=` el lugar
 * actual con sus acciones y lo que tiene adentro, y cada hijo fija
 * `?nodo=` al entrar. Cero `"use client"`: toda la navegacion viaja por
 * la URL.
 */
export default async function PaginaDeTerritorio({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  const { raizId, nodoId, accion, error, vista } = leerParametros(
    await searchParams,
  );

  const raices = await listarRaices(contexto);
  const raiz = raizId ? await lugarPorId(comoLugarId(raizId), contexto) : null;
  const nodos = raiz ? await subarbol(raiz.id, contexto) : [];
  const domicilios = await listarDomicilios(contexto);
  const nodo = nodoResuelto({ raiz, nodos, nodoId });
  const calles = nodo ? await listarCalles(nodo.id, contexto) : [];
  // El municipio entero, con raiz abierta o sin ella: alimenta el arbol de
  // la entrada y el destino del reparenteo, que mueve un lugar a cualquier
  // rama. Recortarlo al subarbol de la raiz abierta dejaba ese selector con
  // los lugares que ya estaban debajo del que se mueve, o con ninguno.
  const lugares = await listarLugares(contexto);
  const puedeActuar =
    puedeEscribir(contexto.usuario.rol) ||
    puedeAdministrarTerritorio(contexto.usuario.rol);

  const alta =
    !raiz && puedeEscribir(contexto.usuario.rol) && accion !== "lugar" ? (
      <EnlaceDeAccion href="/territorio?accion=lugar" variante="primaria">
        <Plus size={18} weight="bold" aria-hidden="true" />
        Agregar lugar
      </EnlaceDeAccion>
    ) : undefined;

  return (
    <PaginaDePanel titulo="Territorio" accion={alta}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!raiz ? (
        <VistaDeRaices
          raices={raices}
          lugares={lugares}
          puedeEscribir={puedeEscribir(contexto.usuario.rol)}
          altaAbierta={accion === "lugar"}
          accionDeAlta={
            <EnlaceDeAccion href="/territorio?accion=lugar" variante="primaria">
              <Plus size={18} weight="bold" aria-hidden="true" />
              Agregar lugar
            </EnlaceDeAccion>
          }
        />
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
          puedeActuar={puedeActuar}
        />
      ) : null}
    </PaginaDePanel>
  );
}
