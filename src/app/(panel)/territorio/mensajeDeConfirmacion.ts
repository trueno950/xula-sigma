import type { ClaveDeConfirmacion } from "@/modules/territorio";

/**
 * La oracion de cada clave de `?ok=`. Cuando la accion deja el formulario
 * abierto para capturar en lote, lo dice: el aviso tiene que ser lo bastante
 * claro para que el operador sepa que se guardo antes de escribir el
 * siguiente. Ninguna lleva texto del operador.
 */
export const MENSAJE_DE_CONFIRMACION: Record<ClaveDeConfirmacion, string> = {
  "lugar-creado": "Lugar agregado. Puede seguir agregando otro.",
  "calle-creada": "Calle agregada. Puede agregar otra.",
  "domicilio-creado": "Domicilio registrado. Puede registrar otro.",
  "domicilio-corregido": "Domicilio corregido.",
  "lugar-editado": "Nombre del lugar actualizado.",
  "calle-renombrada": "Nombre de la calle actualizado.",
  "calle-ubicada": "Ubicación de la calle guardada.",
  "lugar-movido": "Lugar movido.",
  "calle-movida": "Calle movida.",
  "lugar-baja": "Lugar dado de baja.",
  "calle-baja": "Calle dada de baja.",
  "domicilio-baja": "Domicilio dado de baja.",
};
