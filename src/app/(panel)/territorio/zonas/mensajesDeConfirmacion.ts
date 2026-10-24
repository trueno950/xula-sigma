import type { ClaveDeConfirmacionDeZona } from "@/modules/territorio/ui/actions/navegacionDeZonas";

/**
 * La oracion de cada clave de `?ok=` de /territorio/zonas. Ninguna lleva
 * texto de la operadora: la clave es de un vocabulario cerrado y el mensaje
 * se arma en el servidor.
 */
export const MENSAJE_DE_CONFIRMACION_DE_ZONAS: Record<
  ClaveDeConfirmacionDeZona,
  string
> = {
  "zona-alta": "Zona creada. Puede seguir con las calles que la componen.",
  "zona-renombre": "Nombre de la zona actualizado.",
  "zona-baja": "Zona dada de baja.",
  "calle-agregada": "Calle agregada a la zona.",
  "calle-en-zona-quitada": "Calle quitada de la zona.",
};
