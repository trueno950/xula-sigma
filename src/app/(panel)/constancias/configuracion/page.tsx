import type { Metadata } from "next";
import { z } from "zod";
import {
  ConfiguracionDeDocumentos,
  documentosDelAyuntamiento,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  Panel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Configuración de constancias" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({
  error: z.string().optional(),
});

/**
 * Ruta fina: resuelve el contexto, decide si el rol alcanza -mismo reparto
 * que `/marca`, para no mostrar un formulario que la Server Action va a
 * rechazar igual, aunque ocultar un boton no sea autorizacion
 * (`05-seguridad.md` seccion 6)- y compone.
 */
export default async function PaginaDeConfiguracionDeDocumentos({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto || !puedeAdministrarDocumentos(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje
        mensaje="Su rol no tiene permiso para configurar el bloque de firma."
        accion={
          <EnlaceDeAccion href="/constancias">A constancias</EnlaceDeAccion>
        }
      />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;
  const documentos = await documentosDelAyuntamiento(contexto);

  return (
    <PaginaDePanel
      titulo="Bloque de firma"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Constancias", href: "/constancias" },
            { etiqueta: "Bloque de firma" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className="text-[15px] text-caliza-apagada">
        Quién firma las constancias del municipio y con qué cargo. Va impreso al
        pie de cada documento; sin esto, no se emite ninguno.
      </p>

      <ConfiguracionDeDocumentos documentos={documentos} />

      <Panel titulo="Vista previa">
        {documentos ? (
          <div className="flex flex-col items-center gap-1 border-t border-caliza-divisor pt-4 text-center">
            <p className="text-[15px] font-semibold text-caliza-tinta">
              {documentos.firmanteNombre}
            </p>
            <p className="text-[13px] text-caliza-apagada">
              {documentos.firmanteCargo}
            </p>
            {documentos.leyendaDePie ? (
              <p className="mt-3 text-[13px] text-caliza-apagada">
                {documentos.leyendaDePie}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[15px] text-caliza-apagada">
            Todavía no hay nada guardado. Así se va a ver al pie de cada
            constancia una vez que guarde.
          </p>
        )}
      </Panel>
    </PaginaDePanel>
  );
}
