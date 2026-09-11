# Investigación: mapa operativo territorial

> `gentle-ai.sdd-research/v1`

## Revision

`2`

## Historial de revisiones

- **Revisión `1`** — outcome `blocked`. Grants observados exactos:
  `documentation: []`, `open-web: []`. Admisión denegada; sin reclamos de
  fuente. (Registro preservado; ver historial del repositorio para el texto
  completo de la revisión `1`.)
- **Revisión `2`** (retry solicitado por el orquestador) — outcome `blocked`.
  El orquestador declaró un sobre de capacidad con cinco URLs de
  `documentation`, pero los grants de evidencia del runtime siguen vacíos
  (`documentation: []`, `open-web: []`) y no existe en el runtime un mecanismo
  que recupere el contenido de esas URLs. Admisión denegada; sin reclamos de
  fuente.

## Outcome

`blocked`

## Preguntas de investigación (clases de fuente solicitadas)

1. Next.js 16 App Router: frescura de datos y patrones de revalidación
   aplicables a un diseño de refresh o polling de baja frecuencia.
2. Leaflet / React-Leaflet: ciclo de vida y consideraciones del contenedor
   del mapa para una isla cliente embebida en una página server-rendered.
3. OpenStreetMap: requisitos de uso de tiles y atribución, coherentes con el
   precedente cartográfico existente (selector de ubicación de calle).
4. Guía oficial que permita distinguir polling de push sin afirmar garantías
   no respaldadas (p. ej. "tiempo real").

## Sobre de capacidad del retry (revisión 2)

El orquestador entregó el siguiente sobre como
`gentle-ai.sdd-research-capability/v1`:

- `documentation`: cinco URLs declaradas:
  - `https://nextjs.org/docs/app/api-reference/functions/revalidatePath`
  - `https://nextjs.org/docs/app/getting-started/caching-and-revalidating`
  - `https://leafletjs.com/reference.html#map`
  - `https://react-leaflet.js.org/docs/api-map/`
  - `https://operations.osmfoundation.org/policies/tiles/`
- `open-web`: `[]`

## Verificación de grants en el runtime

- Grants de evidencia del runtime: `documentation: []`, `open-web: []`.
- Mecanismo de recuperación para la clase `documentation`: **ninguno**. La
  herramienta de lectura opera solo sobre el filesystem local (una URL se
  resuelve como ruta local y falla); no hay recursos ni plantillas MCP que
  expongan documentación; no hay herramienta de web/fetch en el runtime.
- Resultado: **denegada**. Una lista de URLs en el sobre del orquestador no
  constituye un grant materializado: sin grant de runtime ni herramienta que
  recupere el contenido, las URLs declaradas no producen evidencia auditable.

No se infirió capacidad de evidencia a partir de Bash, MCP genérico, acceso a
persistencia, nombres de archivo, memoria del modelo ni herramientas heredadas
sin nombre, según exige la regla dura del contrato de investigación. Las
herramientas de persistencia no son grants de evidencia.

## Fuentes

Ninguna. La denegación de admisión no produce reclamos de fuente.

## Reclamos validados

Ninguno. Un resultado `blocked` excluye reclamos no validados.

## Contradicciones, incertidumbre y frescura

No aplica: sin fuentes admitidas no hay contradicciones, incertidumbre ni
frescura que registrar. La limitación se registra aquí en lugar de completar
el vacío desde memoria del modelo.

## Elecciones de producto (separadas y no autoritativas)

Las decisiones de producto pertenecen al orquestador y no derivan de esta
investigación, porque no se admitió evidencia alguna. La recomendación de la
exploración (`exploration.md`, enfoque 1: mapa operativo interno de reportes
existentes por punto de calle, con refresh explícito y polling opcional de
baja frecuencia) es producto de la exploración, no evidencia de investigación
admitida.

## Limitaciones registradas

| Clase de fuente solicitada | Grant de runtime | Resultado |
|---|---|---|
| Next.js 16 revalidation / polling | `documentation` vacío | No admitida — sin reclamo |
| Leaflet / React-Leaflet lifecycle | `documentation` vacío | No admitida — sin reclamo |
| OSM tile / atribución | `documentation` vacío | No admitida — sin reclamo |
| polling vs push | `open-web` vacío | No admitida — sin reclamo |

## Consecuencia

La investigación no está completa. La propuesta no es admisible hasta que la
investigación quede `done` (o se deseleccione el carril) y las decisiones de
producto queden confirmadas. Recuperación: materializar en el runtime grants
de evidencia reales con un mecanismo de recuperación (no solo URLs declaradas
en el sobre) y re-ejecutar la investigación, o re-abrir la selección de carril
en el orquestador.
