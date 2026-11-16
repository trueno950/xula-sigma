import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
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
  leerParametros,
} from "./parametros";

export const metadata: Metadata = { title: "Intervenciones" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * La bandeja real de S1: reemplaza el texto de "todavia no esta disponible"
 * por el listado con sus tres filtros y el alta. Ruta fina: resuelve el
 * contexto, lista y compone.
 *
 * El alta se ofrece solo con `puedeAdministrarIntervenciones` -la misma regla
 * que exige `altaDeIntervencionAction`-, y el aviso de permiso se muestra a
 * quien no puede escribir; el rol de consulta ve la bandeja y nada mas.
 */
export default async function PaginaDeIntervenciones({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { filtros, error } = leerParametros(await searchParams);
  const [intervenciones, lugaresGuardados] = await Promise.all([
    listarIntervenciones(filtros, contexto),
    listarLugares(contexto),
  ]);

  const lugares = opcionesDeLugares(lugaresGuardados);
  const estado = estadoDeLista({
    total: intervenciones.length,
    filtro: descripcionDeFiltrosDeIntervenciones(filtros),
  });
  const puedeAdministrar = puedeAdministrarIntervenciones(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo="Intervenciones"
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
        estadoDeLista={estado}
        filtros={filtros}
      />

      <p className="text-[15px] text-caliza-apagada">
        Las obras se registran aquí o se programan desde el detalle de un
        reporte ciudadano. Al finalizar una obra ligada a un reporte, el reporte
        se cierra como resuelto.
      </p>
    </PaginaDePanel>
  );
}
