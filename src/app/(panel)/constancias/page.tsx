import { Gear, Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  buscarConstancias,
  ListadoDeConstancias,
  listarConstancias,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos, puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Constancias" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * La cabecera de `constancias-ux` (S3): «Emitir constancia» es la accion
 * primaria y «Bloque de firma» la secundaria, cada una con la guarda de su
 * propia ruta -`/constancias/emitir` exige `puedeEscribir`, y
 * `/constancias/configuracion` exige `puedeAdministrarDocumentos`-. Sin
 * ellas el operador llegaba a una pantalla que lo iba a rechazar; es el
 * mismo criterio con el que `padron/(lista)/page.tsx` esconde «Nueva
 * persona».
 *
 * Van en una columna bajo el titulo en el telefono y en una fila en
 * escritorio. El orden entre las dos no se toca (L4).
 */
const accionesDeCabecera = ({
  emitir,
  bloqueDeFirma,
}: {
  emitir: ReactNode | undefined;
  bloqueDeFirma: ReactNode | undefined;
}) => {
  if (!emitir && !bloqueDeFirma) return undefined;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {bloqueDeFirma}
      {emitir}
    </div>
  );
};

/**
 * Ruta fina: resuelve el contexto, busca o lista, y compone -mismo molde
 * que `PaginaDeReportes`. Sin guarda de rol propia para el listado -leer no
 * es escribir, `listarConstancias.ts`-; el aviso de permiso es sobre el
 * bloque de firma, que es lo que esta pantalla administra. Lee `?error=`
 * porque `emitirConstanciaAction` redirige aca con un mensaje redactado
 * cuando el formulario llega invalido -sin este `searchParams`, ese mensaje
 * se perdia en silencio (hallazgo de GGA en la revision de la rebanada
 * original, mismo patron ya usado en `configuracion/page.tsx`)-.
 *
 * `q` decide entre `buscarConstancias` y `listarConstancias` -mismo patron
 * que `PaginaDeReportes`-, y el filtro de `estado` viaja en los dos casos:
 * `design.md`, "Buscador", "convive con los filtros, nunca los reemplaza".
 *
 * El enlace de emision se le pasa dos veces al listado -en la cabecera y
 * como accion del vacio inicial- a proposito: en una pantalla sin
 * constancias la accion tiene que estar donde el operador esta mirando.
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

  const puedeAdministrar = puedeAdministrarDocumentos(contexto.usuario.rol);
  const bloqueDeFirma = puedeAdministrar ? (
    <EnlaceDeAccion href="/constancias/configuracion">
      <Gear size={18} aria-hidden="true" />
      Bloque de firma
    </EnlaceDeAccion>
  ) : undefined;
  const emitir = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion href="/constancias/emitir" variante="primaria">
      <Plus size={18} weight="bold" aria-hidden="true" />
      Emitir constancia
    </EnlaceDeAccion>
  ) : undefined;

  return (
    <PaginaDePanel
      titulo="Constancias"
      descripcion="Los documentos que el municipio ya emitió, con el nombre de a quién se le entregaron."
      accion={accionesDeCabecera({ emitir, bloqueDeFirma })}
    >
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
        filtros={filtros}
        q={q}
        orden={orden}
        limite={limite}
        {...(emitir ? { accionDeEmision: emitir } : {})}
      />
    </PaginaDePanel>
  );
}
