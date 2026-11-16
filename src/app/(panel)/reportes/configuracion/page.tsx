import type { Metadata } from "next";
import { z } from "zod";
import {
  FormularioDeUmbralDeAtraso,
  leerUmbralDeAtraso,
} from "@/modules/reportes";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarReportes } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Configuración de reportes" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Ruta fina de S1 de `gestion-municipal`: decide si el rol alcanza -mismo
 * reparto que `/constancias/configuracion`, para no mostrar un formulario
 * que `cambiarUmbralDeAtraso` va a rechazar igual, aunque esconderlo no sea
 * autorizacion-, lee el umbral vigente y compone.
 */
export default async function PaginaDeConfiguracionDeReportes({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto || !puedeAdministrarReportes(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje
        mensaje="Su rol no tiene permiso para configurar los reportes."
        accion={<EnlaceDeAccion href="/reportes">A reportes</EnlaceDeAccion>}
      />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;
  const umbral = await leerUmbralDeAtraso(contexto);

  return (
    <PaginaDePanel
      titulo="Atraso de reportes"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Reportes", href: "/reportes" },
            { etiqueta: "Atraso de reportes" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className="text-[15px] text-caliza-apagada">
        Cuántos días puede esperar un reporte recibido antes de marcarse como
        atrasado. La marca aparece en la bandeja de reportes y en el mapa
        operativo del municipio.
      </p>

      <FormularioDeUmbralDeAtraso umbral={umbral} />
    </PaginaDePanel>
  );
}
