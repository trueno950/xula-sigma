import { VistaDeRaices } from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";
import {
  opcionesDeCallesDelMunicipio,
  zonaDelFormulario,
} from "@/modules/territorio/ui/vistaDeDomicilios";
import type { ContextoActual } from "@/shared/auth/contexto";
import { Aviso, PaginaDePanel } from "@/shared/ui";
import { accionesDeRaiz } from "./AccionesDeRaiz";
import { cargarTerritorio } from "./cargaDeTerritorio";
import type { ParametrosDeTerritorio } from "./parametros";
import { RegistroDeDomicilio } from "./RegistroDeDomicilio";
import { VistaDeLugar } from "./VistaDeLugar";

type Props = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  raiz: LugarGuardado | null;
};

/**
 * La pantalla con los datos ya cargados, dentro del Suspense de `page.tsx`.
 *
 * La guarda de la raiz corre en la pagina, fuera de este limite: un
 * `notFound()` que llega aqui ya no puede cambiar el estado enviado. El
 * esqueleto que se ve mientras tanto es `EsqueletoDeTerritorio`, y no un
 * `loading.tsx`, por el mismo motivo.
 */
export const TerritorioCargado = async ({
  contexto,
  parametros,
  raiz,
}: Props) => {
  const {
    raiz: raizCargada,
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
  } = await cargarTerritorio(contexto, parametros, raiz);
  const permisos = permisosDeTerritorio(contexto.usuario.rol);
  const { accion, calleId, domicilioId, error, vista } = parametros;

  return (
    <PaginaDePanel
      titulo="Territorio"
      accion={
        raizCargada ? undefined : accionesDeRaiz({ puedeCrearLugar, accion })
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!raizCargada ? (
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
          raiz={raizCargada}
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
};
