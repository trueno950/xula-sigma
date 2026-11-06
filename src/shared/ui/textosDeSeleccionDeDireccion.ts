export type ConfiguracionDeTextos = {
  etiquetaDeLista: string;
  /** El otro camino que ofrece el formulario cuando la búsqueda no alcanza. */
  alternativa?: string;
};

export type TextosDeSeleccionDeDireccion = {
  etiquetaDeLista: string;
  sinResultados: string;
  fallo: string;
};

const conAlternativa = (mensaje: string, alternativa?: string): string =>
  alternativa ? `${mensaje} ${alternativa}` : mensaje;

export const textosDeSeleccionDeDireccion = ({
  etiquetaDeLista,
  alternativa,
}: ConfiguracionDeTextos): TextosDeSeleccionDeDireccion => ({
  etiquetaDeLista,
  sinResultados: conAlternativa("No se encontraron direcciones.", alternativa),
  fallo: conAlternativa("No se pudo buscar direcciones.", alternativa),
});
