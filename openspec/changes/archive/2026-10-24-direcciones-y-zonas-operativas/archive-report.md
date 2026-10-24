# Informe de archivo

Archivado el 2026-10-24 por decisión del dueño del proyecto, junto con el
cierre de B3u en el PR #100.

## Del tas fusionados

| Capacidad | Operación | Requisitos antes → después | Escenarios |
|---|---|---|---|
| `domicilios` | 2 renombres, 1 modificación, 2 agregados | 9 → 11 | 20 |
| `jerarquia-territorial` | 2 modificaciones | 20 → 20 | 45 |
| `zonas-operativas` | capacidad nueva | — → 5 | 11 |

Los dos renombres de `domicilios` dejan el nombre viejo ausente del canónico
(`Direccion compuesta cuelga del nivel conocido mas profundo` y
`Consulta por zona y por calle`), verificado literalmente. Ningún requisito
canónico preexistente se perdió: el delta no declara ninguno como REMOVED.

## Cambio de alcance registrado

`B3d-REFACTOR-06` se cierra con la evidencia del entorno disponible -ensayo
en copia desechable y corrida sobre `xula_dev`, con respaldo, idempotencia y
`pnpm reglas`- porque no existe ningún municipio con datos reales. La corrida
sobre datos reales **no se elimina**: queda como precondición de despliegue
del `CHECK` de `drizzle/0020` en el municipio piloto, escrita en la Fase 7 de
`tasks.md`, y como tarea T7 del documento ODD
`odd/tasks/cierre-direcciones-y-zonas.md`.

`B2-RED-01` y `B2-RED-02` se cierran declarando que su cronología RED no es
acreditable: el escritor que debía producirlos se interrumpió y escribir tests
nuevos hoy no reconstruye esa historia. Lo verificado es el comportamiento
-suite, E2E y differential-, no el orden en que se escribieron.

## Lo que este archivo no dice

No afirma que se migraron datos municipales reales, ni que se observó el RED
original de B2. Esas dos cosas siguen siendo ciertas donde siempre estuvieron:
en el piloto y en la evidencia de la Fase 7.
