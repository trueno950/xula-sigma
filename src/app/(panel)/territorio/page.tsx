import type { Metadata } from "next";
import { VistaDeRaices } from "@/modules/territorio";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";
import {
  opcionesDeCallesDelMunicipio,
  zonaDelFormulario,
} from "@/modules/territorio/ui/vistaDeDomicilios";
import { contextoActual } from "@/shared/auth";
import { Aviso, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";
import { accionesDeRaiz } from "./AccionesDeRaiz";
import { cargarTerritorio } from "./cargaDeTerritorio";
import { leerParametros } from "./parametros";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";
import { VistaDeLugar } from "./VistaDeLugar";

export const metadata: Metadata = { title: "Territorio" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
    nodo,
    calles,
    domicilio,
    lugares,
    hayCabecera,
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
            hayCabecera={hayCabecera}
            puedeEscribir={puedeCrearLugar}
            altaAbierta={accion === "lugar"}
          />
        </>
      ) : nodo ? (
        <VistaDeLugar
          raiz={raiz}
          nodos={nodos}
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
