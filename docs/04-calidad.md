# 04 — Calidad

Testing, métricas, checklists y automatización.

---

## 1. Testing

TDD estricto. El test se escribe antes que la implementación.

Con desarrollo asistido por IA esto deja de ser disciplina y pasa a ser el
mecanismo de control. El código generado siempre se ve razonable; el test
previo es la única forma de distinguir "hizo lo que pedí" de "hizo algo que
compila".

### Tipos y piso obligatorio

| Tipo | Alcance | Piso | Ubicación |
|---|---|---|---|
| Dominio | Reglas puras, sin IO | **80%** | `*.test.ts` junto al archivo |
| Aplicación | Casos de uso con puertos mockeados | **80%** | `*.test.ts` junto al archivo |
| Compartido | Todo `shared/**` menos declaraciones | **80%** (75% ramas) | junto al archivo |
| Aislamiento | Una tabla con `ayuntamiento_id` | **100%, sin excepción** | `*.isolation.test.ts` |
| Integración | Repositorios contra Postgres real | Operaciones con transacción | `*.integration.test.ts` |
| E2E | Flujos críticos y cambio de tenant | Happy path | `e2e/*.spec.ts` |

**Sobre el 80%.** El porcentaje es una reja, no el objetivo. El estándar
real es que cada camino de decisión del dominio tenga un test que lo
describa. Pero la reja existe porque una IA sin restricción salta tests, y
un número en CI es más confiable que la buena intención.

**Y la reja se provoca antes de creerle.** Durante la fase 1 el
`coverage.include` apuntaba solo a `modules/**`, que todavía no existía: CI
reportaba `0/0` y salía en verde, con el proveedor `@vitest/coverage-v8`
sin instalar. Un piso medido sobre cero archivos es el mismo defecto que
esta sección denuncia, una capa más arriba. Antes de dar un piso por bueno:
subirlo por encima del valor medido y confirmar que sale en rojo.

**Se mide sobre la suite completa**, en el job que tiene Postgres. Casi todo
`shared/` se prueba contra la base; midiendo solo `unit`, `withTenant`
daba 0% con sus tests de aislamiento pasando, y la única forma de subir el
número habría sido escribir tests unitarios que no prueban RLS. La reja
tiene que empujar hacia el test que sirve.

**Las ramas van en 75%, con la deuda anotada.** Lo que falta son las guardas
de variable de entorno que corren al importar el módulo; cubrirlas pide
reimportar con el entorno roto. Son caminos reales y el piso sube a 80 el
día que se escriban.

### Comportamiento, no implementación

```ts
// ✅ testear qué hace
describe("Folio", () => {
  it("formatea el consecutivo con seis digitos", () => {
    const folio = Folio.crear("MOT", 2026, 123);
    expect(folio.toString()).toBe("MOT-2026-000123");
  });

  it("rechaza consecutivos menores a uno", () => {
    expect(() => Folio.crear("MOT", 2026, 0)).toThrow(FolioInvalidoError);
  });
});

// ❌ testear cómo lo hace
it("llama a padStart", () => {
  const spy = vi.spyOn(String.prototype, "padStart");
  Folio.crear("MOT", 2026, 123);
  expect(spy).toHaveBeenCalled(); // no aporta nada y se rompe al refactorizar
});
```

### Nombres de test

```ts
// ✅ describen la regla
it("rechaza emitir constancia si la persona no esta en el padron")
it("no consume folio cuando la transaccion falla")
it("devuelve 404 al pedir constancia de otro ayuntamiento")

// ❌
it("funciona")
it("caso 1")
it("manejo de errores")
```

### El test de aislamiento

Obligatorio por cada tabla con `ayuntamiento_id`. Forma canónica:

```ts
describe("aislamiento: constancias", () => {
  it("no expone filas de otro ayuntamiento ni sin filtro explicito", async () => {
    const motul = await crearTenant("motul");
    const ticul = await crearTenant("ticul");

    const deMotul = await sembrarConstancia(motul);
    const deTicul = await sembrarConstancia(ticul);

    const visibles = await withTenant(motul, (tx) =>
      tx.select().from(constanciasTable) // deliberadamente sin WHERE
    );

    expect(visibles.map((c) => c.id)).toEqual([deMotul.id]);
    expect(visibles.map((c) => c.id)).not.toContain(deTicul.id);
  });
});
```

