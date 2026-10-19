# XULA SIGMA — Estándares de Desarrollo

**Sistema Integral de Gestión Municipal y Administración**

Documentación modular para consulta por área de trabajo. Cada documento se
lee cuando el trabajo lo toca, no de corrido.

## Índice

| # | Documento | ¿Cuándo consultarlo? |
|---|---|---|
| **Producto** | | |
| — | [Roadmap](../ROADMAP.md) | Alcance, fases, qué NO construimos |
| — | [PRODUCT.md](../PRODUCT.md) | Quién usa el sistema, roles, contexto real de uso |
| — | [DESIGN.md](../DESIGN.md) | Sistema de diseño: colores, tipografía, componentes, patrones de pantalla |
| — | [CLAUDE.md](../CLAUDE.md) | Reglas operativas para sesiones con IA |
| **Estándares** | | |
| 01 | [Principios](./01-principios.md) | SOLID, KISS, YAGNI, regla de oro |
| 02 | [Nomenclatura](./02-nomenclatura.md) | Nombres, idioma del código, commits |
| 03 | [Antipatrones](./03-antipatrones.md) | Qué no hacer y cómo se corrige |
| 04 | [Calidad](./04-calidad.md) | Testing, métricas, checklists, comentarios |
| 05 | [Seguridad](./05-seguridad.md) | Aislamiento, auth, datos personales |
| 06 | [Frontend](./06-frontend.md) | RSC, estado, marca blanca, formularios, PDF |
| **Arquitectura** | | |
| 07 | [Estructura y Stack](./architecture/estructura.md) | Árbol general, capas, herramientas, git |
| 08 | [Invariantes Críticos](./architecture/invariantes-criticos.md) | Contratos que no pueden romperse |
| 09 | [Template de Módulo](./architecture/module-template.md) | Crear un módulo nuevo |
| 10 | [Mapa de construcción](./architecture/xula-construccion.lifecycle.html) | El mapa de construcción del producto, del estado actual al siguiente corte |
| **Decisiones** | | |
| ADR 0001 | [Decisiones técnicas de Fase 0](./adr/0001-decisiones-tecnicas-fase-0.md) | Auth, migraciones, errores, Server Actions, logging, fecha y hora, hooks |
| ADR 0002 | [Búsqueda de personas tolerante a variantes](./adr/0002-busqueda-de-personas.md) | Trigramas, diccionario de abreviaturas, umbral, columna normalizada |

Los links de este índice se validan en CI. Un link roto rompe el build.

---

## Referencia rápida

```text
┌─────────────────────────────────────────────────────────────────┐
│                LAS 12 REGLAS QUE NADIE ROMPE                    │
├─────────────────────────────────────────────────────────────────┤
│  1. any = muerte. unknown + type guard.                         │
│  2. BD solo por withTenant: 4 excepciones en AGENTS.md.         │
│  3. SET LOCAL dentro de transacción. Nunca SET suelto.          │
│  4. ayuntamiento_id del contexto del servidor, nunca del cliente│
│  5. Tabla nueva = RLS + test de aislamiento, mismo commit       │
│  6. domain no importa nada. Ni Drizzle, ni Next, ni React.      │
│  7. Folio consecutivo por ayuntamiento, con lock en transacción │
│  8. Recurso de otro tenant devuelve 404, nunca 403              │
│  9. Dato sensible = categoría cerrada. Jamás texto libre.       │
│ 10. Assets a object storage. El filesystem es efímero.          │
│ 11. El test se escribe antes que el código                      │
│ 12. El diff se lee completo antes de aceptar                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Por dónde empezar

| Si vas a... | Leé |
|---|---|
| Entender el proyecto por primera vez | 07, después 01 |
| Crear un módulo nuevo | 09, después 02 |
| Escribir UI, un formulario o una tabla | 06 |
| Elegir un icono | 06 sección 7 |
| Tocar marca blanca o generar un PDF | 06 secciones 6 y 9 |
| Tocar base de datos | 08 sección 1, después 05 sección 1 |
| Agregar una tabla | 08 completo |
| Exponer algo al público | 05 y 08 sección 2 |
| Escribir tests | 04 |
| Revisar un PR | 04 sección 5 |
| Discutir una decisión de diseño | 01 |

---

## Nota de mantenimiento

Este proyecto se desarrolla con asistencia de IA. Esta documentación se
degrada de una forma específica y predecible: el índice apunta a archivos
que se movieron, los contadores de las listas dejan de coincidir con sus
títulos, y se cuelan residuos de generación que nadie leyó.

No es hipotético. Son las tres fallas exactas que encontramos auditando el
proyecto anterior del que se portaron estos documentos.

Por eso:

- Los links del índice se validan en CI
- Si agregás una regla a la referencia rápida, actualizá el número del
  título
- Si tocás un documento, leé el diff completo antes de aceptarlo

La regla 12 aplica también a la documentación.
