import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  contarIntervenciones,
  ListadoDeIntervenciones,
  listarIntervenciones,
} from "@/modules/intervenciones";
import { listarLugares } from "@/modules/territorio";
import { opcionesDeLugares } from "@/modules/territorio/ui/opciones";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  EnlaceDeAccion,
  estadoDeLista,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import {
  descripcionDeFiltrosDeIntervenciones,
  filtrosSinEstado,
  leerParametros,
} from "./parametros";

export const metadata: Metadata = { title: "Intervenciones" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * La bandeja real de S1: el tablero por estado, sus filtros y el alta. Ruta
 * fina: resuelve el contexto, lista, cuenta y compone.
 *
 * El alta se ofrece solo con `puedeAdministrarIntervenciones` -la misma regla
 * que exige `altaDeIntervencionAction`-, y el aviso de permiso se muestra a
 * quien no puede escribir; el rol de consulta ve la bandeja y nada mas.
 *
 * Los conteos de `contarIntervenciones` (S2) se piden con los filtros sin el
 * estado, en el mismo `Promise.all` que el listado: son dos lecturas del mismo
 * conjunto y no pueden divergir.
 */
export default async function PaginaDeIntervenciones({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { filtros, error } = leerParametros(await searchParams);
  const [intervenciones, lugaresGuardados, conteos] = await Promise.all([
    listarIntervenciones(filtros, contexto),
    listarLugares(contexto),
    contarIntervenciones(filtrosSinEstado(filtros), contexto),
  ]);

  const lugares = opcionesDeLugares(lugaresGuardados);
  const estado = estadoDeLista({
    total: conteos.total,
    filtro: descripcionDeFiltrosDeIntervenciones(filtros),
  });
  const puedeAdministrar = puedeAdministrarIntervenciones(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo="Intervenciones"
      descripcion="Las obras del municipio, agrupadas por el estado en que están."
      accion={
        puedeAdministrar ? (
          <EnlaceDeAccion href="/intervenciones/alta" variante="primaria">
            <Plus size={18} weight="bold" aria-hidden="true" />
            Registrar intervención
          </EnlaceDeAccion>
        ) : undefined
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeAdministrar ? (
        <AvisoDePermiso
          capacidad="registrar y administrar intervenciones"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      <ListadoDeIntervenciones
        intervenciones={intervenciones}
        lugares={lugares}
        conteos={conteos}
        estadoDeLista={estado}
        filtros={filtros}
      />
    </PaginaDePanel>
  );
}
