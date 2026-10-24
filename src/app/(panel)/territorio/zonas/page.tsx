import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { domiciliosDeZona, lecturasDeZonas } from "@/modules/territorio";
import { DetalleDeZona } from "@/modules/territorio/ui/DetalleDeZona";
import { ListaDeZonas } from "@/modules/territorio/ui/ListaDeZonas";
import { contextoActual } from "@/shared/auth";
import { NoEncontradoError } from "@/shared/lib/errores";
import { PantallaDeMensaje } from "@/shared/ui";
import { leerParametros } from "./parametros";

export const metadata: Metadata = { title: "Zonas" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Lectura de zonas: sin `?zona=` el listado del municipio (filtrable por
 * asentamiento con `?raiz=`); con `?zona=` el detalle con sus pestanas de
 * URL. Todo Server Component: las cargas son las tres del caso de uso
 * (`listarZonas`, `callesDeZona`, `domiciliosDeZona`) y cada una viaja por
 * su puerto tenant-scoped.
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

  if (parametros.zonaId) {
    try {
      const zona = await lecturasDeZonas.zonaPorId(parametros.zonaId, contexto);
      const [calles, domicilios] = await Promise.all([
        lecturasDeZonas.callesDeZona(parametros.zonaId, contexto),
        domiciliosDeZona(parametros.zonaId, contexto),
      ]);
      return (
        <DetalleDeZona
          zona={zona}
          vista={parametros.vista}
          calles={calles}
          domicilios={domicilios}
        />
      );
    } catch (error) {
      if (error instanceof NoEncontradoError) notFound();
      throw error;
    }
  }

  try {
    const zonas = await lecturasDeZonas.listarZonas(
      parametros.raizId ?? null,
      contexto,
    );
    return (
      <ListaDeZonas zonas={zonas} raizActiva={zonas[0]?.asentamiento ?? null} />
    );
  } catch (error) {
    if (error instanceof NoEncontradoError) notFound();
    throw error;
  }
}
