# Runbook: migrar sectores y manzanas a zonas

## Alcance y autorización

Este procedimiento mueve domicilios que cuelgan de `sector` o `manzana` a su
asentamiento, crea una zona por sector y elimina físicamente las filas de
`sector` y `manzana`. Afecta a todos los ayuntamientos visibles para la
conexión y no es una operación de mantenimiento rutinario.

No ejecutar sin una ventana operativa aprobada para **cada municipio afectado**.
La autorización debe identificar al responsable, el horario, los municipios,
la copia de seguridad disponible y el procedimiento de reversión. Durante la
ventana se deben detener las escrituras concurrentes sobre territorio y
domicilios; de lo contrario, los conteos podrían dejar de representar el
estado que se está migrando.

`B3d-REFACTOR-06` no se puede marcar ni ejecutar sin esa aprobación. Ningún
valor por defecto ni automatización puede inferir la ventana.

## Precondiciones

Antes de abrir la ventana, la persona operadora debe confirmar:

- La rama y el commit de la operación fueron revisados y corresponden a la
  versión aprobada de `scripts/migrar-sectores-a-zonas.sql`.
- Las migraciones de esquema requeridas ya están aplicadas, incluida la que
  concede `DELETE` sobre `lugares` a `xula_app`
  (`drizzle/0018_grant_baja_fisica_lugares.sql`). Sin ese `GRANT`, no se
  ejecuta el script.
- Existe una copia de seguridad verificable y un espacio seguro para conservar
  la salida completa del comando.
- `DATABASE_URL` está disponible únicamente como variable de entorno en el
  host operativo. No escribir contraseñas, hashes ni URLs con credenciales en
  este archivo, en el shell history ni en la salida compartida.
- La conexión usará `xula_app`, no `xula_migrator` ni un superusuario. RLS debe
  seguir siendo el límite de la operación.
- La persona operadora puede detener el despliegue o las escrituras del
  municipio durante toda la ventana.

Validar la identidad de la base y del rol sin imprimir secretos:

```sh
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL en el entorno, no en el comando}"
psql "$DATABASE_URL" \
  --no-psqlrc \
  --set=ON_ERROR_STOP=on \
  --command='select current_database(), current_user;'
```

El resultado debe mostrar la base aprobada y `xula_app`. Si falla una
precondición, detenerse sin ejecutar el script.

## Ejecución y captura

Con las escrituras detenidas, ejecutar desde la raíz del repositorio. La
captura debe conservar tanto la salida como el código de salida de `psql`:

```sh
set -o pipefail
mkdir -p "$MIGRACION_SALIDA_DIR"

psql "$DATABASE_URL" \
  --no-psqlrc \
  --set=ON_ERROR_STOP=on \
  -f scripts/migrar-sectores-a-zonas.sql \
  2>&1 | tee "$MIGRACION_SALIDA_DIR/migrar-sectores-a-zonas-$(date -u +%Y%m%dT%H%M%SZ).log"
```

`MIGRACION_SALIDA_DIR` debe apuntar a almacenamiento protegido y respaldado.
Con `pipefail`, un error de `psql` hace fallar el comando aunque `tee` haya
podido escribir el archivo.

El script fija `app.tenant` con `set_config(..., true)` por municipio,
pero todo el bloque `DO` -todos los municipios de la corrida- es **una
sola transacción**: no se puede hacer `COMMIT` dentro de un `DO`. También
cuenta cada `INSERT`, `UPDATE` y `DELETE`; cualquier diferencia provoca una
excepción y revierte esa transacción completa, incluidos los municipios ya
procesados antes del que falló. No reintentar a ciegas: conservar la
salida y diagnosticar el primer error.

La salida contiene seis grupos que deben conservarse juntos, con estas
columnas exactas:

1. domicilios movidos: `subdominio`, `domicilio_id`, `lugar_anterior_id`,
   `lugar_destino_id`, `sector_id`, `calle_id`;
2. lugares borrados: `subdominio`, `lugar_id`, `tipo`, `nombre`, `padre_id`, `baja_en`;
3. zonas creadas: `subdominio`, `sector_id`, `zona_id`, `lugar_id`, `nombre`, `baja_en`;
4. calles rechazadas: primero el conteo `salida`, `cantidad` y después el
   detalle `salida`, `subdominio`, `sector_id`, `zona_id`, `calle_id`,
   `lugar_esperado_id`, `lugar_real_id`;
5. zonas duplicadas: primero el conteo `salida`, `cantidad` y después el
   detalle `salida`, `subdominio`, `asentamiento_id`, `nombre`,
   `sector_ids`;
6. registros dependientes: primero el conteo `salida`, `cantidad` y después
   el detalle `salida`, `subdominio`, `entidad`, `entidad_id`, `lugar_id`.

Una calle rechazada no se fuerza a una zona de otro asentamiento. El detalle incluye tanto calles derivadas de domicilios como una calle cuyo propio `lugar_id` es un sector o manzana que se borrará; esta última sigue frenando el `DELETE` con una violación de llave foránea (`calles_lugar_tenant_fk`) hasta que se cure -`psql` en verbosity por defecto no imprime el codigo SQLSTATE `23503`, solo el mensaje con el nombre de la restricción, asi que buscar ese nombre en el log y no el numero. Antes de cada `DELETE`, el script escribe la misma lista como `NOTICE __B3D_CALLES_RECHAZADAS_JSON__:<json>` para que `2>&1` la conserve incluso cuando esa reja aborta el bloque. Debe registrarse para curación municipal antes de cualquier operación posterior.

