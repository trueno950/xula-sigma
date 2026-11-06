import Link from "next/link";
import { Fragment } from "react";
import { CLASES_DE_ENLACE, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { ResidenteDeDomicilio } from "../application/puertosDeResidencias";

type Props = {
  residentes: readonly ResidenteDeDomicilio[];
};

const fichaDe = (residente: ResidenteDeDomicilio) =>
  `/padron/${residente.personaId}`;

/** Quien vive hoy en el domicilio, cada uno a su ficha del padron. */
export function ResidentesDeDomicilio({ residentes }: Props) {
  return (
    <section aria-label="Residentes" className="flex flex-col gap-1">
      <h3 className={CLASES_DE_ETIQUETA}>Residentes</h3>
      {residentes.length === 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          Nadie tiene registrada esta dirección como residencia vigente.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {residentes.map((residente) => (
            <li key={residente.personaId} className="text-[15px]">
              <Link href={fichaDe(residente)} className={CLASES_DE_ENLACE}>
                {residente.nombreCompleto}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Los mismos enlaces, en linea y separados por comas, para un aviso. */
export function EnlacesDeResidentes({ residentes }: Props) {
  return residentes.map((residente, indice) => (
    <Fragment key={residente.personaId}>
      {indice > 0 ? ", " : null}
      <Link href={fichaDe(residente)} className={CLASES_DE_ENLACE}>
        {residente.nombreCompleto}
      </Link>
    </Fragment>
  ));
}
