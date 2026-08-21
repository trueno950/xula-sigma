# ADR 0002 — Búsqueda de personas tolerante a variantes

**Fecha:** 2026-08-21
**Estado:** Aceptado
**Contexto:** Fase 1a, padrón ciudadano. Se decide antes de escribir el
esquema porque la decisión define una columna, un índice y una tabla de
catálogo.

El roadmap lo plantea en una línea:

> Búsqueda tolerante a variantes de escritura. Los nombres se capturan de
> tres formas distintas ("Ma. Guadalupe", "María Guadalupe", "Maria
> Guadalupe"). Sin esto, se generan duplicados desde la primera semana.

Esa línea no dice con qué. Este documento lo mide en vez de suponerlo.

---

## 1. Decisión

Cuatro piezas, y ninguna sobra:

1. **`pg_trgm`** con `similarity()` sobre el nombre normalizado.
2. **Normalización** a minúsculas sin acentos y sin puntos, guardada en una
   columna propia que **escribe la aplicación**, no una columna generada.
3. **Diccionario cerrado de abreviaturas** (`ma`→`maria`, `gpe`→`guadalupe`,
   …) aplicado a los dos lados antes de comparar.
4. **Umbral 0.30**, que es el de fábrica de `pg_trgm`.

Se descartan `dmetaphone`, `levenshtein` y la búsqueda por prefijos.

La medición vive en `scripts/spike-busqueda-personas.sql`. Se corre entera
contra un Postgres desechable y vuelve a imprimir cada tabla de este
documento. Los números de abajo no se citan de memoria: se regeneran.

---

## 2. Qué se midió

200 personas sintéticas —nombres de pila del padrón yucateco cruzados con
apellidos mayas y castellanos— y 341 consultas repartidas en siete clases
de variante: acentos, abreviaturas, ortografía maya alterna
(`Canul`/`Kanul`, `Dzul`/`Tzul`, `Ek`/`Ec`), errores de tipeo, búsqueda
parcial, apellidos invertidos, y la combinación de abreviatura con apellido
único.

La métrica es la posición pesimista: cuántas personas empatan o superan a
la correcta. Si la estrategia no le da puntaje, la persona **no vuelve de
la consulta** y no tiene posición — que no es lo mismo que quedar segunda.

### Todas las clases

| Estrategia | Top-1 | Top-5 |
|---|---|---|
| trgm + diccionario | 95.9% | 100.0% |
| trgm | 95.9% | 100.0% |
| `word_similarity` | 94.7% | 97.7% |
| levenshtein | 85.0% | 92.7% |
| dmetaphone | 80.6% | 91.5% |
| prefijos con AND | 47.5% | 49.3% |
| igualdad normalizada | 12.6% | 12.6% |

### Top-1 por clase

| Clase | trgm+dicc | trgm | dmeta | lev | prefijos |
|---|---|---|---|---|---|
| abreviatura | 100 | 100 | 70 | 100 | 57 |
| acento | 100 | 100 | 100 | 100 | 100 |
| maya | 100 | 100 | 91 | 100 | **0** |
| orden | 100 | 100 | 100 | **7** | 100 |
| parcial | 77 | 77 | 77 | 69 | 77 |
| parcial + abreviatura | 100 | 100 | 60 | 98 | 45 |
| tipeo | 85 | 85 | 67 | **96** | **0** |

---

## 3. Por qué se descarta cada alternativa

**Prefijos con AND** —"todos los tokens que escribiste son prefijo de algún
token del nombre"— es lo que sale por defecto si nadie decide nada. Saca
**0%** en ortografía maya y **0%** en errores de tipeo. No degrada: no
encuentra. Y una búsqueda que no encuentra a la persona es exactamente el
mecanismo que genera el duplicado, porque el operador concluye que no está
y la da de alta otra vez.

**`levenshtein`** saca **7%** con los apellidos invertidos. La distancia de
edición cuenta caracteres en orden, y capturar el mismo nombre desde dos
documentos distintos intercambia paterno y materno todo el tiempo. Es la
única estrategia que le gana a trigramas en algo —96% en tipeo contra 85%—
pero pagarlo con el orden de los apellidos no es un intercambio, es una
pérdida.

**`dmetaphone`** es peor en casi todo (80.6% general) y falla justo donde
más caro sale: 91% en ortografía maya y 70% en abreviaturas. La causa no es
un parámetro mal puesto: es un algoritmo fonético construido para el
inglés. Aplicarlo a `Xool`, `Couoh` o `Tzec` es pedirle que decida sobre
sonidos que no modela.

**`word_similarity`** queda cerca (94.7%) pero pierde en `parcial`, y por
una razón mecánica: busca la mejor subcadena, así que muchos nombres largos
empatan en 1.0 y el correcto se pierde en el empate.

---

## 4. El diccionario de abreviaturas, y por qué el promedio lo esconde

Mirando solo la tabla general, el diccionario no hace nada: 95.9% con y sin
él. La conclusión fácil es que sobra. Es falsa, y el promedio es lo que la
produce.

Las consultas de esa tabla llevan el nombre completo. Con los dos apellidos
adentro, los trigramas de los apellidos alcanzan para rankear bien aunque
`Ma.` no se parezca a `Maria`. El diccionario no aporta porque el apellido
ya estaba haciendo el trabajo.

La consulta del mostrador no es esa. Es `Ma. Gpe. Kumul`: abreviado y con
un solo apellido.

| Estrategia | n | Sobre el umbral 0.3 | Score mínimo |
|---|---|---|---|
| trgm | 47 | 96% | 0.233 |
| trgm + diccionario | 47 | 100% | 0.667 |

Las dos tienen 100% de Top-1, y por eso el Top-1 no sirve acá. Lo que
cambia es que sin diccionario **el 4% queda por debajo del umbral**: esas
personas no salen mal ordenadas, no salen. El caso directo lo muestra sin
promedios de por medio — `Ma. Gpe. Kumul` contra `Maria Guadalupe Kumul
Sanchez` da **0.303 contra un umbral de 0.300**. Eso no es margen, es
casualidad. Con el diccionario da 0.733, y la distancia al segundo
candidato pasa de 0.068 a 0.248.

Es un mapeo cerrado de token a token, no una heurística: se lee, se audita
y se le agregan entradas cuando aparezca una abreviatura nueva en el padrón
real.

---

## 5. El umbral se queda en 0.30, y el diccionario es lo que lo permite

| Umbral | Devuelve a la persona | Candidatos promedio |
|---|---|---|
| 0.15 | 100.0% | 21.7 |
| 0.20 | 100.0% | 13.0 |
| 0.25 | 100.0% | 8.7 |
| **0.30** | **100.0%** | **7.4** |
| 0.35 | 99.7% | 6.6 |
| 0.40 | 99.1% | 6.3 |

0.30 es el último punto con recuperación completa. Bajarlo solo agrega
ruido; subirlo empieza a perder gente. Y el orden importa: **sin el
diccionario el mínimo observado era 0.233**, o sea que el umbral de fábrica
dejaba casos afuera. El diccionario es lo que vuelve seguro al 0.30, no un
extra sobre él.

---

## 6. Dos restricciones de implementación que la medición dejó a la vista

### `unaccent` no es `IMMUTABLE`, y mentirle al planner rompe en silencio

```
ERROR:  generation expression is not immutable
```

Postgres rechaza `GENERATED ALWAYS AS (unaccent(lower(nombre))) STORED`, y
tiene razón: `unaccent` depende de un diccionario que puede cambiar. Eso
también cierra la puerta al índice por expresión.

El atajo conocido es envolverlo en una función propia declarada `IMMUTABLE`.
No se usa. Declarar inmutable algo que no lo es no arregla el problema:
lo esconde hasta que alguien toque el diccionario, y ahí el índice queda
corrupto **sin que falle nada** — se devuelven menos filas y nadie se
entera. Es la misma familia de falla que el rol de conexión del ADR 0001
§2, y se resuelve igual: que lo sostenga algo que pueda fallar fuerte.

La columna normalizada la escribe la aplicación al insertar y al editar.
Es explícita, tiene test, y si se desincroniza el test lo dice.

### La expansión corre una vez sobre la consulta, nunca por fila

Con 250.000 filas, la misma búsqueda:

| Forma | Tiempo | Plan |
|---|---|---|
| `busqueda % expandir('Ma. Gpe. Kumul')` | 317 ms | no usa el índice trigrama |
| `busqueda % 'maria guadalupe kumul'` | 29 ms | `Bitmap Index Scan` sobre el GIN |

Once veces. La causa es que una llamada a función en el `WHERE` es opaca
para el planner y se evalúa por fila. La expansión del texto que escribió
el usuario se hace una sola vez, antes de armar la consulta, y a Postgres
le llega una constante.

---

## 7. Lo que la medición NO decide

**El 23% de `parcial` no es un defecto de la búsqueda.** `Maria Che` encaja
legítimamente con siete personas del corpus. Ninguna estrategia puede
rankear bien lo que es genuinamente ambiguo — todas sacan 77% ahí, y no por
casualidad. Eso se resuelve mostrando candidatos, y es decisión de interfaz
y de fusión de duplicados, no de algoritmo. Va al spec de Fase 1a.

---

## 8. Límites de esta medición

Se escriben porque el número solo vale con ellos al lado:

- **El corpus es sintético.** 200 nombres construidos por combinatoria, no
  un padrón real. Los apellidos y los nombres de pila son los correctos
  para Yucatán; las combinaciones no son las que existen.
- **Las variantes son generadas, no observadas.** Salen de reglas que
  escribimos nosotros. Un error de captura real puede tener una forma que
  no está acá.
- **El 4% bajo el umbral son 2 consultas de 47.** El mecanismo está
  demostrado con el caso directo (0.303 contra 0.300), pero la muestra es
  chica.
- **La tabla de 250.000 filas repite cada nombre 1.250 veces.** Sirve para
  comparar planes de ejecución y para nada más; no mide selectividad.

Cuando exista el padrón del municipio piloto, esta medición se vuelve a
correr contra nombres reales. El script está para eso.

---

## 9. Consecuencias para el esquema

- `personas` lleva una columna de búsqueda normalizada y expandida, escrita
  por la aplicación, con índice GIN `gin_trgm_ops`.
- Una tabla de catálogo para las abreviaturas, que es dato, no código.
- `pg_trgm` y `unaccent` se agregan como extensiones en la migración.
- El umbral 0.30 se fija explícitamente en la consulta, no se hereda de la
  configuración del servidor: un valor de sesión que alguien cambie en
  producción movería la búsqueda sin tocar el repositorio.

---

## Referencias

- `scripts/spike-busqueda-personas.sql` — la medición completa
- [pg_trgm](https://www.postgresql.org/docs/18/pgtrgm.html)
- [fuzzystrmatch](https://www.postgresql.org/docs/18/fuzzystrmatch.html)
- ROADMAP.md, Fase 1a — el requisito que origina la decisión
