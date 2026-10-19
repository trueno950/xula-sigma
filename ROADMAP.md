# Roadmap — XULA SIGMA

**Sistema Integral de Gestión Municipal y Administración**

**Estado:** fases 0 a 3 construidas; falta el piloto de constancias y las
fases 4 a 7 no empezaron. El avance vive en cada fase, no en esta línea.
**Última actualización:** 2026-10-19

---

## 1. Qué es este producto

Herramienta de apoyo administrativo para ayuntamientos pequeños de Yucatán
(< 5,000 habitantes). Digitaliza los trámites y la operación interna del
palacio municipal.

**Modelo:** SaaS multi-tenant. Un solo despliegue, una sola base de datos,
múltiples ayuntamientos aislados por `ayuntamiento_id` + RLS. Cada municipio
personaliza escudo, logotipo y colores sin cambios de código.

**Stack:** Next.js (App Router) + PostgreSQL + Cloudflare R2 (assets).
Despliegue inicial en Railway.

---

## 2. Qué NO es este producto

Este límite es deliberado y define el alcance. Todo lo siguiente queda fuera:

| Fuera de alcance | Razón |
|---|---|
| Cobro de predial, agua, derechos | Dispara CFDI, PAC y timbrado fiscal |
| Contabilidad gubernamental | Obliga a armonización CONAC / clasificador CRI |
| Reportes para auditoría (ASEY) | Requiere cumplimiento normativo formal |
| Portal de transparencia | Dispara obligaciones del art. 70 LGTAIP |
| Nómina | Materia laboral y fiscal |
| Actuación jurisdiccional del juzgado | Plazos, sanciones y detenciones tienen efecto jurídico |

El módulo del juzgado (Fase 7) es índice y respaldo del libro físico. No
calcula plazos, no registra detenciones y no sustituye el libro oficial.

El portal público se comercializa como **"noticias y avisos"**, nunca como
"portal de transparencia". El cambio de nombre evita asumir obligaciones
legales que no están contempladas en el precio.

Si en el futuro se decide entrar a cobros, es un producto distinto con su
propio análisis regulatorio. No se cruza esa línea por conveniencia.

---

## 3. Lógica de la secuencia

El orden no es por dificultad técnica ni por valor aislado de cada módulo.
Responde a tres criterios, en este orden de prioridad:

1. **Dependencia de datos.** Todos los módulos apuntan a la misma entidad:
   la persona. El padrón ciudadano se construye primero porque el resto
   cuelga de él.
2. **Resistencia interna.** Los módulos que reducen discrecionalidad
   (gasolina) generan sabotaje pasivo de los usuarios que los operan. Se
   difieren hasta que el sistema ya sea indispensable por otra vía.
3. **Riesgo legal.** Los módulos con datos personales sensibles (apoyos
   sociales, traslados) requieren infraestructura de privacidad previa.

---

## 4. Fases

### Fase 0 — Fundación multi-tenant
**Estado:** cerrada: CI de cuatro jobs, 19 migraciones y RLS probada por tabla.
**Estimado:** 3–4 semanas
**Vendible:** No. Es infraestructura.

Sin esto no funciona nada. No se puede recortar.

#### Bloqueantes: verificar antes de escribir código

Dos cosas se confirman antes de empezar, porque cambian el diseño:

1. **Roles separados de Postgres en Railway.** Railway entrega un
   superusuario por defecto. Hay que poder crear un rol de aplicación que
   **no** sea owner de las tablas y **no** tenga `BYPASSRLS`, y un rol
   distinto para migraciones.

   **Por qué bloquea:** si la aplicación se conecta con el superusuario,
   RLS no hace absolutamente nada — y todo funciona bien en desarrollo, en
   los tests y en el piloto de un solo municipio. La falla aparece con el
   segundo cliente, en producción, sin ningún síntoma previo. Es el modo de
   falla más peligroso del proyecto porque es silencioso.

2. **Wildcard DNS en dominio propio.** Confirmar que Railway acepta
   `*.xulasigma.mx` apuntando a un solo despliegue.

   **Si no lo soporta:** el fallback es un dominio único
   (`app.xulasigma.mx`) resolviendo el tenant desde el JWT. Funciona igual
   pero cambia el proxy de resolución, que es de lo primero que se
   construye.

#### Alcance

- Resolución de tenant por subdominio en `proxy.ts` (Next 16 renombró
  `middleware.ts` a `proxy.ts`; misma firma y mismo `config.matcher`)
