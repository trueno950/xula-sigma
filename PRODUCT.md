# Product

Contexto estratégico de diseño de XULA SIGMA. Responde quién, qué y por qué.
El cómo se ve vive en `DESIGN.md`; las reglas de implementación, en
`docs/06-frontend.md`.

## Register

product

## Users

Personal de ayuntamientos de menos de 5,000 habitantes en Yucatán. Cuatro
roles, con necesidades distintas de la misma pantalla:

- **Operador** — captura. Da de alta personas, emite constancias, registra
  apoyos. Hace la misma tarea muchas veces al día. Es quien paga el costo
  de cada clic de más.
- **Admin Municipal** — configura y supervisa. Entra menos seguido y no
  recuerda dónde estaba cada cosa.
- **Secretario / Consulta** — lee. Busca a una persona y necesita verla
  completa.
- **SuperAdmin** — plataforma, no municipio.

Contexto real, no supuesto: equipos viejos en el palacio, red móvil rural
inestable, Windows, y personal que **no es usuario experto y no tiene por
qué serlo**. La captura ocurre en dos lugares por igual — el escritorio del
palacio y el celular en campo — así que cada listado necesita dos formas
reales, no una tabla con `overflow-x`.

El trabajo que vienen a hacer: terminar el trámite del vecino que está
parado del otro lado del mostrador.

## Product Purpose

Digitalizar los trámites y la operación interna del palacio municipal en un
SaaS multi-tenant: un despliegue, una base, municipios aislados por
`ayuntamiento_id` + RLS.

No es un sistema de tesorería. No cobra dinero, no emite CFDI, no hace
contabilidad gubernamental.

Éxito es que el trámite se haga en el sistema y no en papel. Un sistema que
estorba se sortea, y el papel no tiene RLS ni bitácora.

## Brand Personality

**Directa, densa, confiable.** Referencia: el dashboard de Stripe —
información jerarquizada, tablas que se leen de un vistazo, acciones donde
se las espera.

La referencia trae una tensión que hay que resolver a propósito y no
ignorar: Stripe densifica para un usuario técnico en pantalla grande, y acá
los usuarios son operadores no expertos, en monitores viejos y en celular.
Se toma la jerarquía y la confianza de Stripe; no se toma su supuesto sobre
quién mira la pantalla. El primer principio de abajo existe por esto.

La marca visible —color y escudo— es de cada municipio, no del producto.

## Anti-references

**No se parece a un trámite de gobierno.** Nada de formulario denso que
imita papel, campos en mayúsculas, jerga legal, veinte campos en una
pantalla "por si acaso". El operador no es un escribano y el vecino no está
llenando una solicitud.

Tampoco, por si el péndulo se va al otro lado:

- Nada de aire infinito, ilustraciones ni microcopy simpático. Nadie quiere
  una experiencia; quieren terminar.
- Nada de rejilla de celdas editables sin jerarquía. Una tabla es una lista
  de personas, no una hoja de cálculo.

## Design Principles

1. **La densidad se gana, no se asume.** Se densifica lo que el operador ya
   sabe leer de un vistazo —nombre, fecha, estado— y se abre lo que tiene
   que decidir. Densidad que obliga a entrecerrar los ojos no es densidad,
   es descuido.

2. **El sistema no interroga.** Cada campo que existe justifica por qué
   existe. Que el padrón no tenga domicilio en esta fase es una decisión
   tomada, no un pendiente.

3. **Nada bloquea la captura.** La sugerencia de duplicados sugiere; no
   frena. Una validación que impide terminar el trámite manda al operador
   de vuelta al papel, y ahí no hay aislamiento ni bitácora.

4. **El error dice qué hacer.** Redactado para el operador, en español, sin
   jerga técnica. Si no se puede resolver sin llamar a alguien, el mensaje
   está mal escrito.

5. **La marca es del municipio; la interfaz es del sistema.** Cada
   ayuntamiento pinta su color y su escudo. La forma de la tabla, del
   formulario y del error no cambia entre municipios: personalización de
   identidad, no de estructura.

## Accessibility & Inclusion

**WCAG 2 nivel AA**, y ya hay una parte enforzada por código: `leerMarca`
exige razón de contraste **4.5** contra el color de marca elegido por el
municipio, no el 3.0 de texto grande (`docs/06-frontend.md` sección 6).

- **El color no comunica solo.** Es más estricto acá que en un producto
  normal: el color de marca lo elige cada municipio, así que ningún estado
  —activo, dado de baja, error, éxito— puede depender de un color para
  entenderse. Siempre lleva texto o forma.
- **Teclado completo.** El operador que captura todo el día no debería
  tocar el mouse para dar un alta.
- **Movimiento reducido.** Sin animación decorativa en pantalla operativa,
  que ya es antipatrón 12 de `docs/06-frontend.md`.
- **Más texto, menos icono.** El personal municipal no descifra
  pictogramas. El icono acompaña a la etiqueta; no la reemplaza.
