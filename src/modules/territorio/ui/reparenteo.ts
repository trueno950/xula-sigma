/**
 * Que ofrece el formulario de reparenteo, que no es siempre un select.
 *
 * Un tipo de rango 0 -`cabecera`, `comisaria`- no tiene destino posible:
 * `puedeContener` lo descarta contra los cinco tipos, asi que
 * `destinosDeReparenteo` devuelve vacio y el formulario mostraba solo la
 * frase que lo explica. Correcto para una raiz sana; una trampa para una
 * que **si** cuelga de alguien.
 *
 * Esa fila existe: el `CHECK` que ata `tipo IN ('cabecera','comisaria')` a
 * `padre_id IS NULL` todavia no esta puesto -espera la barrida en todos los
 * entornos-, y hasta entonces una cabecera mal colgada solo se arregla con
 * `nuevoPadreId = null`, que `reparentearLugar` acepta y la pantalla no
 * ofrecia.
 *
 * Las dos salidas son independientes a proposito. Hoy no se dan juntas
 * -lo que puede ser raiz no cabe en ningun lado-, pero atarlas en un
 * `else` haria que un tipo nuevo que pudiera las dos cosas perdiera una
 * sin que nada avise.
 */
export type OfertaDeReparenteo = {
  readonly muestraDestinos: boolean;
  readonly muestraDesanclar: boolean;
};

export const ofertaDeReparenteo = ({
  destinos,
  puedeSerRaiz,
  tienePadre,
}: {
  destinos: number;
  puedeSerRaiz: boolean;
  tienePadre: boolean;
}): OfertaDeReparenteo => ({
  muestraDestinos: destinos > 0,
  muestraDesanclar: puedeSerRaiz && tienePadre,
});

/**
 * A donde va la pantalla despues de un movimiento exitoso.
 *
 * El reparenteo es la segunda accion que no puede quedarse donde estaba.
 * La URL trae la raiz desde la que se entro, y mover el nodo a otra rama lo
 * saca de ese subarbol: `nodoResuelto` deja de encontrarlo y la pagina
 * responde 404 despues de una operacion que salio bien.
 *
 * El destino se arma con el padre nuevo como raiz visible, que contiene al
 * nodo movido por construccion. Desanclado no hay padre, y el nodo pasa a
 * ser su propia raiz. En los dos casos el destino existe sin consultar la
 * base: la accion no sabe cual es la raiz real de la rama de destino, y
 * `?raiz=` no exige una raiz del arbol -la pagina abre el subarbol de
 * cualquier lugar-.
 */
export const destinoDeReparenteo = ({
  lugarId,
  nuevoPadreId,
}: {
  lugarId: string;
  nuevoPadreId: string;
}): { readonly raiz: string; readonly nodo: string } => ({
  raiz: nuevoPadreId || lugarId,
  nodo: lugarId,
});
