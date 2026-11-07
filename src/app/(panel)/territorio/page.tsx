import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lugarPorId } from "@/modules/territorio";
import { borradorDeLaPeticion } from "@/modules/territorio/ui/borradorEnCookie";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { PantallaDeMensaje } from "@/shared/ui";
import {
  cargarTerritorio,
  resolverSeleccionDeTerritorio,
} from "./cargaDeTerritorio";
import { leerParametros, type ParametrosDeTerritorio } from "./parametros";
import { TerritorioCargado } from "./TerritorioCargado";

export const metadata: Metadata = { title: "Territorio" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const leerPantalla = async (
  contexto: ContextoActual,
  parametros: ParametrosDeTerritorio,
) => {
  const raiz = parametros.raizId
    ? await lugarPorId(parametros.raizId, contexto)
    : null;

  if (parametros.raizId && !raiz) notFound();
  const seleccion = await resolverSeleccionDeTerritorio(
    contexto,
    parametros,
    raiz,
  );
  const [carga, borrador] = await Promise.all([
    cargarTerritorio({ contexto, parametros, raiz, seleccion }),
    borradorDeLaPeticion(parametros.borrador),
  ]);

  return { raiz, carga, borrador };
};

/**
 * El registro territorial: navegar es entrar. Sin `?raiz=` se listan las
 * raices del municipio para entrar con un clic; con `?raiz=` el lugar
 * actual con sus acciones y lo que tiene adentro, y cada hijo fija
 * `?nodo=` al entrar. Cero `"use client"`: toda la navegacion viaja por
 * la URL, y el formulario de domicilio tambien se sirve desde la entrada.
 *
 * Sin `<Suspense>` ni `loading.tsx`: la pagina espera todas sus lecturas
 * antes de mandar el HTML. Sin JavaScript, lo transmitido dentro de un
 * limite llega en un `<template>` oculto que solo un script inserta, y la
 * pantalla quedaba en el esqueleto (S1 de
 * `odd/tasks/territorio-pendientes.md`). Esperar todo tambien deja que un
 * `notFound()` de la seleccion cambie el estado a 404.
 */
export default async function PaginaDeTerritorio({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) {
    return <PantallaDeMensaje mensaje="No se pudo determinar su sesión." />;
  }

  const parametros = leerParametros(await searchParams);
  const { raiz, carga, borrador } = await leerPantalla(contexto, parametros);

  return (
    <TerritorioCargado
      contexto={contexto}
      parametros={parametros}
      raiz={raiz}
      carga={carga}
      borrador={borrador}
    />
  );
}
