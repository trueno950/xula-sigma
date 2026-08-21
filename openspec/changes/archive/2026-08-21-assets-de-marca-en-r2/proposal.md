# Propuesta: Assets de marca en R2

**Cambio:** `assets-de-marca-en-r2` · **Base:** engram
`sdd/assets-de-marca-en-r2/exploration`

> **Lo que cambio despues de escribir esto.** Este documento es de un
> momento y no se reescribe: sus decisiones eran ciertas cuando se tomaron.
> Dos se movieron durante la implementacion, por hallazgos de la revision
> del repo, y `design.md` es el que manda:
>
> - La validacion de marca **no** vive en `src/shared/ui/marca.ts`. Se movio
>   a `src/shared/marca/validacion.ts` junto con `contraste.ts`: era una
>   regla de negocio en un archivo de presentacion, y `application` no puede
>   importar de `ui`. `shared/ui/marca.ts` se quedo solo con
>   `variablesDeMarca`, que si devuelve `CSSProperties`.
> - El caso de uso recibe **dos** puertos, no uno: se sumo
>   `RepositorioDeMarca` para sacarle el Drizzle crudo de encima.

## Intencion

`ayuntamientos.marca` ya valida un campo `escudo` (`src/shared/ui/marca.ts`)
que nadie escribe y nadie pinta. Hoy la unica forma de que un municipio
tenga su escudo es que alguien edite un `jsonb` a mano con una URL de
internet — exactamente lo que `docs/05-seguridad.md` seccion 9 prohibe: "lo
sube el ayuntamiento; no se descarga de internet".

El filesystem del contenedor en Railway es efimero: un escudo guardado ahi
desaparece en el proximo deploy. Es el escenario T10 de
`invariantes-criticos.md`, escrito hace meses y todavia sin test.

Exito: el `ADMIN_MUNICIPAL` de Motul sube el escudo desde el panel, la
pantalla de acceso de `motul.xulasigma.mx` lo muestra, y sigue ahi despues
del siguiente deploy.

## Alcance

**Dentro:** modulo nuevo `src/modules/marca/` con sus cuatro capas; subida
del escudo por Server Action; validacion real del archivo en servidor;
puerto de almacenamiento en `application` con adaptador R2 en
`infrastructure` y fake en tests; regla de rol `puedeCambiarMarca`; traza en
bitacora; escritura de la URL en `ayuntamientos.marca` via `withTenant`;
render del escudo en `src/app/(acceso)/layout.tsx`; `marca` dentro de la
exportacion por ayuntamiento.

**Fuera:** `logotipo` — el esquema tiene un solo campo de asset y ninguna
superficie pinta un segundo; quitar el escudo y volver a "sin escudo" — el
reemplazo cubre la subida equivocada; recorte o reencodeo de la imagen;
barrido de reconciliacion de huerfanos; los **bytes** del escudo dentro del
archivo de exportacion; cualquier otro asset en ese bucket.

## Decisiones cerradas

