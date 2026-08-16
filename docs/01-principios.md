# 01 — Principios de Diseño

Principios que guían las decisiones. Cuando dos opciones parecen
equivalentes, gana la que respeta más de estos.

---

## SOLID

| Letra | Principio | En este proyecto |
|-------|-----------|------------------|
| **S** | Single Responsibility | Un caso de uso por archivo. Una entidad, un concepto. |
| **O** | Open/Closed | Módulo nuevo antes que `if` nuevo en un módulo existente |
| **L** | Liskov Substitution | Un repositorio real y uno mock son intercambiables sin que el caso de uso lo note |
| **I** | Interface Segregation | Puertos chicos y específicos. `PersonaLookupPort`, no `PadronPort` con veinte métodos. |
| **D** | Dependency Inversion | `application` depende de puertos; `infrastructure` los implementa |

La D es la que sostiene la arquitectura. Todo lo demás es consecuencia.

---

## Principios universales

### DRY — Don't Repeat Yourself

Si copiás y pegás dos veces, abstraé. Pero **la duplicación es más barata
que la abstracción equivocada**: dos cosas que hoy se parecen y mañana
divergen no eran la misma cosa.

Regla práctica: duplicá la primera vez, aguantá la segunda, abstraé la
tercera.

### KISS — Keep It Simple

Si no lo entendés en 30 segundos, está mal diseñado.

Y con desarrollo asistido por IA esto se vuelve crítico: la IA genera
código sofisticado sin esfuerzo. Que sea fácil de generar no significa que
sea fácil de mantener. **El costo no está en escribirlo, está en
entenderlo a las tres de la mañana cuando un municipio no puede emitir
constancias.**

### SoC — Separation of Concerns

```text
UI ≠ lógica de negocio ≠ acceso a datos
```

Está enforzado por `dependency-cruiser`. No es una recomendación.

### YAGNI — You Aren't Gonna Need It

No escribir código "por si acaso".

```ts
// ❌ INCORRECTO
async function buscarPersona(id: PersonaId) {
  // ¿y si después necesitamos caché? mejor lo dejo listo
  const enCache = await cache.get(id);
  if (enCache) return enCache;
  const persona = await repo.buscarPorId(id);
  await cache.set(id, persona);
  return persona;
}

// ✅ CORRECTO
async function buscarPersona(id: PersonaId) {
  return repo.buscarPorId(id);
}
```

Esto aplica doble al roadmap: el alcance de cada fase es lo que dice el
roadmap, no lo que se ocurra en el camino.

### LoD — Ley de Demeter

Un módulo conoce solo a sus aliados inmediatos.

```ts
// ❌ INCORRECTO
const municipio = persona.getDomicilio().getColonia().getMunicipio().getNombre();

// ✅ CORRECTO
const municipio = persona.domicilio.municipio;
```

---

## Principios propios del proyecto

### Aislamiento primero

Ante cualquier duda de diseño que toque datos, gana la opción más
restrictiva. Un municipio que ve datos de otro es un evento del que el
negocio no se recupera.

Ver `architecture/invariantes-criticos.md`.

### Enforzar antes que documentar

Una regla escrita en un markdown se olvida. Una regla que rompe el build,
no.

Cuando definas una convención, la pregunta inmediata es: **¿se puede
automatizar?** Si se puede, se automatiza. Si no se puede, va al checklist
de PR. Si tampoco entra ahí, probablemente no es una regla — es una
preferencia.

### El test es la especificación

Con IA generando código, el test es cómo distinguís "hizo lo que pedí" de
"hizo algo que compila". Sin test previo no hay forma de saberlo, porque el
código generado siempre se ve razonable.

### Servidor primero

Server Components por defecto. `"use client"` es una decisión que se
justifica, no el punto de partida. Menos JavaScript enviado es menos tiempo
de carga en las redes móviles rurales donde va a correr esto.

---

## Regla de oro

```text
┌──────────────────────────────────────────────────────────────┐
│  La arquitectura existe para RESOLVER problemas,             │
│  no para crear trabajo extra. Si agregar una capa no         │
│  resuelve un problema real, no la agregues.                  │
└──────────────────────────────────────────────────────────────┘
```

### Aplicación

| Situación | Pregunta que decide |
|-----------|---------------------|
| "¿Agregamos una abstracción?" | ¿Hay más de dos implementaciones reales hoy? |
| "¿Aplicamos el patrón X?" | ¿Resuelve un problema que ya tenemos, o uno que imaginamos? |
| "¿Refactorizamos esto?" | ¿La deuda está frenando el trabajo actual? |
| "¿Agregamos esta librería?" | ¿Cuánto código propio ahorra, y qué costo de mantenimiento suma? |

La única excepción a esta regla es el aislamiento entre tenants. Ahí sí se
agregan capas de más, a propósito, porque el modo de falla no admite
segundas oportunidades.