El helper es `withTenant`, de `shared/tenancy`. No hay otra forma de abrir
una consulta: el manejador de base de datos es una constante privada de ese
módulo y no se exporta.

#### El test de esquema

Además existe un test de esquema que le pregunta a Postgres —no al código—
por el estado real de la base. Vigila tres cosas:

1. Toda tabla con `ayuntamiento_id` tiene RLS **habilitado y forzado**. El
   `FORCE` no es redundante: sin él, el dueño de la tabla queda exento de
   sus propias políticas.
2. Ninguna tabla con RLS quedó sin política.
3. Ni `xula_app` ni `xula_migrator` son superusuario ni tienen
   `BYPASSRLS`. **Los dos roles, no solo el de la aplicación.** Lo que
   sostiene el `FORCE` es que el dueño tampoco esté exento; si se volviera
   superusuario, las políticas seguirían existiendo, el resto de los tests
   seguiría en verde, y el aislamiento sería decorativo.

Agregar una tabla y olvidar el aislamiento **rompe el build**.

#### Las tablas de Better Auth pasan por la misma regla

Better Auth genera su propio esquema. Las suyas no son excepción: si una
tabla suya lleva `ayuntamiento_id` —y la de usuarios la lleva, porque el
mismo email en dos municipios son dos usuarios distintos— necesita RLS y su
test de aislamiento en el mismo commit.

El test de esquema las barre automáticamente: recorre la base por columna,
no por una lista de tablas que alguien tiene que acordarse de actualizar.
Venir de una librería no exime de nada.

### Mockear lo correcto

```ts
// ✅ mockear el puerto, testear el caso de uso
const repo: ConstanciaPort = {
  guardar: vi.fn(),
  buscarPorFolio: vi.fn().mockResolvedValue(null),
};
await emitirConstancia(input, { repo });
expect(repo.guardar).toHaveBeenCalledOnce();

// ❌ mockear lo que estás testeando
const folio = { toString: () => "MOT-2026-000001" }; // ese es el sujeto del test
```

---

## 2. Métricas

| Métrica | Objetivo |
|---|---|
| Líneas por función | ≤ 30 |
| Líneas por archivo de código | ≤ 200 |
| Profundidad de anidación | ≤ 3 |
| Parámetros por función | ≤ 3 (más, va objeto) |
| Duplicación | ≤ 3% |
| Cobertura dominio, aplicación y `shared` | ≥ 80% (ramas ≥ 75%) |
| Cobertura de aislamiento | 100% de tablas con tenant |

Los números concretos existen porque una IA respeta un número. No respeta
"mantenelo chico".

---

## 3. Automatización

Todo lo que se pueda enforzar, se enforza. Lo que no, va al checklist.

| Momento | Qué corre |
|---|---|
| Al guardar | Biome (formato) |
| Pre-commit | Biome, typecheck, tests de lo tocado |
| Pre-push | Suite completa, `dependency-cruiser` |
| CI en PR | Todo lo anterior + integración + E2E + test de esquema RLS + validación de links de docs |

### Reglas duras de lint

```jsonc
{
  "noExplicitAny": "error",
  "noUnusedVariables": "error",
  "noConsoleLog": "error",
  "useImportType": "error"
}
```

### Límites de capa

`dependency-cruiser` prohíbe:

- `domain` importando cualquier cosa
- `application` importando `infrastructure` o `ui`
- `ui` importando `infrastructure`
- un módulo importando el interior de otro módulo

Violarlo rompe el build. No es una convención que se recuerda.

---

## 4. Checklist pre-commit

**Nueve de estos puntos los verifica `pnpm reglas`**, que corre en el hook de
`pre-commit` y en CI: acentos en identificadores, `withTenant`, `SET LOCAL`,
RLS de tabla nueva, secuencia para folios, assets al filesystem, capas de un
módulo, cita a línea de paquete sin versión y `PaginaDePanel` anidado sin
`migaja`. `any` también es automático,
pero lo verifica Biome (`noExplicitAny`), no `pnpm reglas` — la distinción
importa el día que alguien busque en `scripts/reglas/` la regla que lo cubre
y no la encuentre.

