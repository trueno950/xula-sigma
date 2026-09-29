import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  documentosDelAyuntamiento,
  FormularioDeEmision,
} from "@/modules/constancias";
import { comoPersonaId, personaPorId } from "@/modules/padron";
import { direccionVigenteDePersona } from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos, puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Emitir constancia" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({
  personaId: z.string().uuid().optional(),
  error: z.string().optional(),
});

/**
 * `personaId` llega por `?personaId=`, no por un segmento dinamico: el
 * texto literal de tasks.md 4.24 fija exactamente tres rutas,
 * `{page,emitir,[id]}`, y `[id]` ahi es la constancia, no la persona. La
 * unica pantalla del repo que ya tiene un `personaId` en mano es
 * `/padron/[id]`, que enlaza aca con el parametro puesto.
 *
 * **El bloque de firma se consulta antes de dibujar el formulario.** Antes
 * no: se emitia, `emitirConstancia` tiraba `DocumentosNoConfiguradosError`
 * y la accion volvia aca con el mensaje puesto. El mensaje era correcto y
 * no llevaba a ningun lado -`/constancias/configuracion` no estaba
 * enlazada desde ninguna pantalla-, asi que el operador quedaba con un
 * boton que no podia funcionar y sin forma de arreglarlo. Mismo criterio
 * que `FormularioDeAltaDeLugar`: no ofrecer un camino que termina en error
 * despues de enviar. El caso de uso lo vuelve a validar igual
 * (`05-seguridad.md` seccion 6).
 */
export default async function PaginaDeEmisionDeConstancia({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  if (!puedeEscribir(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje mensaje="Su rol no tiene permiso para emitir constancias." />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const personaId = analisis.success ? analisis.data.personaId : undefined;
  const error = analisis.success ? analisis.data.error : undefined;

  if (!personaId) {
    return (
      <PantallaDeMensaje
        mensaje="Elija una persona desde el padron para emitir su constancia."
        accion={<EnlaceDeAccion href="/padron">Ir al padron</EnlaceDeAccion>}
      />
    );
  }

  const persona = await personaPorId(comoPersonaId(personaId), contexto);

  // Regla 8, igual que en la ficha de una persona: `?personaId=` es la
  // misma superficie con otra forma de URL.
  if (!persona) notFound();

  const nombreCompleto = [
    persona.nombres,
    persona.primerApellido,
    persona.segundoApellido,
  ]
    .filter((parte): parte is string => Boolean(parte))
    .join(" ");

  const migaja = (
    <Migaja
      pasos={[
        { etiqueta: "Padron", href: "/padron" },
        { etiqueta: nombreCompleto, href: `/padron/${personaId}` },
        { etiqueta: "Emitir constancia" },
      ]}
      etiqueta="Ruta"
    />
  );

  const documentos = await documentosDelAyuntamiento(contexto);

  if (!documentos) {
    return (
      <PaginaDePanel
        titulo="Emitir constancia"
        ancho="formulario"
        migaja={migaja}
      >
        <Aviso tono="error">
          El ayuntamiento todavia no configuro el bloque de firma. Sin quien
          firma y con que cargo, la constancia no se puede emitir.
        </Aviso>
        {puedeAdministrarDocumentos(contexto.usuario.rol) ? (
          <EnlaceDeAccion href="/constancias/configuracion" variante="primaria">
            Configurar el bloque de firma
          </EnlaceDeAccion>
        ) : (
          <p className="text-[15px] text-caliza-apagada">
            Lo configura quien administra el ayuntamiento.
          </p>
        )}
      </PaginaDePanel>
    );
  }

  const direccion = await direccionVigenteDePersona(personaId, contexto);

  return (
    <PaginaDePanel
      titulo="Emitir constancia"
      ancho="formulario"
      migaja={migaja}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <FormularioDeEmision
        personaId={personaId}
        nombreCompleto={nombreCompleto}
        direccion={
          direccion
            ? { texto: direccion.texto, desdeEn: direccion.desdeEn }
            : null
        }
      />
    </PaginaDePanel>
  );
}
