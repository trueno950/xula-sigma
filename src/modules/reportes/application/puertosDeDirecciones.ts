import type { ContextoActual } from "@/shared/auth/contexto";

/** Lectura plana que reportes necesita del registro público de Territorio. */
export type DomicilioEncontradoParaReporte = {
  id: string;
  calle: string;
  numero: string | null;
  lugar: string;
  raiz: string;
  lugarId: string;
};

export type ResultadoDeBusquedaDeDirecciones = {
  domicilios: readonly DomicilioEncontradoParaReporte[];
  hayMas: boolean;
};

/** Puerto propio de reportes; Territorio queda detrás del adaptador. */
export type BuscadorDeDirecciones = {
  buscar(
    contexto: ContextoActual,
    consulta: string,
    limite: number,
  ): Promise<ResultadoDeBusquedaDeDirecciones>;
};
