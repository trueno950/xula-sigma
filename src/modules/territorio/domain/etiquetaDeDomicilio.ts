/**
 * Como se lee un domicilio en pantalla: selectores, listas y paneles. No es
 * `componerDireccion`, que es el texto impreso de la constancia, con «S/N»,
 * entre calles y referencia.
 */
export type PartesDeEtiqueta = {
  calle: string;
  numero: string | null;
  lugar: string;
  /** El asentamiento; quien no lo conoce lo omite y el lugar cierra. */
  raiz?: string | undefined;
};

/** «Calle 20 #42-B» o «Calle 20 sin número», para quien ya muestra el lugar. */
export const calleYNumero = ({
  calle,
  numero,
}: Pick<PartesDeEtiqueta, "calle" | "numero">): string =>
  numero ? `${calle} #${numero}` : `${calle} sin número`;

/** «Calle 20 #42-B, Colonia Centro, Motul»; el lugar no se repite si es la raiz. */
export const etiquetaDeDomicilio = (partes: PartesDeEtiqueta): string => {
  const raiz = partes.raiz ?? partes.lugar;
  const lugares = partes.lugar === raiz ? [raiz] : [partes.lugar, raiz];

  return [calleYNumero(partes), ...lugares].join(", ");
};
