import { z } from "zod";
import {
  ConfiguracionDeDocumentos,
  documentosDelAyuntamiento,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos } from "@/shared/auth/roles";

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
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
        <p className="text-[15px] text-caliza-apagada">
          Su rol no tiene permiso para configurar el bloque de firma.
        </p>
      </main>
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;
  const documentos = await documentosDelAyuntamiento(contexto);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 p-6">
      <h1 className="text-2xl font-semibold text-caliza-tinta">
        Configuracion de documentos
      </h1>

      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      <ConfiguracionDeDocumentos documentos={documentos} />
    </main>
  );
}