- Aislamiento con RLS. Requisitos no negociables:
  - `FORCE ROW LEVEL SECURITY` en todas las tablas operativas
  - Rol de aplicación sin `BYPASSRLS` y que no sea owner de las tablas
  - `SET LOCAL` dentro de transacción, nunca `SET` — el pooler filtra
    la variable de sesión entre requests de distintos tenants
- Autenticación y RBAC: SuperAdmin, Admin Municipal, Operador, Consulta
- Motor de marca blanca: escudo, logotipo y paleta por ayuntamiento
  - Assets en R2, no en el filesystem del contenedor (es efímero)
  - Variables CSS inyectadas en servidor, antes de enviar el HTML
- Bitácora de auditoría transversal (quién, qué, cuándo, desde dónde)
- **Exportación completa por ayuntamiento** en formato abierto. Ver más
  abajo.
- **Respaldos con restauración probada.** Ver más abajo.
- **Tenant de demostración** con datos realistas. Sirve doble: para
  mostrarle el sistema a un tesorero y como fixture de los tests E2E. Se
  construye ahora, no la noche anterior a la visita.
- Despliegue en Railway

#### Exportación por ayuntamiento

Se diseña desde el inicio, no se agrega después.

Cuando cambia la administración y no renuevan, el municipio necesita su
información — y probablemente esté obligado a conservarla por normativa de
archivo. Si no se puede entregar limpia, sus datos quedan secuestrados. En
un estado donde los alcaldes de municipios vecinos se hablan, eso cierra
puertas que uno nunca se entera que se cerraron.

Cada módulo agrega su porción al exportador conforme se construye.

Y de paso es argumento de venta: *"tus datos son tuyos y te los llevás
cuando quieras"* baja la resistencia a firmar.

#### Respaldos

**Hay que restaurar uno antes de salir a producción.** Un respaldo que
nunca se restauró no es un respaldo, es una suposición.

Además del respaldo administrado de Railway, se mantiene un volcado propio
fuera de la plataforma. Estamos guardando el único registro de qué
documentos emitió un ayuntamiento.

#### Riesgo principal

El aislamiento entre tenants. Una fuga de datos de un municipio a otro es
un evento del que el negocio no se recupera. Esta fase lleva pruebas de
aislamiento explícitas antes de avanzar. Ver
`docs/architecture/invariantes-criticos.md`.

---

### Fase 1 — Padrón ciudadano y capa territorial
**Estado:** completa: padrón, capa territorial, calles con coordenadas, domicilios y mapa operativo.
**Estimado:** 2–3 semanas
**Vendible:** No por sí solo. Son las dos columnas vertebrales.

El sistema se sostiene sobre dos ejes, no uno. Todo módulo posterior
apunta a una persona, a un lugar, o a ambos.

#### 1.a Padrón ciudadano
Registro único de personas del municipio. Es lo que convierte módulos
sueltos en un sistema: el secretario abre a una persona y ve todo su
historial con el ayuntamiento.