| # | Decision | Por que | Alternativa descartada |
|---|---|---|---|
| 1 | Clave `{ayuntamientoId}/escudo-{uuid}.png`, opaca y nueva en cada subida | El prefijo ata el objeto al tenant y el `ayuntamientoId` sale de `ayuntamientoActual()`, nunca de un parametro. La clave nueva hace el reemplazo atomico para quien lee: la URL vieja sigue sirviendo hasta que se borra | `{id}/escudo.png` estable: mas simple y sin huerfanos, pero Cloudflare cachea agresivo y el municipio ve el escudo viejo sin forma de invalidarlo |
| 2 | Bucket publico detras de dominio propio; se guarda la URL absoluta | El escudo es publico por naturaleza y se pinta **antes de que exista sesion**: no hay quien autorice una firma. La URL vive largo en `jsonb`; una firma con vencimiento se guardaria ya muerta y `urlDeAsset` la aceptaria igual | URL firmada: obliga a guardar la clave y refirmar en cada render de la superficie mas caliente, y el dato no es secreto |
| 3 | **PNG unicamente.** Firma de 8 bytes, `IHDR` en offset fijo, maximo 1 MiB, entre 80x80 y 2048x2048 | Un escudo es un logo con transparencia. Un formato = un sniffer con offsets fijos, testeable con fixtures de bytes y sin dependencia de imagen. 1 MiB entra en el limite por defecto de Server Actions de Next: subirlo lo sube para **todas** las acciones. Las dimensiones acotan la bomba de descompresion sin decodificar | Confiar en extension o `Content-Type` (los pone el cliente); SVG (vector con `<script>`); multiformato (multiplica la superficie de sniffing sin beneficio a 80x80) |
| 4 | Server Action. PUT a R2 **primero**, despues transaccion con UPDATE + bitacora | Si los bytes no pasan por el servidor, la validacion en servidor es estructuralmente imposible. Lo que debe ser atomico —URL y traza— ya vive en Postgres bajo una transaccion. Si esa transaccion falla queda un objeto que nadie referencia: un huerfano invisible. Al reves, `marca` apuntaria a un objeto inexistente y la falla cae en la superficie publica | PUT prefirmado: mata la validacion en servidor y obliga a un "confirmar" que redescarga el objeto para validarlo |
| 5 | `puedeCambiarMarca = ADMIN_MUNICIPAL`, en `shared/auth/roles.ts`, verificado en el caso de uso | El escudo es la identidad institucional del municipio: que lo cambie quien opera la plataforma es una superficie de suplantacion. `OPERADOR` queda afuera porque la marca no es operacion. Misma linea y misma razon que `puedeExportar` | Duplicar la union de roles en `modules/marca/domain/` (lo que sugiere el comentario de `roles.ts`): esa regla es para reglas de una entidad de negocio; `exportarAyuntamiento` ya sienta el precedente contrario. `puedeEscribir` es demasiado ancho |
| 6 | `@aws-sdk/client-s3`, confinado a `modules/marca/infrastructure/` por regla de dependency-cruiser | SigV4 es cripto de credenciales: un error sutil falla como 403 en produccion o firma algo que nadie quiso firmar. Es el mismo calculo que puso `@node-rs/argon2` en el repo. El peso es de instalacion, no de bundle: solo corre en servidor | SigV4 a mano con `node:crypto`: ahorra node_modules y cuesta una implementacion criptografica que nadie va a mantener. Un micropaquete de firma: mismo calculo que argon2, apunta al mismo lado |
| 7 | Borrado del objeto anterior **despues** del commit, best-effort, con log y sin propagar el error | La verdad esta en Postgres, no en el bucket. Un borrado dentro de la transaccion no se puede revertir. Un huerfano por caida entre commit y borrado es 1 MiB por municipio por cambio de administracion: una fuga acotada y contada en unidades | Reglas de ciclo de vida por antiguedad en R2: borrarian el escudo **vigente**, que no se toca nunca despues de subirse |
| 8 | `marca` entra a `Exportacion["ayuntamiento"]` en **este** cambio; los bytes no | Sin esto la exportacion miente sobre la marca. Los bytes obligarian a un contenedor (zip) y a cambiar el contrato de la exportacion entera por un archivo | Dejar todo para despues. **Limitacion declarada:** la URL exportada muere si se desmonta el bucket; entregar el asset junto al JSON es cambio siguiente, con nombre |
| 9 | `marca.ts` exporta `urlDeAsset` **y** un punto de validacion que distingue "marca vacia" de "marca invalida" | Ver la seccion siguiente | Rederivar el chequeo http/https en el modulo: dos copias del mismo invariante que divergen en silencio (filtro 3 de `CLAUDE.md`) |

## El descarte total de `leerMarca`

`leerMarca` descarta la marca **entera** si un solo campo no valida
(`marca.ts:92-98`). Escribir un `escudo` sobre una marca que ya tenia un
color invalido —hoy se pegan a mano— revierte en silencio los colores del
municipio a los de fabrica.

La regla de lectura se vuelve precondicion de escritura: dentro de la misma
transaccion se lee el `jsonb` crudo, se compone el objeto resultante y se
valida con **el mismo validador que corre al leer**. Si el resultado no
pasaria, la accion falla nombrando el campo y no escribe nada. Eso pide
exponer desde `marca.ts` una entrada que devuelva exito o falla, con
`leerMarca` construido encima.

