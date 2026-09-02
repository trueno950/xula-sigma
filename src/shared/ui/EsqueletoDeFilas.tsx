/**
 * Claves estables para filas que no tienen identidad propia.
 *
 * El indice del `map` seria la clave honesta —son cajas identicas, la lista
 * no se reordena ni se filtra— pero `noArrayIndexKey` no distingue ese caso
 * y la regla vale la pena en todos los demas. Un arreglo fijo da lo mismo
 * sin la excepcion.
 */
const CLAVES = Array.from({ length: 24 }, (_, indice) => `esqueleto-${indice}`);

/**
 * El estado de carga de `DESIGN.md`: la altura exacta de las filas que va a
 * haber, no un spinner. En la red rural el spinner gira medio minuto y no
 * dice nada; el esqueleto ya dice cuanto va a ocupar lo que viene y evita
 * que la pantalla salte cuando llega.
 *
 * `animate-pulse` es la unica animacion del sistema y no es decoracion:
 * distingue "esto va a llegar" de "esto es una fila gris vacia".
 */
export function EsqueletoDeFilas({ filas = 6 }: { filas?: number }) {
  return (
    <ul aria-hidden="true" className="flex animate-pulse flex-col">
      {CLAVES.slice(0, filas).map((clave) => (
        <li
          key={clave}
          className="flex h-11 items-center border-b border-caliza-divisor px-3"
        >
          <span className="h-3 w-1/3 rounded-sm bg-caliza-relleno" />
        </li>
      ))}
    </ul>
  );
}
