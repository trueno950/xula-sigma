import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { lugarPorId } from "@/modules/territorio";
import { contextoActual } from "@/shared/auth";
import { PantallaDeMensaje } from "@/shared/ui";
import { resolverSeleccionDeTerritorio } from "./cargaDeTerritorio";
import { EsqueletoDeTerritorio } from "./EsqueletoDeTerritorio";
import { leerParametros } from "./parametros";
import { TerritorioCargado } from "./TerritorioCargado";

export const metadata: Metadata = { title: "Territorio" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * El registro territorial: navegar es entrar. Sin `?raiz=` se listan las
 * raices del municipio para entrar con un clic; con `?raiz=` el lugar
 * actual con sus acciones y lo que tiene adentro, y cada hijo fija
 * `?nodo=` al entrar. Cero `"use client"`: toda la navegacion viaja por
 * la URL, y el formulario de domicilio tambien se sirve desde la entrada.
 *
 * La raiz y la seleccion de URL se resuelven antes del Suspense: un
 * `notFound()` dentro de un limite ya en curso no puede cambiar el estado,
 * que sale 200. Las lecturas de la seleccion siguen pasando por sus puertos
 * tenant-scoped; el resto de la pantalla conserva el esqueleto de carga.
 */
export default async function PaginaDeTerritorio({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const parametros = leerParametros(await searchParams);
  const raiz = parametros.raizId
    ? await lugarPorId(parametros.raizId, contexto)
    : null;

  if (parametros.raizId && !raiz) notFound();
  const seleccion = await resolverSeleccionDeTerritorio(
    contexto,
    parametros,
    raiz,
  );

  return (
    <Suspense fallback={<EsqueletoDeTerritorio />}>
      <TerritorioCargado
        contexto={contexto}
        parametros={parametros}
        raiz={raiz}
        seleccion={seleccion}
      />
    </Suspense>
  );
}
