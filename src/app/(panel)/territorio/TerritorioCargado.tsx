import { VistaDeRaices } from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import type { BorradorDeDomicilio } from "@/modules/territorio/ui/borradorDeDomicilio";
import { declaracionDeDestino } from "@/modules/territorio/ui/declaracionDeDestino";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";
import { opcionesDeCallesDelMunicipio } from "@/modules/territorio/ui/vistaDeDomicilios";
import type { ContextoActual } from "@/shared/auth/contexto";
import { Aviso, PaginaDePanel } from "@/shared/ui";
import { accionesDeRaiz } from "./AccionesDeRaiz";
import { cabeceraDeLugar } from "./cabeceraDeLugar";
import {
  cargarTerritorio,
  type SeleccionDeTerritorio,
} from "./cargaDeTerritorio";
import { EnlacesDeLaEntrada } from "./EnlacesDeLaEntrada";
import { MENSAJE_DE_CONFIRMACION } from "./mensajeDeConfirmacion";
import type { ParametrosDeTerritorio } from "./parametros";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";
import { VistaDeLugar } from "./VistaDeLugar";

type Props = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  raiz: LugarGuardado | null;
  seleccion: SeleccionDeTerritorio;
  /** Lo capturado en un formulario de domicilio rechazado. */
  borrador?: BorradorDeDomicilio | null | undefined;
};

/**
 * La pantalla con los datos ya cargados, dentro del Suspense de `page.tsx`.
 * La raiz y la seleccion que pueden producir 404 llegan resueltas desde la
 * pagina; aqui corren las lecturas restantes, que cubre el esqueleto.
 */
export const TerritorioCargado = async ({
  contexto,
  parametros,
  raiz,
  seleccion,
  borrador,
}: Props) => {
  const {
    nodos,
    nodo,
    calles,
    domicilio,
    residentes,
    domicilios,
    mismaDireccion,
    lugares,
    cuentas,
    hayCabecera,
    raices,
    puedeCrearLugar,
    domicilioAbierto,
    registroAbierto,
    callesDelMunicipio,
    zonaDeLaEntrada,
  } = await cargarTerritorio({ contexto, parametros, raiz, seleccion });
  const permisos = permisosDeTerritorio(contexto.usuario.rol);
  const { accion, calleId, domicilioId, error, ok, vista } = parametros;
  const cabecera = cabeceraDeLugar(raiz, nodos, nodo);

  return (
    <PaginaDePanel
      {...cabecera}
      accion={raiz ? undefined : accionesDeRaiz({ puedeCrearLugar, accion })}
    >
      {raiz ? null : <EnlacesDeLaEntrada />}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {ok ? <Aviso tono="exito">{MENSAJE_DE_CONFIRMACION[ok]}</Aviso> : null}

      {!raiz ? (
        <>
          {registroAbierto && zonaDeLaEntrada ? (
            <RegistroDeDomicilio
              calles={opcionesDeCallesDelMunicipio(callesDelMunicipio)}
              zona={zonaDeLaEntrada}
              declaracionDeDestino={declaracionDeDestino({
                origen: "municipio",
                tieneColonias: !zonaDeLaEntrada.sinZonas,
              })}
              {...(parametros.regreso
                ? { volverA: parametros.regreso, regreso: parametros.regreso }
                : {})}
              borrador={borrador}
            />
          ) : null}

          <VistaDeRaices
            raices={raices}
            lugares={lugares}
            cuentas={cuentas}
            busqueda={parametros.busqueda}
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
          residentes={residentes}
          domicilios={domicilios}
          mismaDireccion={mismaDireccion}
          busqueda={parametros.busqueda}
          limite={parametros.limite}
          permisos={permisos}
          conteos={cuentas}
          domicilioAbierto={domicilioAbierto}
          borrador={borrador}
        />
      ) : null}
    </PaginaDePanel>
  );
};
