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
| Aislamiento | Una tabla con `ayuntamiento_id` | **100%, sin excepción** | `*.isolation.test.ts` |
| Integración | Repositorios contra Postgres real | Operaciones con transacción | `*.integration.test.ts` |
| E2E | Flujos críticos y cambio de tenant | Happy path | `e2e/*.spec.ts` |

**Sobre el 80%.** El porcentaje es una reja, no el objetivo. El estándar
real es que cada camino de decisión del dominio tenga un test que lo
describa. Pero la reja existe porque una IA sin restricción salta tests, y
un número en CI es más confiable que la buena intención.

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

    const visibles = await conTenant(motul, (tx) =>
      tx.select().from(constanciasTable) // deliberadamente sin WHERE
    );

    expect(visibles.map((c) => c.id)).toEqual([deMotul.id]);
    expect(visibles.map((c) => c.id)).not.toContain(deTicul.id);
  });
});
```

Además existe un test de esquema que recorre la base y falla si encuentra
una tabla con `ayuntamiento_id` sin política RLS activa. Agregar una tabla
y olvidar el aislamiento **rompe el build**.

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
| Líneas por archivo | ≤ 200 |
| Profundidad de anidación | ≤ 3 |
| Parámetros por función | ≤ 3 (más, va objeto) |
| Duplicación | ≤ 3% |
| Cobertura dominio y aplicación | ≥ 80% |
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