## Capabilities

### New Capabilities

- `marca-municipal`: subida del escudo, validacion del archivo en servidor,
  almacenamiento fuera del contenedor, autorizacion por rol, traza en
  bitacora, render pre-sesion y presencia en la exportacion.

### Modified Capabilities

- `autorizacion-roles`: nueva regla `puedeCambiarMarca` — solo
  `ADMIN_MUNICIPAL`, `SUPER_ADMIN` excluido a proposito.

## Enfoque

El codigo vive en `src/modules/marca/{domain,application,infrastructure,ui}`
porque **toda** regla `forbidden` de `.dependency-cruiser.cjs` esta anclada a
`^src/modules/`: las capas se enforzan ahi y en ningun otro lado.
`shared/ui/marca.ts` y `contraste.ts` se quedan en `shared` — el layout
municipal los consume antes de que exista sesion.

- `domain`: validacion de bytes (firma, tamanio, dimensiones) y construccion
  de la clave. Puro, sin IO, sin imports.
- `application`: puerto `AlmacenDeAssets` (`guardar`, `borrar`) y el caso de
  uso que verifica el rol, valida, guarda y escribe via `withTenant`.
- `infrastructure`: adaptador R2, unico lugar del repo que importa el cliente
  S3, con su regla de dependency-cruiser espejo de `auth-solo-desde-shared-auth`.
- `ui`: Server Action en la forma canonica del ADR 0001 seccion 4 y el
  formulario. Es la primera del repo — `"use server"` no aparece hoy.

**Sin tabla nueva.** La URL va al `jsonb` que ya existe, y la politica
`ayuntamientos_escritura_propia` ya acota el UPDATE a la fila propia.
Verificado contra el esquema: no hace falta migracion.

**Lo unico que necesita credenciales reales** es el PUT/DELETE contra un
bucket y que el dominio publico resuelva. Todo lo demas corre contra el fake.
Ese chequeo es una tarea manual documentada, no un test de CI: no hay
credenciales de R2 en CI y no se ponen.

## Invariantes que toca

| Invariante / escenario | Como lo toca |
|---|---|
| 4 — Marca blanca y assets | El escudo sale del filesystem efimero; prefijo por `ayuntamientoId` |
| T10 | Sobrevive al redeploy. Gana su test |
| 1 — Aislamiento | Sin tabla nueva; el UPDATE ya esta acotado por RLS y el id nunca viaja por parametro |
| 5 — Auditoria | Cambio de marca en bitacora, en la misma transaccion |

## Areas afectadas

| Area | Impacto | Que cambia |
|---|---|---|
| `src/modules/marca/` | Nueva | Las cuatro capas |
| `src/shared/ui/marca.ts` | Modificada | Exporta `urlDeAsset` y la entrada de validacion |
| `src/shared/auth/roles.ts` | Modificada | `puedeCambiarMarca` |
| `src/shared/exportacion/exportar.ts` | Modificada | `marca` en `municipioDe` |
| `src/app/(acceso)/layout.tsx` | Modificada | Pinta el escudo a 80x80 |
| `.dependency-cruiser.cjs` | Modificada | El cliente S3 solo desde el adaptador |
| `package.json` | Modificada | `@aws-sdk/client-s3` |

## Riesgos

| Riesgo | Prob. | Mitigacion |
|---|---|---|
| Un bucket publico normaliza "los archivos van a R2" y maniana alguien mete ahi un documento del juzgado | Media | Bucket de un solo proposito, nombrado por su contenido; el puerto expone solo escudo; queda escrito en el ADR |
| Escribir el escudo revierte los colores del municipio | Alta sin mitigacion | Validar antes de escribir con el mismo validador de lectura |
| El adaptador no tiene lugar donde componerse: `ui` no importa `infrastructure` y `src/app` tampoco | Media | Composicion en `src/modules/marca/index.ts`. Lo cierra `sdd-design` antes de escribir codigo |
| Config de R2 o firma mal, descubierto solo con credenciales | Media | Adaptador delgado detras del puerto; smoke manual como tarea explicita |
| FormData y limite de cuerpo en Server Actions, sin precedente en el repo | Media | 1 MiB entra en el limite por defecto; no se toca `bodySizeLimit` |
| PNG unicamente incomoda a un municipio que solo tiene su escudo en JPG | Baja | Documentado. Sumar JPEG despues es aditivo sobre una funcion con su test |

