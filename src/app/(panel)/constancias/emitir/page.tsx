import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";
import {
  BuscadorDeTitular,
  buscarTitulares,
  FormularioDeEmision,
  vistaPreviaDeConstancia,
} from "@/modules/constancias";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarDocumentos, puedeEscribir } from "@/shared/auth/roles";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  Aviso,
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Emitir constancia" };

/** La ruta hasta aca; sin persona elegida no hay ficha a la cual volver. */
const migajaDe = (nombre?: string, personaId?: string) => (
  <Migaja
    etiqueta="Ruta"
    pasos={[
      { etiqueta: "Padrón", href: "/padron" },
      ...(nombre && personaId
        ? [{ etiqueta: nombre, href: `/padron/${personaId}` }]
        : []),
      { etiqueta: "Emitir constancia" },
    ]}
  />
);

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Contexto = NonNullable<Awaited<ReturnType<typeof contextoActual>>>;

/**
 * `?q=a&q=b` llega como `string[]`, no `string` — Next no lo impide. El
 * `safeParse` cae a los defaults en vez de pasarle un arreglo a
 * `buscarTitulares`, que revienta con un 500 sobre una URL publica. Mismo
 * criterio que `/padron`.
 */
const esquemaDeParametros = z.object({
  personaId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
  error: z.string().optional(),
});

/**
 * S4: sin `?personaId=` la pantalla busca a la persona ahi mismo; antes solo
 * decia «Ir al padron», asi que la operadora tenia que salir de la pantalla
 * para volver a entrar por otra puerta. El buscador es un `<form
 * method="get">` nativo y la lista enlaza a esta misma ruta con la persona
 * elegida: `?q=` funciona con JavaScript apagado, igual que `/padron?q=`.
 */
async function paginaSinPersona(
  contexto: Contexto,
  q: string | undefined,
): Promise<ReactElement> {
  return (
    <PaginaDePanel
      titulo="Emitir constancia"
      ancho="formulario"
      migaja={migajaDe()}
    >
      <BuscadorDeTitular
        {...(q ? { cadena: q } : {})}
        {...(q ? { resultado: await buscarTitulares(q, contexto) } : {})}
      />
      <EnlaceDeAccion href="/padron" variante="secundaria">
        Ver el padrón completo
      </EnlaceDeAccion>
    </PaginaDePanel>
  );
}

/** Sin bloque de firma no se emite: la pantalla lo dice antes de confirmar. */
function pantallaSinFirma(
  contexto: Contexto,
  migaja: ReactElement,
): ReactElement {
  return (
    <PaginaDePanel
      titulo="Emitir constancia"
      ancho="formulario"
      migaja={migaja}
    >
      <Aviso tono="error">
        El ayuntamiento todavía no configuró el bloque de firma. Sin quien firma
        y con que cargo, la constancia no se puede emitir.
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

/**
 * Con persona elegida se lee **una sola vez**, por el modelo de lectura que
 * comparten la vista previa y la emision (S5): la hoja que la operadora
 * aprueba y la que se guarda no pueden diferir.
 *
 * El bloque de firma se consulta antes de dibujar el formulario: ofrecer un
 * boton que va a fallar despues de enviar deja al operador sin forma de
 * arreglarlo -`/constancias/configuracion` no estaba enlazada desde ninguna
 * pantalla-. Emitir lo vuelve a validar igual (`05-seguridad.md` seccion 6).
 */
async function paginaConPersona(
  contexto: Contexto,
  personaId: string,
  error: string | undefined,
): Promise<ReactElement> {
  const resultado = await vistaPreviaDeConstancia(personaId, contexto).catch(
    (fallo: unknown) => {
      // Regla 8: una persona de otro municipio no existe en esta pantalla.
      if (fallo instanceof NoEncontradoError) notFound();
      throw fallo;
    },
  );

  if (resultado.clase === "titular-dado-de-baja") {
    return (
      <PaginaDePanel
        titulo="Emitir constancia"
        ancho="formulario"
        migaja={migajaDe()}
      >
        <Aviso tono="error">
          Esta persona está dada de baja en el padrón: no se puede emitir su
          constancia.
        </Aviso>
        <EnlaceDeAccion href="/constancias/emitir" variante="secundaria">
          Buscar otra persona
        </EnlaceDeAccion>
      </PaginaDePanel>
    );
  }

  const { vista } = resultado;
  const migaja = migajaDe(vista.titular.nombreCompleto, personaId);

  if (!vista.firmante) return pantallaSinFirma(contexto, migaja);

  return (
    <PaginaDePanel
      titulo="Emitir constancia"
      ancho="formulario"
      migaja={migaja}
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <FormularioDeEmision personaId={personaId} vista={vista} />
    </PaginaDePanel>
  );
}

/**
 * `personaId` llega por `?personaId=`, no por un segmento dinamico: tasks.md
 * 4.24 fija tres rutas, `{page,emitir,[id]}`, y `[id]` ahi es la constancia,
 * no la persona. `/padron/[id]` enlaza aca con el parametro puesto.
 */
export default async function PaginaDeEmisionDeConstancia({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  if (!puedeEscribir(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje mensaje="Su rol no tiene permiso para emitir constancias." />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const { personaId, q, error } = analisis.success
    ? analisis.data
    : { personaId: undefined, q: undefined, error: undefined };

  return personaId
    ? paginaConPersona(contexto, personaId, error)
    : paginaSinPersona(contexto, q);
}