Además verifica dos de las métricas —líneas por archivo y parámetros por
función— por la misma razón: un patrón las decide en milisegundos. Las otras
dos (líneas por función y anidación) piden parsear TypeScript y quedan con
el revisor de IA.

Están igual en la lista porque la lista es el contrato; la diferencia es que
esos no dependen de que alguien se acuerde. Los que quedan —código
comentado, TODO sin issue, nombres vagos, anidación— piden criterio, y por
eso siguen siendo lectura.

```markdown
### Código
- [ ] Sin console.log ni restos de depuración
- [ ] Sin código comentado
- [ ] Sin TODO sin issue asociado
- [ ] Nombres descriptivos, sin `data` ni `temp`
- [ ] Anidación ≤ 3

### TypeScript
- [ ] Sin `any`
- [ ] Interfaces sin prefijo `I`
- [ ] IDs tipados, no `string` suelto
- [ ] Sin acentos ni eñes en identificadores

### Tenancy
- [ ] Todo acceso a BD pasa por `withTenant`
- [ ] `SET LOCAL`, nunca `SET`
- [ ] `ayuntamiento_id` del contexto, nunca del cliente
- [ ] Tabla nueva: RLS + test de aislamiento en este mismo commit

### Arquitectura
- [ ] `domain` no importa nada
- [ ] Sin SQL en casos de uso
- [ ] Sin imports cruzados entre módulos
- [ ] Módulo nuevo con sus cuatro capas

### Datos sensibles
- [ ] Sin texto libre donde pueda caer dato de salud o judicial
- [ ] Exportación masiva con bitácora

### Build
- [ ] `pnpm check` pasa
- [ ] `pnpm test` pasa
```

---

## 5. Checklist de code review

```markdown
### Funcionalidad
- [ ] ¿Hace lo que pide el ticket, ni más ni menos?
- [ ] ¿Casos borde cubiertos?
- [ ] ¿Errores manejados o propagados a propósito?

### Invariantes
- [ ] ¿Toca tenancy, folios, datos personales o auditoría?
- [ ] Si toca: ¿respondió el checklist de `invariantes-criticos.md`?

### Arquitectura
- [ ] ¿Capas respetadas?
- [ ] ¿La abstracción resuelve un problema real o es especulativa?
- [ ] ¿Hay duplicación evitable?

### Seguridad
- [ ] ¿Entrada validada con Zod en el borde?
- [ ] ¿Se expone algo en superficie pública? ¿Qué ve un tercero?
- [ ] ¿Secretos en variables de entorno?

### Legibilidad
- [ ] ¿Se entiende sin que el autor lo explique?
- [ ] Si no se entiende, se reescribe. No entra.
- [ ] Los comentarios pasan los cinco filtros de la sección 8

### Tests
- [ ] ¿Test escrito antes que el código?
- [ ] ¿Testea comportamiento, no implementación?
```

---

## 6. Checklist de bug

```markdown
- [ ] Test que reproduce el bug y falla
- [ ] Causa raíz entendida, no solo el síntoma
- [ ] Arreglo
- [ ] El test ahora pasa
- [ ] Sin regresión en el resto de la suite
- [ ] Si es un gotcha, documentado
```

---

## 7. Revisión del código generado

Específico para desarrollo con IA. Es la parte que más se saltea y la que
más cuesta después.

```markdown
- [ ] Leí el diff completo, no solo el resumen
- [ ] Entiendo cada línea. Si no la entiendo, no entra.
- [ ] No agregó dependencias que no pedí
- [ ] No inventó abstracciones "por si acaso"
- [ ] No dejó texto en otro idioma ni residuo de generación
- [ ] Los tests que escribió realmente fallan si rompo el código
```

El último punto merece énfasis: un test que pasa siempre no es un test.
Rompé la implementación a propósito una vez y confirmá que el test se pone
en rojo.

Y verificá que la provocación **cambió el comportamiento**, no solo el
texto. Un reemplazo que aplica a medias —o uno semánticamente neutro, como
`null ?? valor`— deja la suite en verde y se lee como "el test no sirve".
Se confirma corriendo, no leyendo el `diff`.

---

## 8. Comentarios

