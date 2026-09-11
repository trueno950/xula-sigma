declare const marca: unique symbol;

export type IntervencionId = string & {
  readonly [marca]: "IntervencionId";
};

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const comoIntervencionId = (valor: string): IntervencionId => {
  if (!PATRON_UUID.test(valor)) {
    throw new Error("IntervencionId invalido: se esperaba un UUID.");
  }

  return valor as IntervencionId;
};
