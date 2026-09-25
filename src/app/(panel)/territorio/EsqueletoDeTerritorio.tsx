import { EsqueletoDeFilas } from "@/shared/ui";

/**
 * Lo que se ve mientras `TerritorioCargado` resuelve el arbol.
 *
 * Territorio es la pantalla que mas consultas hace antes de pintar —raices,
 * lugar, subarbol, domicilios, calles— asi que es donde la pantalla en
 * blanco duraba mas. El esqueleto tiene la altura de las filas que vienen.
 *
 * No es un `loading.tsx`: ese archivo envuelve a la pagina entera, y Next ya
 * envio el estado 200 cuando `notFound()` corre dentro de el. Este vive en
 * el Suspense de `page.tsx`, despues de la guarda de la raiz.
 */
export function EsqueletoDeTerritorio() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded-sm bg-caliza-relleno" />
      <EsqueletoDeFilas />
    </div>
  );
}