- Alta, edición y búsqueda de personas
- Búsqueda tolerante a variantes de escritura. Los nombres se capturan de
  tres formas distintas ("Ma. Guadalupe", "María Guadalupe", "Maria
  Guadalupe"). Sin esto, se generan duplicados desde la primera semana.
- CURP como identificador **opcional**, no obligatorio
- Detección y fusión de duplicados
- Vista de historial por persona (se va poblando con cada fase posterior)

#### 1.b Capa territorial
Los módulos de campaña (descacharrización, fumigación) no operan por
persona sino por zona. Sin esta capa no se pueden construir.

- Jerarquía territorial: comisarías, colonias, sectores, manzanas, calles
- Domicilios como entidad propia, ligados a la jerarquía
- Un domicilio puede tener varias personas; una persona puede cambiar de
  domicilio conservando su historial

**El domicilio es lo que une las dos columnas.** Habilita, además de las
campañas: ubicación de reportes ciudadanos, certificación de vecindad para
constancias, y entrega domiciliaria de apoyos.

---

### Fase 2 — Constancias y oficios ⭐
**Estado:** implementada; falta el piloto físico con un ayuntamiento real.
**Estimado:** 3–4 semanas
**Vendible:** Sí. Este es el punto de primer ingreso.

Es el trámite más frecuente y visible del ayuntamiento. Dolor claro, cero
política interna, demo de cinco minutos.

- Plantillas configurables por ayuntamiento (constancia de vecindad,
  constancia de ingresos, cartas, oficios)
- Emisión con folio consecutivo **por ayuntamiento** (no folio global
  compartido entre tenants)
- Generación de PDF en hoja carta, impresora común
- Código QR de validación en cada documento
- Página pública de validación de folio
- Registro histórico de todo lo emitido, con reimpresión y marca de
  reimpresión

**Insumo requerido antes de empezar:** una constancia real emitida por el
municipio piloto. El formato, encabezado, leyenda y ubicación del sello no
se inventan.

**Hito de negocio:** al cerrar esta fase existe un producto cobrable.

---

### Fase 3 — Reportes ciudadanos
**Estado:** implementada: reportes, intervenciones y áreas.
**Estimado:** 2–3 semanas
**Vendible:** Sí, como plan superior.

- Registro de incidencias (baches, alumbrado, fugas, basura, parques)
- Clasificación por dirección o área responsable
- Flujo de estados y asignación
- Vínculo con el padrón: quién reportó, historial del reporte
- Consulta pública de folio de reporte

Notificación por WhatsApp queda como evaluación posterior: la API de
WhatsApp Business tiene costo por conversación y requiere número y
verificación propios del ayuntamiento. No se promete en la venta hasta
tener el costo real medido.

---

### Fase 4 — Apoyos sociales
**Estado:** no iniciada.
**Estimado:** 3–4 semanas
**Vendible:** Sí.
**Prerrequisito bloqueante:** infraestructura de privacidad completa.

Control de quién recibió qué apoyo y cuándo. Alto valor operativo y alto
riesgo.

#### 4.a Apoyos generales
- Padrón de beneficiarios ligado al padrón ciudadano
- Catálogo de programas y apoyos
- Registro de entregas con evidencia
- Consulta de historial por persona y por programa

#### 4.b Apoyos de traslado
Submódulo propio. En municipios pequeños de Yucatán es de los apoyos de
mayor volumen: traslados a Mérida por atención médica, tratamientos
recurrentes, estudios, gestiones. Llega como solicitud directa al
presidente o al DIF municipal y hoy se resuelve sin registro.

- Solicitud de apoyo de traslado ligada a la persona del padrón
- Tipo de apoyo otorgado: unidad municipal, pago de pasaje, combustible
- Destino, fecha y acompañantes
- Autorización: quién aprobó y bajo qué criterio
- Costo estimado del apoyo, para acumulado por persona y por periodo
- Detección de recurrencia: una persona con tratamiento continuo
  (por ejemplo, diálisis) genera traslados repetidos y predecibles. El
  sistema debe mostrarlo como patrón, no como eventos sueltos.
- Enlace al viaje operativo de Fase 5 cuando se usa unidad municipal

**Dato sensible:** el motivo del traslado suele revelar condición de salud.
Se captura como categoría cerrada (`Salud`, `Educación`, `Trámite`,
`Defunción`, `Otro`), nunca como texto libre con diagnóstico. El detalle
clínico no se almacena.

#### 4.c Transversal
- Consulta de historial completo por persona, atravesando 4.a y 4.b

**Antes de escribir código de esta fase:**
- Aviso de privacidad del ayuntamiento redactado
- Contrato de encargo del tratamiento firmado (el ayuntamiento es sujeto
  obligado; el proveedor es encargado del tratamiento)
- Bitácora de accesos a nivel registro, no solo a nivel sesión
- Exportación masiva restringida y auditada

**Riesgo político:** un padrón de apoyos es una herramienta electoral
potencial. En caso de denuncia por uso electoral, esta base de datos es la
evidencia. El diseño debe asumirlo.

---

### Fase 5 — Operación interna
**Estado:** no iniciada.
**Estimado:** 3–4 semanas
**Vendible:** Sí, como plan superior.

- **Cierre de calles y permisos** — bajo riesgo, empezar por aquí
- **Viajes y flotilla** — la cara operativa del traslado, no la del
  beneficiario. El apoyo al ciudadano vive en la Fase 4.b; aquí vive la
  unidad que lo ejecuta.
  - Registro de vehículos y choferes
  - Bitácora de viajes: unidad, chofer, kilometraje, destino
  - Un viaje puede originarse en un apoyo de traslado (4.b) o ser
    operación propia del ayuntamiento
  - El costo del viaje alimenta el acumulado del apoyo en 4.b
- **Control de combustible** — vales, vehículos, consumo por unidad.
  **Va al final por decisión explícita.** Es el módulo que más reduce
  discrecionalidad y el que más resistencia interna genera. Se introduce
  cuando el sistema ya es indispensable por las fases anteriores.

---

### Fase 6 — Campañas de salud pública y portal
**Estado:** no iniciada.
**Estimado:** 3–4 semanas
**Vendible:** Sí, como plan superior.
**Depende de:** capa territorial (Fase 1.b)

Estas dos piezas van juntas porque son el mismo dato con dos audiencias.
El portal deja de ser un CMS suelto y se vuelve la cara pública del
sistema.

#### 6.a Campañas territoriales
Descacharrización y fumigación. En Yucatán el dengue es endémico y estas
campañas son responsabilidad política directa.

- Planeación por sectores y calendario de cobertura
- Asignación de cuadrillas y unidades
- Captura en campo: sectores cubiertos, evidencia fotográfica, casas
  cerradas o con negativa de acceso
- Métricas de resultado (toneladas levantadas, viviendas fumigadas)
- Mapa de cobertura y sectores pendientes

**Ángulo de venta: comprobación, no gestión.** El valor no es organizar la
campaña, es poder demostrar que se hizo. Hoy la evidencia son fotos
sueltas en el WhatsApp del director. Cuando la Secretaría de Salud o el
cabildo pregunta qué se hizo contra el dengue, la respuesta sale en un
botón.

**Pendiente de investigación:** si la Secretaría de Salud de Yucatán ya
exige un formato de reporte específico, generarlo automáticamente
justifica la suscripción por sí solo.

#### 6.b Portal público
Una campaña tiene tres momentos y el mismo registro los alimenta:

| Momento | Superficie | Contenido |
|---|---|---|
| Antes | Aviso público | "Martes pasa el camión por la colonia X" |
| Durante | Panel interno | Rutas, cuadrillas, cobertura |
| Después | Nota de resultados | "12 toneladas levantadas" — y es la evidencia |

- Noticias y avisos con imágenes, administrables desde el panel
- Publicación de avisos directamente desde el módulo de campañas
- Carga ultraligera, optimizada para redes móviles rurales inestables
- Consulta pública de folios (constancias y reportes)

No es portal de transparencia. Ver sección 2.

---

### Fase 7 — Libro digital del juzgado de paz
**Estado:** no iniciada.
**Estimado:** 2 semanas
**Vendible:** Sí.
**Posición:** respaldo e índice. Nunca registro oficial.

El juzgado opera hoy con un libro de gobierno manuscrito. El dolor real es
la búsqueda: alguien regresa seis meses después y nadie encuentra el
convenio anterior.

**Alcance incluido:**
- Registro de asuntos: fecha, partes involucradas, tipo, resultado
- Tipo y resultado como categorías cerradas, configurables por municipio
- Adjunto del escaneo del acta del libro físico
- Búsqueda por persona, fecha y tipo de asunto
- Historial de una persona en el juzgado

**Alcance excluido, de forma deliberada:**
- Cálculo de plazos o términos
- Estatus de detención o control de tiempos de arresto
- Catálogo de sanciones del Bando de Policía y Buen Gobierno
- Expediente narrado en texto libre

**Por qué esas exclusiones.** El límite constitucional de detención es de
36 horas. Un sistema que registre mal una hora de ingreso se convierte en
prueba de una violación de derechos. Y si un asunto se impugna, los
registros entran a un proceso legal.

**Sobre el texto libre:** llamar al módulo "administrativo" no reduce la
obligación legal sobre los datos. Un pleito familiar narrado en un campo
abierto es dato personal sensible, con módulo administrativo o sin él. Por
eso el registro es un índice, no un expediente.

**Verificar antes de construir:** si el libro físico es de conservación
obligatoria — probablemente lo sea — el producto es complemento y respaldo,
nunca sustituto. Esa distinción se sostiene también en el material de
venta.

---

## 5. Camino al primer ingreso

```
Fase 0  ──►  Fase 1  ──►  Fase 2  ──►  💰 primer cobro
3-4 sem      2-3 sem      3-4 sem
```

**Total estimado: 8 a 11 semanas** para tener producto cobrable, una
persona dedicada. Las fases 3 a 7 son expansión de cuenta y justificación
de planes superiores.

**Insumo que bloquea la ruta crítica:** una constancia real emitida por el
municipio piloto. Sin ese papel la Fase 2 no arranca, por más que las
fases 0 y 1 estén terminadas. Conseguirlo es lo primero, no lo último.

De la Fase 1 solo el padrón (1.a) está en la ruta crítica. La capa
territorial (1.b) puede diferirse hasta la Fase 6 si hace falta acelerar el
primer cobro, con el costo de una migración posterior de domicilios.

Las estimaciones asumen alcance congelado. Cada módulo que se adelante
desplaza el primer ingreso.

---

## 6. Ventajas de este alcance

Comparado con un sistema de tesorería, este alcance elimina los tres
obstáculos más costosos:

- **Sin operación offline crítica.** Un reporte o una constancia toleran
  esperar a que vuelva el internet. Un cobro en caja no. Esto evita una
  arquitectura offline-first completa.
- **Sin impresión térmica.** Documentos en hoja carta, impresora común. No
  se requiere agente local ni integración ESC-POS.
- **Sin cumplimiento fiscal.** No hay CFDI, PAC, timbrado ni armonización
  contable.

El resultado es un producto construible por una sola persona en un
trimestre.

---

## 7. Riesgos abiertos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Fuga de datos entre tenants | Terminal para el negocio | Pruebas de aislamiento en Fase 0, antes de avanzar |
| Ciclo político de 3 años | Churn no atribuible a producto | Renovación anticipada en año electoral + múltiples áreas dependientes (ver abajo) |
| Pago tardío del municipio | Flujo de caja | Runway propio; pago anticipado o semestral |
| Valor difuso frente a tesorería | Venta más difícil | El padrón único es el argumento, no los módulos |
| Resistencia interna (combustible) | Sabotaje pasivo | Diferido a Fase 5 |
| RLS inactivo por usar el superusuario de Railway | Fuga silenciosa entre municipios | Roles separados verificados en Fase 0, antes de escribir código |
| Respaldo nunca restaurado | Pérdida del único registro de documentos emitidos | Simulacro de restauración antes de producción |
| Datos del municipio no exportables al terminar contrato | Daño reputacional en un mercado donde todos se hablan | Exportador construido desde Fase 0 |
| Soporte de una sola persona | Churn por un lunes sin respuesta | Canal y expectativa definidos por contrato antes de vender |

---

### Expansión por área, no por municipio

Cada módulo tiene un comprador interno distinto dentro del mismo
ayuntamiento:

| Módulo | Área que lo defiende |
|---|---|
| Constancias y oficios | Secretaría Municipal |
| Reportes ciudadanos | Servicios Públicos |
| Apoyos sociales y traslados | DIF municipal / Presidencia |
| Campañas de salud | Servicios Públicos / Salud municipal |
| Libro del juzgado | Juzgado de Paz |
| Portal y avisos | Comunicación Social |

Esto es la defensa real contra el cambio de administración. Si una sola
dirección depende del sistema, la nueva administración lo corta sin costo.
Si dependen cuatro áreas, cortarlo es más caro que renovarlo.

Estrategia: entrar por una área y expandir lateralmente dentro del mismo
municipio antes de buscar el siguiente.

---

## 8. Decisiones pendientes

**Comerciales:**
- Precio de entrada (rango evaluado: $1,500–2,500 MXN/mes)
- Empaquetado en planes y qué módulo va en cuál
- **Términos de soporte**: canal, horario y tiempo de respuesta, escritos
  en el contrato. Vas a ser una sola persona. Un lunes a las nueve sin
  respuesta cuando no pueden emitir constancias es la causa de churn más
  evitable que existe. Definirlo antes de vender, no después del primer
  incidente.
- Costo real de Railway por mes, para validar el margen del precio

**Técnicas (dos son bloqueantes de Fase 0, ver arriba):**
- Registrar el dominio `xulasigma.mx` antes de que lo tome alguien más
- RPO y RTO aceptables para el respaldo

**Por investigar con el municipio piloto:**
- ¿Existe formato oficial de reporte de descacharrización/fumigación que
  ya exija la Secretaría de Salud de Yucatán?
- ¿El libro de gobierno del juzgado es de conservación obligatoria?
- Volumen semanal de constancias, apoyos de traslado y asuntos del juzgado
- Formato real de la constancia de vecindad que emiten hoy
