export type OpcionDeDireccion = {
  id: string;
  etiqueta: string;
};

export type EstadoDeSeleccionDeDireccion<T extends OpcionDeDireccion> = {
  consulta: string;
  seleccionada: T | null;
};

export const crearEstadoInicialDeDireccion = <
  T extends OpcionDeDireccion,
>(): EstadoDeSeleccionDeDireccion<T> => ({
  consulta: "",
  seleccionada: null,
});

export const cambiarConsultaDeDireccion = <T extends OpcionDeDireccion>(
  estado: EstadoDeSeleccionDeDireccion<T>,
  consulta: string,
): EstadoDeSeleccionDeDireccion<T> => ({
  ...estado,
  consulta,
  seleccionada: null,
});

export const seleccionarDireccion = <T extends OpcionDeDireccion>(
  estado: EstadoDeSeleccionDeDireccion<T>,
  seleccionada: T | null,
): EstadoDeSeleccionDeDireccion<T> => ({
  ...estado,
  seleccionada,
});

export const limpiarSeleccionDeDireccion = <T extends OpcionDeDireccion>(
  estado: EstadoDeSeleccionDeDireccion<T>,
): EstadoDeSeleccionDeDireccion<T> => ({
  ...estado,
  consulta: "",
  seleccionada: null,
});
