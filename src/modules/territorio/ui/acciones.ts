/**
 * Las acciones que la URL de territorio puede nombrar, como tupla y no como
 * union de tipos: los dos esquemas de Zod que las validan -`parametros.ts`
 * al leer la URL y `volverAlArbol.ts` al escribirla- necesitan la lista en
 * tiempo de ejecucion.
 *
 * Vive en su propio archivo, y no junto al componente que la consume, para
 * que validar una URL no arrastre React ni el sistema de diseno: los mocks
 * del barrel en `page.test.tsx` y `recursoAjeno.test.tsx` la importan de
 * verdad y no deben montar una pantalla para hacerlo.
 *
 * Mientras cada esquema llevo su propia copia, la de `volverAlArbol` quedo
 * sin `corregirDomicilio` ni `bajaDomicilio` y su `.catch(undefined)` las
 * descartaba sin fallar: todo error de esas dos acciones devolvia al
 * operador al listado pelado. Mismo patron que `TIPOS_DE_LUGAR`: la tupla
 * es la fuente y el tipo se deriva.
 */
export const ACCIONES_DE_NODO = [
  "lugar",
  "calle",
  "ubicarCalle",
  "reparentearCalle",
  "bajaCalle",
  "renombrarCalle",
  "domicilio",
  "corregirDomicilio",
  "bajaDomicilio",
  "renombrar",
  "baja",
  "reparentear",
] as const;

export type AccionDeNodo = (typeof ACCIONES_DE_NODO)[number];

/**
 * Las confirmaciones de exito que la URL de territorio puede nombrar
 * (`?ok=`): un vocabulario cerrado, nunca texto libre ni eco de lo que el
 * operador escribio. La URL es editable por cualquiera; una clave que no
 * esta aqui se descarta, y el mensaje de cada clave vive en la pagina.
 *
 * Misma razon que `ACCIONES_DE_NODO` para vivir sin React: la leen la
 * accion que redirige y el esquema que parsea la URL.
 */
export const CLAVES_DE_CONFIRMACION = [
  "lugar-creado",
  "calle-creada",
  "domicilio-creado",
  "domicilio-corregido",
  "lugar-editado",
  "calle-renombrada",
  "calle-ubicada",
  "lugar-movido",
  "calle-movida",
  "lugar-baja",
  "calle-baja",
  "domicilio-baja",
] as const;

export type ClaveDeConfirmacion = (typeof CLAVES_DE_CONFIRMACION)[number];
