import type { Metadata } from "next";
import { z } from "zod";
import {
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  FormularioDeAltaDeIntervencion,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import { listarCalles, listarLugares } from "@/modules/territorio";
import {
  opcionesDeCalles,
  opcionesDeLugares,
} from "@/modules/territorio/ui/opciones";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import { hoyEnMerida } from "@/shared/lib/fecha";
import {
  Migaja,
  opcionesEtiquetadas,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Registrar intervención" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Ruta fina del alta: resuelve lugares y sus calles antes de dibujar el
 * formulario -mismo criterio que `/reportes/alta`-, y compone
 * `@/modules/territorio` junto con `@/modules/intervenciones` porque esta
 * pagina, y no ningun modulo, es el unico lugar autorizado a leer de los dos.
 *
 * Las calles se piden lugar por lugar porque `listarCalles` no tiene una
 * lectura "todas": un municipio piloto tiene pocas decenas de lugares, asi
 * que el costo es el de esta carga y no el de cada cambio de seleccion.
 */
export default async function PaginaDeAltaDeIntervencion({
  searchParams,
}: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje mensaje="Su rol no tiene permiso para registrar intervenciones." />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;

  const lugaresGuardados = await listarLugares(contexto);
  const callesPorLugar = await Promise.all(
    lugaresGuardados.map((lugar) => listarCalles(lugar.id, contexto)),
  );

  const lugares = opcionesDeLugares(lugaresGuardados);
  const calles = lugaresGuardados.flatMap((lugar, indice) =>
    opcionesDeCalles(callesPorLugar[indice] ?? []).map((calle) => ({
      valor: calle.valor,
      etiqueta: `${lugar.nombre} · ${calle.etiqueta}`,
    })),
  );
  const tipos = opcionesEtiquetadas(
    TIPOS_DE_INTERVENCION,
    ETIQUETA_DE_TIPO_DE_INTERVENCION,
  );

  return (
    <PaginaDePanel
      titulo="Registrar intervención"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Intervenciones", href: "/intervenciones" },
            { etiqueta: "Registrar intervención" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <FormularioDeAltaDeIntervencion
        tipos={tipos}
        lugares={lugares}
        calles={calles}
        fechaDeHoy={hoyEnMerida()}
        {...(error ? { error } : {})}
      />
    </PaginaDePanel>
  );
}