Dos sectores **activos** del mismo asentamiento con el mismo nombre chocan
contra `zonas_tenant_lugar_nombre_idx` -es un índice parcial, `WHERE
baja_en IS NULL`- antes de que la migración llegue siquiera a borrar nada:
el script reporta la colisión como `NOTICE
__B3D_ZONAS_DUPLICADAS_JSON__:<json>` y aborta con un `duplicate key value`
sobre esa restricción. Se cura renombrando uno de los sectores en curación
municipal antes de reintentar. Un sector de baja con el mismo nombre que
uno activo, o dos de baja entre sí, no entran a este reporte porque el
índice no los alcanza.

Un `reporte` o una `intervención` vigente que cuelga directo de un sector o
una manzana bloquea el `DELETE` por `reportes_lugar_tenant_fk` o
`intervenciones_lugar_tenant_fk` -sin reparenteo automático, la manzana se
borra antes que el sector y esa es la FK que aparece primero si ambas
tienen registros colgando-. Ahí mismo entra una `calle` cuyo propio
`lugar_id` es un sector o manzana a borrar **sin sector en su cadena**: una
manzana puede colgar directo de una colonia o cabecera -`puedeContener` es
por rango, no exige un sector intermedio-, y esa calle no tiene zona
destino posible, así que `calles_rechazadas` (arriba) no la alcanza; entra
acá como `entidad: "calles"`. El script reporta todos estos registros como
`NOTICE __B3D_REGISTROS_DEPENDIENTES_JSON__:<json>` antes de intentar el
`DELETE`. Se cura reasignando el `lugar_id` de cada fila listada al
asentamiento o sector destino antes de reintentar; el script no lo hace
por la operadora.

## Comprobación posterior

Solo si `psql` terminó con código cero, conservar el log como evidencia y
comprobar que no queden filas `sector` o `manzana`. La comprobación debe
hacerse como `xula_app`, fijando el tenant dentro de la misma transacción; no
usar una conexión sin tenant ni apagar RLS:

```sh
psql "$DATABASE_URL" \
  --no-psqlrc \
  --set=ON_ERROR_STOP=on <<'SQL'
DO $$
DECLARE
  municipio record;
  restantes bigint;
BEGIN
  FOR municipio IN SELECT id, subdominio FROM ayuntamientos ORDER BY subdominio LOOP
    PERFORM set_config('app.tenant', municipio.id::text, true);
    SELECT count(*) INTO restantes
    FROM lugares
    WHERE tipo IN ('sector', 'manzana');
    IF restantes <> 0 THEN
      RAISE EXCEPTION 'Quedan % lugares sector/manzana en %', restantes, municipio.subdominio;
    END IF;
    RAISE NOTICE '%: no quedan sectores ni manzanas', municipio.subdominio;
  END LOOP;
END $$;
SQL
```

Comparar además los conteos del log: domicilios anotados y actualizados,
zonas creadas y mapeadas, pertenencias válidas insertadas, bajas anotadas y
filas borradas. Un conteo inesperado bloquea el cierre de la ventana y debe
tratarse como fallo, aunque el proceso haya terminado con código cero.

## Fallos y reversión

- Si el script falla antes de terminar el bloque `DO`, se revierte **toda**
  la transacción -todos los municipios de la corrida, no solo el que
  falló-. No ejecutar `DELETE`, `UPDATE` ni `INSERT` manuales para
  “completar” la operación.
- Si falla la captura, el control de conteos o la comprobación posterior,
  detener las escrituras y escalar al responsable de la ventana. Conservar el
  log original, la copia de seguridad y el commit ejecutado.
- Una reversión posterior al commit requiere una operación controlada y una
  nueva ventana aprobada. Los domicilios se restauran usando la bitácora
  `MIGRACION_DOMICILIO`: su `origen` tiene la forma
  `script:migrar-sectores-a-zonas:<lugar_id_anterior>`; el `UPDATE` usa
  `split_part(origen, ':', 3)::uuid`. Los lugares eliminados se reconstruyen
  exclusivamente desde la salida guardada (`lugar_id`, `tipo`, `nombre`,
  `padre_id`, `baja_en`), en orden padre-hijo; `baja_en` se repone tal cual para no reactivar un lugar que ya estaba dado de baja. La bitácora `BAJA_LUGAR` no basta para
  reconstruirlos: solo conserva el `padre_id` perdido.
- La reversión debe ejecutarse mediante un procedimiento revisado y probado,
  con conteos antes y después. No borrar zonas ni pertenencias a mano y no
  modificar la bitácora para ocultar una operación.
- Las creaciones de `zonas` y `calles_de_zonas` no forman parte del camino de
  reversión automatizado; solo se restauran domicilios y lugares.
- **Por eso una reversión no deja el municipio listo para un reintento
  normal.** Las zonas y pertenencias del run original quedan activas
  después de revertir domicilios y lugares; volver a correr el script
  intenta insertar las mismas zonas (`ayuntamiento_id`, `lugar_id`,
  `nombre`, activas) y choca contra `zonas_tenant_lugar_nombre_idx`. Antes
  de reintentar, dar de baja o borrar a mano las zonas y pertenencias de
  ese municipio creadas por el run que se revirtió -con los mismos
  conteos antes y después que pide el punto anterior- o esperar a una
  nueva ventana que las reutilice explícitamente.

La evidencia de ejecución, la lista de calles rechazadas, los conteos y la
aprobación de la ventana deben conservarse junto con el registro de cambios.
