import Link from "next/link";
import { CLASES_DE_ENLACE, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import type { ReferenciasDeIntervencion } from "../application/puertosDeLectura";

/** Lo que la ficha dice cuando un nombre no se pudo leer (S14, S15). */
export const NO_DISPONIBLE = "No disponible";

type Enlace = { href: string; etiqueta: string };

/**
 * La ruta de un lugar dentro de Territorio: `?raiz=` navega desde una raiz y
 * `?nodo=` abre el hijo. Sin raiz resuelta no hay enlace, porque el que
 * saldria apuntaria al arbol del municipio y no a este lugar.
 */
export const rutaDeLugar = (
  lugarId: string,
  raizId: string | null,
): string | null => {
  if (raizId === null) return null;
  if (lugarId === raizId) return `/territorio?raiz=${raizId}`;
  return `/territorio?raiz=${raizId}&nodo=${lugarId}`;
};

/**
 * Las dos salidas de S15 existen solo con calle: el historial es el de la
 * calle y el mapa abre en la raiz de su lugar. El mapa necesita la raiz -el
 * `?lugar=` del mapa es cabecera o comisaria-, asi que sin ella se ofrece
 * solo el historial.
 */
const enlacesDeUbicacion = (
  intervencion: IntervencionGuardada,
  referencias: ReferenciasDeIntervencion,
): readonly Enlace[] => {
  if (intervencion.calleId === null) return [];

  const historial = {
    href: `/calles/${intervencion.calleId}/historial`,
    etiqueta: "Ver historial de la calle",
  };
  if (referencias.raizId === null) return [historial];

  return [
    historial,
    {
      href: `/mapa-operativo?lugar=${referencias.raizId}`,
      etiqueta: "Ver en el mapa",
    },
  ];
};

/** El lugar como enlace y la calle como dato: es el lugar el que navega (S15). */
const lineaDeLugar = (
  intervencion: IntervencionGuardada,
  referencias: ReferenciasDeIntervencion,
) => {
  const ruta = rutaDeLugar(intervencion.lugarId, referencias.raizId);
  const nombre = referencias.lugar ?? NO_DISPONIBLE;

  return (
    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {ruta === null ? (
        <span className="text-[15px] font-semibold text-caliza-tinta">
          {nombre}
        </span>
      ) : (
        <Link
          href={ruta}
          className={`${CLASES_DE_ENLACE} text-[15px] font-semibold`}
        >
          {nombre}
        </Link>
      )}
      <span aria-hidden="true" className="text-caliza-apagada">
        ·
      </span>
      <span className="text-[15px] text-caliza-tinta">
        {referencias.calle ??
          (intervencion.calleId === null ? "Sin calle" : NO_DISPONIBLE)}
      </span>
    </p>
  );
};

type Props = {
  intervencion: IntervencionGuardada;
  referencias: ReferenciasDeIntervencion;
};

/**
 * «Dónde ocurrió», con el lugar como enlace -a su lugar del arbol- y, cuando
 * hay calle, el historial de esa calle y el mapa de su raiz (S15). La calle
 * se nombra en tinta y no lleva enlace propio: el destino ya esta en «Ver
 * historial de la calle», y dos nombres para la misma pagina se leen como dos
 * cosas distintas.
 */
export function EnlacesDeLaUbicacion({ intervencion, referencias }: Props) {
  const enlaces = enlacesDeUbicacion(intervencion, referencias);

  return (
    <div className="mt-5 rounded-md bg-caliza-superficie px-4 py-3">
      <p className={CLASES_DE_ETIQUETA}>Dónde ocurrió</p>
      {lineaDeLugar(intervencion, referencias)}
      {enlaces.length === 0 ? null : (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={CLASES_DE_ENLACE}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}
