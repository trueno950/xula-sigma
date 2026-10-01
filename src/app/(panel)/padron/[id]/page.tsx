import { FileText } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { comoPersonaId, personaPorId } from "@/modules/padron";
import {
  FormularioDeMudanza,
  HistorialDeResidencias,
  historialDeResidencias,
  listarDomicilios,
} from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  Aviso,
  AvisoDePermiso,
  CLASES_DE_DATO,
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Persona" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });
const esquemaDeId = z.string().uuid();

/**
 * Unica ruta que compone `padron` y `territorio` (design.md seccion 11,
 * "Composicion de pantallas"). La dependencia entre modulos es de un solo
 * sentido: `territorio/infrastructure/lectorDePersonasPorPadron.ts` importa
 * el barrel de `padron` (puerto propio + adaptador, design.md seccion 6),
 * pero `padron` nunca importa `territorio` -esa arista no existe, y es lo
 * que `sin-ciclos` en `.dependency-cruiser.cjs` hace cumplir-. Esta pagina
 * no repite esa arista: solo necesita leer de los dos barrels para
 * mostrarlos juntos, algo que ningun modulo podria hacer sin crear una
 * dependencia permanente entre ellos.
 */
export default async function PaginaDeDetalleDePersona({
  params,
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const { id } = await params;
  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;

  /**
   * El formato se valida con Zod, no con un `try/catch` alrededor de
   * `personaPorId` (hallazgo de GGA en la revision de esta rebanada): un
   * `catch` amplio ahi tragaria tambien un fallo real de infraestructura
   * -conexion caida, timeout- y lo mostraria igual que un id inexistente,
   * sin log y sin propagar el error. Con la validacion aparte, un fallo de
   * `personaPorId` que no sea "no encontrado" sigue siendo un error real.
   */
  const analisisDeId = esquemaDeId.safeParse(id);
  const persona = analisisDeId.success
    ? await personaPorId(comoPersonaId(analisisDeId.data), contexto)
    : null;

  // Regla 8: un id de otro municipio ya vuelve `null` por RLS, y desde
  // aca es indistinguible de uno inexistente. Los dos son 404.
  if (!persona) notFound();

  const historial = await historialDeResidencias(persona.id, contexto);
  const domicilios = await listarDomicilios(contexto);
  const nombre = `${persona.nombres} ${persona.primerApellido}${
    persona.segundoApellido ? ` ${persona.segundoApellido}` : ""
  }`;

  /**
   * Emitir la constancia es la accion primaria de esta pantalla: es a lo
   * que se entra a la ficha de alguien desde el mostrador. Antes vivia al
   * pie, debajo del historial, detras de un scroll.
   */
  const emitir = puedeEscribir(contexto.usuario.rol) ? (
    <EnlaceDeAccion
      href={`/constancias/emitir?personaId=${persona.id}`}
      variante="primaria"
    >
      <FileText size={18} aria-hidden="true" />
      Emitir constancia
    </EnlaceDeAccion>
  ) : undefined;
  const puedeActuar = puedeEscribir(contexto.usuario.rol);

  return (
    <PaginaDePanel
      titulo={nombre}
      accion={emitir}
      ancho="detalle"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Padrón", href: "/padron" },
            { etiqueta: nombre },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      {persona.curp ? <p className={CLASES_DE_DATO}>{persona.curp}</p> : null}

      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="registrar cambios en el padrón ni emitir constancias"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-caliza-tinta">
          Historial de residencias
        </h2>
        <HistorialDeResidencias historial={historial} />
      </section>

      {puedeActuar ? (
        <section className="flex flex-col gap-3 border-t border-caliza-divisor pt-6">
          <h2 className="text-[15px] font-semibold text-caliza-tinta">
            Registrar mudanza
          </h2>
          <FormularioDeMudanza personaId={persona.id} domicilios={domicilios} />
        </section>
      ) : null}
    </PaginaDePanel>
  );
}