Un comentario no tiene CI. El día que deja de ser cierto, nada falla: sigue
ahí, afirmando con autoridad algo que ya no pasa. Un comentario podrido es
peor que ninguno, igual que un test que siempre pasa.

Por eso se escribe el que carga algo que **ningún test puede cargar**, y
solo ese.

Cinco filtros, en orden. El primero que dispara decide:

| # | Pregunta | Si es sí |
|---|---|---|
| 1 | ¿Reformula el código? | Se borra |
| 2 | ¿Describe comportamiento? | Es un test, no un comentario |
| 3 | ¿Ya está dicho en otro archivo? | Queda en uno, el resto apunta |
| 4 | ¿Trae un hecho de afuera del archivo, o documenta una ausencia? | **Se queda**, es su único hogar |
| 5 | ¿Cita una versión o línea de un paquete? | Test, o la versión al lado |

**El filtro 4 es el que justifica los comentarios largos de este repo.** El
código no puede explicar por qué una columna NO existe, ni por qué el
`unique: true` de una librería nunca llega a Postgres. Sin el comentario,
esos hechos no están en ningún lado.

De ahí que **no se recorte por porcentaje**. Podar por métrica mata primero
los largos, que son justamente los que cargan lo que no está escrito en
ninguna otra parte. Se recorta por reformulación, por duplicación y por
afirmación sin test.

### El filtro 3 tiene una forma que se repite: producción y su test

De todas las duplicaciones posibles, hay una que sale sola una y otra vez:
escribir el porqué de negocio dos veces, una en el código de producción y
otra en el comentario del test que lo prueba. Se siente correcto —el test
"explica lo que verifica"— y es exactamente el filtro 3.

Aparece porque quien escribe el test acaba de escribir la regla y todavía
la tiene fresca. La copia sale gratis en el momento y se paga después: el
día que la regla cambia, se actualiza donde vive y el test queda afirmando
la versión vieja con toda autoridad.

**El reparto, entonces:**

| Dónde | Qué lleva |
|---|---|
| Producción | El porqué: la regla de negocio, el riesgo, la decisión |
| Test | Solo lo que agrega: qué provoca, qué precondición necesita, por qué el assert tiene esa forma |

```ts
// ✗ El razonamiento completo, repetido del archivo de producción
it("SUPER_ADMIN no exporta datos de un municipio", () => {
  /**
   * Una exportación es el padrón entero de un municipio: quien opera la
   * plataforma no tiene por qué poder sacarlo, y menos sin que el
   * municipio se entere.
   */

// ✓ Apunta, y agrega lo que el test sí sabe
it("SUPER_ADMIN no exporta datos de un municipio", () => {
  // Por qué la plataforma queda afuera, en `puedeExportar`. Este test
  // existe porque es el permiso que más tentación da de ampliar.
```

Un comentario de test que se puede borrar sin perder nada que no esté en
producción, se borra.

### Y otra forma más: el código y el documento de estándares

Cuando una política ya está escrita en un documento de `docs/`, el
comentario que la repite en el código es el filtro 3 con otro disfraz. Se
pasa por alto porque las dos copias se sienten de distinta especie —una es
"la norma", la otra "el porqué de esta línea"— y son el mismo texto.

**El documento es el hogar.** No por autoridad: porque una política se
suele enforzar desde más de un archivo. El piso de contraste vive en
`contraste.ts` y la lista blanca que lo hace medible en `marca.ts`; poner
el hogar en uno de los dos deja al otro apuntando de costado a un archivo
de implementación, que es peor que los dos apuntando al estándar.

| Dónde | Qué lleva |
|---|---|
| Documento | La política y su porqué: qué se exige, en qué casos, contra qué evidencia |
| Código | El puntero al documento, más lo que solo se ve desde acá: qué acepta este regex, qué pasa si el valor no se puede medir |

```ts
// ✗ La política entera, repetida encima de la constante
/**
 * WCAG 2 AA para texto normal. Se toma 4.5 y no el 3.0 de texto grande
 * porque `--primary` no pinta solo botones: pinta enlaces y foco.
 */
export const CONTRASTE_MINIMO = 4.5;

// ✓ Apunta
/** El piso y por qué es ese: `docs/06-frontend.md` sección 6. */
export const CONTRASTE_MINIMO = 4.5;
```

