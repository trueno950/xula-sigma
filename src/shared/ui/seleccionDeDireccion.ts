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

/**
 * Lo que el navegador dice al enviar sin direccion elegida. Escribir en el
 * buscador no basta: el formulario recibe el id de la opcion elegida, no el
 * texto de la consulta. Vacio cuando es valido, como `setCustomValidity`.
 */
export const mensajeDeValidezDeDireccion = <T extends OpcionDeDireccion>(
  estado: EstadoDeSeleccionDeDireccion<T>,
  requerido: boolean,
): string =>
  requerido && !estado.seleccionada ? "Elija una dirección de la lista." : "";
