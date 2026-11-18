import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  AccionesDeConstancia,
  comoConstanciaId,
  constanciaPorId,
  esquemaDeSnapshot,
  HistorialDeConstancia,
  HojaDeConstancia,
  SelloDeConstancia,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos, puedeEscribir } from "@/shared/auth/roles";
import { exigirAyuntamiento } from "@/shared/tenancy/contexto";
import { Aviso, Migaja, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";

export const metadata: Metadata = { title: "Constancia" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeId = z.string().uuid();
const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * El detalle lee el snapshot congelado y no el padron vivo: lo que muestra
 * la hoja es lo que se imprimio y se entrego, aunque la persona se haya
 * mudado despues (S7-S9 de `constancias-ux`, `design/constancias-detalle/02-hoja-sellada.html`).
 *
 * La hoja es el mismo componente de servidor que la vista previa de la
 * emision (`HojaDeConstancia`, S5), asi que la hoja que se aprueba y la que
 * se consulta despues no pueden decir cosas distintas. El nombre del
 * municipio no va en el snapshot -se lee al renderizar, igual que en el PDF-,
 * y el firmante si va: es el que estaba configurado el dia de la emision.
 *
 * `?error=` lo escriben `reimprimirConstanciaAction` y
 * `cancelarConstanciaAction` cuando rechazan; la pagina solo lo pinta, y
 * solo por eso confia en el texto.
 *
 * Mismo criterio que `padron/[id]/page.tsx` para "no existe": RLS ya deja
 * `constanciaPorId` en `null` para una constancia de otro tenant, y la
 * pantalla responde 404 sin distinguirla de una inexistente (regla 8).
 */
export default async function PaginaDeDetalleDeConstancia({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { id } = await params;
  const analisisDeId = esquemaDeId.safeParse(id);
  const constancia = analisisDeId.success
    ? await constanciaPorId(comoConstanciaId(analisisDeId.data), contexto)
    : null;

  if (!constancia) notFound();

  const datos = esquemaDeSnapshot.parse(constancia.datos);
  const analisisDeParametros = esquemaDeParametros.safeParse(
    await searchParams,
  );
  const error = analisisDeParametros.success
    ? analisisDeParametros.data.error
    : undefined;
  const { nombre } = await exigirAyuntamiento();

  return (
    <PaginaDePanel
      titulo={constancia.folio}
      descripcion="Constancia de vecindad"
      ancho="detalle"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Constancias", href: "/constancias" },
            { etiqueta: constancia.folio },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesDeConstancia
        constanciaId={constancia.id}
        personaId={constancia.personaId}
        cancelada={constancia.canceladaEn !== null}
        puedeReimprimir={puedeEscribir(contexto.usuario.rol)}
        puedeCancelar={puedeAdministrarDocumentos(contexto.usuario.rol)}
      />
      <HojaDeConstancia
        datos={{
          municipio: nombre,
          titular: {
            nombreCompleto: datos.titular.nombreCompleto,
            href: `/padron/${constancia.personaId}`,
          },
          direccion: datos.direccion,
          firmante: {
            ...datos.firmante,
            ...(datos.leyendaDePie ? { leyendaDePie: datos.leyendaDePie } : {}),
          },
          folio: constancia.folio,
          emitidaEn: constancia.emitidaEn,
        }}
        sello={
          <SelloDeConstancia
            estado={constancia.estado}
            canceladaEn={constancia.canceladaEn}
            motivoCancelacion={constancia.motivoCancelacion}
          />
        }
      />
      <HistorialDeConstancia
        folio={constancia.folio}
        emitidaEn={constancia.emitidaEn}
        canceladaEn={constancia.canceladaEn}
        motivoCancelacion={constancia.motivoCancelacion}
      />
    </PaginaDePanel>
  );
}