Que el documento tampoco tenga CI no es contraargumento. Una copia que
puede podrirse es mejor que tres que divergen sin que nadie se entere: eso
es el filtro 3 entero, y no cambia porque una de las copias esté en
Markdown.

### Ejemplos

Reformula (filtro 1) — se borra:

```ts
// Nulo mientras la persona sigue en el ayuntamiento.
bajaEn: timestamp({ withTimezone: true }),
```

Afirma comportamiento (filtro 2) — es un test:

```ts
// Es un 404, no un 403: confirmar que existe ya seria informacion.
throw new TenantNoResueltoError(...);
```

Único hogar (filtro 4) — se queda, midan lo que midan:

```ts
// El GUC no vuelve a NULL tras el COMMIT: vuelve a CADENA VACIA, y
// `''::uuid` lanza. Verificado contra Postgres 18. Sin el NULLIF, toda
// consulta por una conexion del pool ya usada revienta al evaluar la
// politica.
```

---

## 9. El ciclo de revisión

GGA revisa, la IA corrige, GGA vuelve a revisar. Ese ciclo no tiene freno
propio: cada vuelta re-manda el diff completo al revisor y trae el veredicto
entero de vuelta. Un PR de 900 líneas revisado diez veces son diez PRs
pagados en cada dirección, y la mayoría de esas vueltas no encontraron nada
que no se supiera en la primera.

El cambio `auth-rbac` lo pagó. Lo que se aprendió ahí:

### Dónde corre el revisor

Desde el 2026-08-28, en CI y nada más. Corría además en `pre-commit` y en
`pre-push`, y ese `pre-push` ejecutaba **el mismo comando que CI**: dos tiros
del mismo dado sobre el mismo diff, que por eso mismo no coincidían. La
decisión, los números que la forzaron y lo que se pierde con ella están en
ADR 0001 §7; acá no se repiten.

Lo que sí cambia para quien escribe: `pnpm reglas` da la señal determinista
en cada commit, y `pnpm revision` corre el revisor de IA a demanda cuando el
PR es grande y conviene verlo antes de empujar.

### Dos rondas, y la segunda no corrige

- **Ronda 1** — se corrige todo lo que el veredicto marcó.
- **Ronda 2** — confirma. Si sale limpia, se commitea.
- **Si la ronda 2 trae un hallazgo nuevo, se para.** No se corrige de
  corrido.

Un hallazgo que aparece recién después de un fix es sospechoso: el revisor
ve un diff distinto al de la ronda anterior y puede estar persiguiéndose la
cola. Puede ser real —un fix que rompió otra cosa— pero eso se decide
leyendo, no encadenando otra vuelta. La tercera ronda se autoriza a mano.

### Un hallazgo sobre un archivo ausente se verifica antes de tocar nada

`gga run --pr-mode` compara contra `PR_BASE_BRANCH`. En una rama apilada
sobre otra rama sin mergear, el revisor no ve los archivos que llegaron en
un commit anterior de la misma rama: los lee como inexistentes y marca su
ausencia.

Pasó en el PR 2 de `auth-rbac`. El veredicto reportó **tres veces** que
`cuentas` y `verificaciones` no tenían `*.isolation.test.ts`. Los dos
archivos existían, commiteados en la misma rama. Tres rondas completas
gastadas en un problema que no existía.

Antes de corregir un hallazgo de la forma "falta X", se busca X en el repo.
Si está, el hallazgo se descarta y se anota — no se "arregla" duplicando lo
que ya estaba.

### Cuatro hallazgos del mismo tipo son una regla ausente, no cuatro fixes

Corregirlos de a uno con una revisión completa en el medio es la parte cara,
y encima no evita el quinto. Cuando el patrón se repite, el arreglo es la
regla —en `AGENTS.md`, en el linter o en un test— y una sola ronda que la
verifique entera.

### Mergear seguido, no apilar

Cinco PRs apilados sobre `feat/auth-esquema` sin mergear tuvieron dos
costos: CI solo corre en `pull_request` y `push` a `main`, así que no se
ejecutó ni una vez en los cinco —los defectos salieron todos juntos al
final— y `--pr-mode` empezó a dar los falsos positivos de arriba.

Un PR, un merge. La rama base limpia es lo que hace confiable al revisor.
