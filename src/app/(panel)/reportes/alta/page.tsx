import { z } from "zod";
import { FormularioDeAlta, TIPOS_DE_INCIDENCIA } from "@/modules/reportes";
import { listarCalles, listarLugares } from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import { Migaja, PaginaDePanel, PantallaDeMensaje } from "@/shared/ui";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const esquemaDeParametros = z.object({ error: z.string().optional() });

/**
 * Ruta fina del alta (tasks.md 7.12): resuelve lugares y sus calles antes
 * de dibujar el formulario -mismo criterio que `emitir/page.tsx` resuelve
 * el bloque de firma antes-, y compone `@/modules/territorio` junto con
 * `@/modules/reportes` porque esta pagina, y no ningun modulo, es el unico
 * lugar autorizado a leer de los dos (mismo reparto que
 * `padron/[id]/page.tsx`).
 *
 * Las calles se piden lugar por lugar (`listarCalles` no tiene una lectura
 * "todas") para que la isla `SelectorDeUbicacionYTipo` filtre por lugar sin
 * un viaje de red por cada seleccion -un municipio piloto tiene pocas
 * decenas de lugares, asi que el costo es el de esta carga, no el de cada
 * cambio de seleccion.
 */
export default async function PaginaDeAltaDeReporte({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesion." />;
  }

  if (!puedeEscribir(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje mensaje="Su rol no tiene permiso para registrar reportes." />
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const error = analisis.success ? analisis.data.error : undefined;

  const lugaresGuardados = await listarLugares(contexto);
  const callesPorLugar = await Promise.all(
    lugaresGuardados.map((lugar) => listarCalles(lugar.id, contexto)),
  );

  const lugares = lugaresGuardados.map((lugar) => ({
    valor: lugar.id,
    etiqueta: `${lugar.nombre} (${lugar.tipo})`,
  }));
  const calles = lugaresGuardados.flatMap((lugar, indice) =>
    (callesPorLugar[indice] ?? []).map((calle) => ({
      valor: calle.id,
      etiqueta: calle.nombre,
      lugarId: lugar.id,
    })),
  );
  const tipos = TIPOS_DE_INCIDENCIA.map((tipo) => ({
    valor: tipo,
    etiqueta: tipo,
  }));

  return (
    <PaginaDePanel
      titulo="Registrar reporte"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Reportes", href: "/reportes" },
            { etiqueta: "Registrar reporte" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <FormularioDeAlta
        lugares={lugares}
        calles={calles}
        tipos={tipos}
        {...(error ? { error } : {})}
      />
    </PaginaDePanel>
  );
}
