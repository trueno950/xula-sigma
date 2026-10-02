import { VistaDeRaices } from "@/modules/territorio";
import type { LugarGuardado } from "@/modules/territorio/application/puertos";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";
import type { ContextoActual } from "@/shared/auth/contexto";
import { Aviso, PaginaDePanel } from "@/shared/ui";
import { accionesDeRaiz } from "./AccionesDeRaiz";
import {
  cargarTerritorio,
  type SeleccionDeTerritorio,
} from "./cargaDeTerritorio";
import type { ParametrosDeTerritorio } from "./parametros";
import { VistaDeLugar } from "./VistaDeLugar";

type Props = {
  contexto: ContextoActual;
  parametros: ParametrosDeTerritorio;
  raiz: LugarGuardado | null;
  seleccion: SeleccionDeTerritorio;
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
}: Props) => {
  const {
    nodos,
    nodo,
    calles,
    domicilio,
    lugares,
    hayCabecera,
    raices,
    puedeCrearLugar,
    domicilioAbierto,
    callesDelMunicipio,
    zona,
  } = await cargarTerritorio({ contexto, parametros, raiz, seleccion });
  const permisos = permisosDeTerritorio(contexto.usuario.rol);
  const { accion, calleId, domicilioId, error, vista } = parametros;

  return (
    <PaginaDePanel
      titulo="Territorio"
      accion={raiz ? undefined : accionesDeRaiz({ puedeCrearLugar })}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!raiz ? (
        <VistaDeRaices
          raices={raices}
          lugares={lugares}
          hayCabecera={hayCabecera}
          puedeEscribir={puedeCrearLugar}
          altaAbierta={accion === "lugar"}
        />
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
          domicilioAbierto={domicilioAbierto}
          callesDelMunicipio={callesDelMunicipio}
          zona={zona}
        />
      ) : null}
    </PaginaDePanel>
  );
};
