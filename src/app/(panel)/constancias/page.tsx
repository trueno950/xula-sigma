import { Gear } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  buscarConstancias,
  descripcionDeFiltrosDeConstancias,
  ListadoDeConstancias,
  listarConstancias,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  EnlaceDeAccion,
  estadoDeLista,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Constancias" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Ruta fina: resuelve el contexto, busca o lista, y compone -mismo molde
 * que `PaginaDeReportes`. Sin guarda de rol propia para el listado -leer no
 * es escribir, `listarConstancias.ts`-; ni enlace generico "Emitir
 * constancia": por que la emision no vive aca, ver el comentario de
 * cabecera de `constancias/emitir/page.tsx`. Lee `?error=` porque
 * `emitirConstanciaAction` redirige aca con un mensaje redactado cuando el
 * formulario llega invalido -sin este `searchParams`, ese mensaje se
 * perdia en silencio (hallazgo de GGA en la revision de la rebanada
 * original, mismo patron ya usado en `configuracion/page.tsx`).
 *
 * `q` decide entre `buscarConstancias` y `listarConstancias` -mismo patron
 * que `PaginaDeReportes`-, y el filtro de `estado` viaja en los dos casos:
 * `design.md`, "Buscador", "convive con los filtros, nunca los reemplaza".
 *
 * La accion de cabecera sigue siendo la configuracion del bloque de firma:
 * `/constancias/configuracion` no esta enlazada desde ninguna otra
 * pantalla del panel.
 */
export default async function PaginaDeConstancias({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { filtros, q, limite, orden, error } = leerParametros(
    await searchParams,
  );

  const opciones = {
    ...(limite ? { limite } : {}),
    ...(orden ? { orden } : {}),
  };
  const { constancias, hayMas } = q
    ? await buscarConstancias(q, contexto, { filtros, ...opciones })
    : await listarConstancias(filtros, contexto, opciones);
  const estado = estadoDeLista({
    total: constancias.length,
    filtro: descripcionDeFiltrosDeConstancias(filtros, q),
  });

  const configuracion = puedeAdministrarDocumentos(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/constancias/configuracion">
      <Gear size={18} aria-hidden="true" />
      Bloque de firma
    </EnlaceDeAccion>
  ) : undefined;
  const puedeAdministrar = puedeAdministrarDocumentos(contexto.usuario.rol);

  return (
    <PaginaDePanel titulo="Constancias" accion={configuracion}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeAdministrar ? (
        <AvisoDePermiso
          capacidad="gestionar el bloque de firma de las constancias"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      <ListadoDeConstancias
        constancias={constancias}
        hayMas={hayMas}
        estadoDeLista={estado}
        filtros={filtros}
        q={q}
        orden={orden}
        limite={limite}
      />
    </PaginaDePanel>
  );
}
