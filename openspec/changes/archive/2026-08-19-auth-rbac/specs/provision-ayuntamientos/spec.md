# Provision de Ayuntamientos — Specification

## Purpose

Alta de municipios operada exclusivamente por `SUPER_ADMIN` bajo su
propio rol de Postgres, creando el ayuntamiento y su primer
`ADMIN_MUNICIPAL` en el mismo paso, con traza en bitacora.

## Requirements

### Requirement: Solo SUPER_ADMIN da de alta un ayuntamiento

El sistema MUST rechazar el alta de un ayuntamiento solicitada por
cualquier rol distinto de `SUPER_ADMIN`.

#### Scenario: ADMIN_MUNICIPAL intenta dar de alta un municipio

- GIVEN un usuario con rol ADMIN_MUNICIPAL autenticado
- WHEN intenta dar de alta un nuevo ayuntamiento
- THEN el sistema responde 403
- AND no se crea ningun registro

### Requirement: El alta crea el ayuntamiento y su primer ADMIN_MUNICIPAL de forma atomica

El alta de un ayuntamiento MUST crear en la misma transaccion el registro
del ayuntamiento y su primera cuenta con rol `ADMIN_MUNICIPAL`. Si
cualquiera de los dos pasos falla, el sistema MUST NOT dejar el
ayuntamiento creado sin administrador.

#### Scenario: Alta exitosa deja un administrador que puede entrar

- GIVEN datos validos de un nuevo municipio y de su primer administrador
- WHEN SUPER_ADMIN ejecuta el alta
- THEN existe el ayuntamiento con su subdominio
- AND existe una cuenta ADMIN_MUNICIPAL de ese ayuntamiento que puede
  iniciar sesion en ese subdominio

#### Scenario: Fallo al crear el administrador revierte el ayuntamiento

- GIVEN datos validos de ayuntamiento pero datos invalidos para el primer
  administrador
- WHEN SUPER_ADMIN ejecuta el alta
- THEN el sistema rechaza la operacion completa
- AND no queda ningun ayuntamiento creado sin administrador

### Requirement: El alta corre bajo el rol Postgres de SUPER_ADMIN

El alta de un ayuntamiento MUST ejecutarse bajo un rol de Postgres
distinto de `xula_app` y de `xula_migrator`, con `NOSUPERUSER` y
`NOBYPASSRLS`, y con `GRANT INSERT` explicito sobre `ayuntamientos`.

#### Scenario: El test de esquema cubre el tercer rol

- GIVEN el rol de Postgres usado para el alta de ayuntamientos
- WHEN el test de esquema evalua los roles de la base
- THEN confirma que ese rol no es superusuario y no tiene BYPASSRLS

### Requirement: El alta deja traza en bitacora

El alta de un ayuntamiento MUST registrar en bitacora quien la ejecuto,
el ayuntamiento creado y el momento.

#### Scenario: La bitacora registra el alta

- GIVEN un alta de ayuntamiento completada por SUPER_ADMIN
- WHEN se consulta la bitacora
- THEN aparece una fila con el actor, el ayuntamiento_id creado, la
  accion y el momento
