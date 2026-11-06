/**
 * El `id` del formulario que abre un `?accion=` de alta. Hay uno abierto a
 * la vez, asi que un solo nombre alcanza; el enlace que lo abre lo lleva
 * como fragmento para aterrizar en el, igual que `#panel-de-domicilio`.
 */
export const ANCLA_DE_ALTA = "panel-de-alta";

export const conAnclaDeAlta = (href: string) => `${href}#${ANCLA_DE_ALTA}`;
