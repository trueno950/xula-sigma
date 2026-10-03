import { EsqueletoDeFilas } from "@/shared/ui";

/**
 * Lo que se ve mientras `listarPersonas` responde.
 *
 * No existia: la pantalla quedaba en blanco hasta que llegaba la lista, y
 * en la red de un municipio eso puede ser un par de segundos en los que no
 * hay forma de saber si el clic entro. El esqueleto tiene la altura exacta
 * de las filas que vienen, asi que nada salta cuando llegan.
 *
 * `loading.tsx` y no un estado en la pagina: el limite de Suspense lo pone
 * el App Router, y el `<h1>` sigue siendo el mismo nodo antes y despues.
 *
 * Vive en el grupo `(lista)` para no envolver a `[id]`: un `notFound()` que
 * corre dentro de este limite ya encontro el estado 200 enviado, y la ficha
 * de una persona ajena tiene que responder 404.
 */
export default function CargandoPadron() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="h-9 w-64 animate-pulse rounded-md bg-caliza-relleno" />
      <div className="h-11 animate-pulse rounded-md bg-caliza-relleno" />
      <EsqueletoDeFilas />
    </div>
  );
}
