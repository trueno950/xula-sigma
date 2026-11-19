import { CeldaDeApoyo, CeldaPrincipal, FilaDeTabla } from "@/shared/ui";
import type { DomicilioDelRegistro } from "../application/puertosDeDomicilios";
import { calleYNumero, etiquetaDeDomicilio } from "../domain";
import { hrefDeDomicilioDelRegistro } from "./hrefsDeDomicilios";

type Props = {
  domicilio: DomicilioDelRegistro;
};

/**
 * Una fila del registro plano: la direccion en tinta, su asentamiento en
 * gris y el chevron. El enlace -y con el la fila entera tocable en el
 * telefono- lo pone `FilaDeTabla`; aca solo se arma la direccion con
 * `calleYNumero`, la misma funcion que usa el arbol, para que un domicilio se
 * lea igual en las dos pantallas.
 */
export function FilaDeDomicilio({ domicilio }: Props) {
  return (
    <FilaDeTabla
      href={hrefDeDomicilioDelRegistro(domicilio)}
      etiquetaAccesible={etiquetaDeDomicilio({
        calle: domicilio.calle,
        numero: domicilio.numero,
        lugar: domicilio.lugar,
      })}
    >
      <CeldaPrincipal>{calleYNumero(domicilio)}</CeldaPrincipal>
      <CeldaDeApoyo>{domicilio.lugar}</CeldaDeApoyo>
    </FilaDeTabla>
  );
}
