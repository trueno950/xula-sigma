type Menu = { open: boolean; contains: (nodo: Node) => boolean };

/**
 * Cierra un `<details>` con Escape o con un toque fuera de el. El navegador
 * no lo hace solo, y el menu "Más" tapa el contenido mientras esta abierto.
 * Devuelve la funcion que deja de escuchar.
 */
export function cerrarAlInteractuar(
  menu: Menu,
  documento: EventTarget,
): () => void {
  const alTeclear = (evento: Event) => {
    if ((evento as KeyboardEvent).key === "Escape") menu.open = false;
  };
  const alTocar = (evento: Event) => {
    if (!menu.contains(evento.target as Node)) menu.open = false;
  };

  documento.addEventListener("keydown", alTeclear);
  documento.addEventListener("pointerdown", alTocar);

  return () => {
    documento.removeEventListener("keydown", alTeclear);
    documento.removeEventListener("pointerdown", alTocar);
  };
}
