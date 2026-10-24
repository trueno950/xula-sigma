import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  domiciliosDeZona,
  lecturasDeZonas,
  listarCalles,
  listarRaices,
} from "@/modules/territorio";
import { DetalleDeZona } from "@/modules/territorio/ui/DetalleDeZona";
import { ListaDeZonas } from "@/modules/territorio/ui/ListaDeZonas";
import { contextoActual } from "@/shared/auth";
import { NoEncontradoError } from "@/shared/lib/errores";
import { PantallaDeMensaje } from "@/shared/ui";
import { MENSAJE_DE_CONFIRMACION_DE_ZONAS } from "./mensajesDeConfirmacion";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Zonas" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Lectura y administracion de zonas: sin `?zona=` el listado del municipio
 * (filtrable por asentamiento con `?raiz=`); con `?zona=` el detalle con
 * sus pestanas de URL. Todo Server Component: las cargas son las del caso
 * de uso (`listarZonas`, `callesDeZona`, `domiciliosDeZona`) y cada una
 * viaja por su puerto tenant-scoped.
 *
 * La resolucion de parametros ocurre antes de cualquier lectura: un
 * `?zona` o `?raiz` invalido o de otro tenant es 404 aqui, no dentro de un
 * limite de Suspense que ya no puede cambiar el estado (mismo precedente
 * que `territorio/page.tsx`).
 */
export default async function PaginaDeZonas({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const parametros = leerParametros(await searchParams);
  if (parametros.invalido) notFound();

  const aviso = parametros.ok
    ? MENSAJE_DE_CONFIRMACION_DE_ZONAS[parametros.ok]
    : undefined;

  try {
    const asentamientos = await listarRaices(contexto);

    if (parametros.zonaId) {
      const zona = await lecturasDeZonas.zonaPorId(parametros.zonaId, contexto);
      const [calles, domicilios, callesDelAsentamiento] = await Promise.all([
        lecturasDeZonas.callesDeZona(parametros.zonaId, contexto),
        domiciliosDeZona(parametros.zonaId, contexto),
        listarCalles(zona.lugarId, contexto),
      ]);
      return (
        <DetalleDeZona
          zona={zona}
          vista={parametros.vista}
          calles={calles}
          domicilios={domicilios}
          callesDelAsentamiento={callesDelAsentamiento.map((calle) => ({
            id: calle.id,
            nombre: calle.nombre,
          }))}
          error={parametros.error}
          aviso={aviso}
        />
      );
    }

    const zonas = await lecturasDeZonas.listarZonas(
      parametros.raizId ?? null,
      contexto,
    );
    return (
      <ListaDeZonas
        zonas={zonas}
        asentamientos={asentamientos}
        raizActiva={zonas[0]?.asentamiento ?? null}
        error={parametros.error}
        aviso={aviso}
      />
    );
  } catch (error) {
    if (error instanceof NoEncontradoError) notFound();
    throw error;
  }
}
