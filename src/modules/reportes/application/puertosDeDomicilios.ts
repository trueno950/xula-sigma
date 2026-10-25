/**
 * Lectura de `territorio` que conserva reportes: el puerto habla solo de
 * identificadores planos y no expone tipos de dominio de otro modulo.
 */
export type DomicilioParaReporte = {
  lugarId: string;
  calleId: string;
};

/** Sin `tx`: el adaptador abre la lectura tenant-scoped de `territorio`. */
export type LecturaDeDomicilios = {
  porId(domicilioId: string): Promise<DomicilioParaReporte | null>;
};