## Plan de rollback

Aditivo: sin migracion, sin cambio de esquema. Revertir es revertir el PR —
el campo `escudo` vuelve a estar validado y sin pintar, como hoy. Los objetos
quedan en R2 sin costo relevante.

Si lo que se desmonta es el bucket, revertir el codigo **no alcanza**: las
URLs siguen guardadas y `leerMarca` las acepta, asi que el navegador pide una
imagen que ya no existe. Hace falta un UPDATE que vacie `marca.escudo` en las
filas afectadas. Es una decena de municipios, no un job.

## Dependencias

- `@aws-sdk/client-s3` (nueva, justificada en la decision 6).
- Bucket R2 con dominio propio y token de API. Prerrequisito operativo, no de
  codigo: sin el, el cambio se completa contra el fake y el smoke queda
  pendiente.
- Variables de entorno nuevas, leidas al tope del adaptador con falla
  temprana, como `withTenant` y `ritmo.ts`.

## Tamanio frente al presupuesto de 400 lineas

Estimacion honesta: **~440 lineas**, con los fixtures de bytes y el primer
Server Action del repo como los tramos menos predecibles. Es un desborde del
10%, no un cambio que pida encadenarse: cortarlo en dos deja un primer PR que
no le sirve a ningun municipio.

Recomendacion: aceptar el desborde con la atencion del revisor apuntada a los
tres archivos que cargan riesgo —validacion de bytes, caso de uso y adaptador.
Si tiene que entrar bajo 400, lo que se corta es `marca` en la exportacion
(~15 lineas) y pasa al cambio siguiente que ya esta nombrado en la decision 8.

## Criterios de exito

- [ ] Un PNG valido subido por el `ADMIN_MUNICIPAL` aparece en la pantalla de
      acceso de su subdominio y sigue ahi despues de un redeploy.
- [ ] Un archivo que dice ser PNG por su nombre pero no lo es por sus bytes
      se rechaza sin llegar a R2.
- [ ] Un `OPERADOR` y un `SUPER_ADMIN` reciben 403 al intentar cambiarla.
- [ ] La clave del objeto lleva el `ayuntamientoId` del contexto y no uno
      recibido por parametro.
- [ ] Subir un escudo sobre una marca con un color invalido falla nombrando
      el campo, y los colores guardados no se tocan.
- [ ] El cambio de marca queda en bitacora, en la misma transaccion.
- [ ] La exportacion de un ayuntamiento incluye su `marca`.
- [ ] Todo el flujo pasa en `pnpm test` contra el fake, sin credenciales.
- [ ] `pnpm test`, `pnpm test:integration` y `pnpm check` en verde.

## Ronda de preguntas de propuesta — resueltas

Contestadas por el responsable del producto antes del spec.

1. **Logotipo.** Afuera. Ninguna superficie pinta un segundo asset todavia.
2. **PNG unicamente.** Se mantiene. Todavia no se sabe si hay municipios con
   el escudo solo como JPG escaneado, asi que queda como **limitacion
   declarada**: si aparece uno, se agrega un segundo sniffer de bytes y sus
   dimensiones. Es un cambio acotado a la validacion, no un redisenio.
3. **Bucket publico.** Confirmado. El escudo es la senializacion del
   municipio; no es dato de circulacion restringida.
4. **Quitar el escudo.** Afuera de la primera rebanada. El reemplazo cubre la
   subida equivocada.
5. **Desborde a ~440 lineas.** Aceptado en un solo PR. La revision apunta a
   los tres archivos que cargan riesgo: validacion de bytes, caso de uso y
   adaptador de R2. `marca` en la exportacion **entra** en este cambio.
