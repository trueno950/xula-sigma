import { EsqueletoDeFilas } from "@/shared/ui";

/**
 * Lo que se ve mientras `TerritorioCargado` resuelve las lecturas que
 * quedaron dentro del Suspense. El esqueleto tiene la altura de las filas
 * que vienen.
 *
 * No es un `loading.tsx`: el motivo, y la guarda que por eso corre antes de
 * este limite, vive en `page.tsx`.
 */
export function EsqueletoDeTerritorio() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded-sm bg-caliza-relleno" />
      <EsqueletoDeFilas />
    </div>
  );
}
