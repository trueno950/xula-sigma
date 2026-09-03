import { EnlaceDeAccion, PantallaDeMensaje } from "@/shared/ui";

/**
 * El 404 del panel.
 *
 * Existe porque la regla 8 de `AGENTS.md` -recurso de otro tenant devuelve
 * 404- se cumple con `notFound()`, y sin este archivo esa llamada mostraba
 * la pantalla por defecto de Next: fuera del panel y sin salida.
 *
 * **El texto es deliberadamente el mismo para las tres causas** -no
 * existe, es de otro municipio, o fue dado de baja-. Distinguirlas seria
 * confirmarle a quien prueba ids que ese id existe en algun lado, que es
 * justo lo que el 404 evita.
 */
export default function NoEncontrado() {
  return (
    <PantallaDeMensaje
      mensaje="No encontramos eso. Puede que ya no exista."
      accion={<EnlaceDeAccion href="/">Volver al inicio</EnlaceDeAccion>}
    />
  );
}
