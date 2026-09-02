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
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

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
    <PaginaDePanel titulo="Bloque de firma" ancho="formulario">
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className="text-[15px] text-caliza-apagada">
        Quien firma las constancias del municipio y con que cargo. Va impreso al
        pie de cada documento; sin esto, no se emite ninguno.
      </p>

      <ConfiguracionDeDocumentos documentos={documentos} />
    </PaginaDePanel>
  );
}
