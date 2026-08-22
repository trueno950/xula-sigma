#!/usr/bin/env bash
# Postgres local para desarrollo manual (`pnpm dev`), separado de la base
# de los tests de integracion.
#
#   pnpm db:dev
#
# Reusa el mismo contenedor que `db:local` (mismo cluster de Postgres,
# mismo puerto 55432) pero con su propia base, `xula_dev`. A diferencia de
# `db-local.sh`, es idempotente sin destruir nada: nunca la dropea. Un
# `pnpm db:local` para correr los tests de integracion no debe borrar el
# municipio de prueba que sembraste a mano para navegar la app.

set -euo pipefail

CONTENEDOR="xula-pg"
PUERTO="55432"
BASE="xula_dev"
CLAVE="postgres"

export MIGRATION_DATABASE_URL="postgresql://xula_migrator:${CLAVE}@localhost:${PUERTO}/${BASE}"
export DATABASE_URL="postgresql://xula_app:${CLAVE}@localhost:${PUERTO}/${BASE}"
export SUPER_ADMIN_DATABASE_URL="postgresql://xula_super_admin:${CLAVE}@localhost:${PUERTO}/${BASE}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker no esta corriendo." >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
  echo "→ Creando contenedor $CONTENEDOR"
  docker run -d --name "$CONTENEDOR" \
    -e POSTGRES_PASSWORD="$CLAVE" \
    -p "${PUERTO}:5432" \
    postgres:18 >/dev/null
else
  docker start "$CONTENEDOR" >/dev/null
fi

echo "→ Esperando a que acepte conexiones"
until docker exec "$CONTENEDOR" pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done

EXISTE=$(docker exec "$CONTENEDOR" psql -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${BASE}'")

if [ "$EXISTE" != "1" ]; then
  echo "→ Creando $BASE"
  docker exec "$CONTENEDOR" psql -U postgres -d postgres -q \
    -c "CREATE DATABASE ${BASE}"
else
  echo "→ $BASE ya existe, no se toca"
fi

echo "→ Provisionando roles"
docker cp scripts/bootstrap.sql "${CONTENEDOR}:/tmp/bootstrap.sql"
docker exec "$CONTENEDOR" psql -U postgres -d "$BASE" -q \
  -v clave_migrator="$CLAVE" -v clave_app="$CLAVE" \
  -v clave_super_admin="$CLAVE" \
  -f /tmp/bootstrap.sql

echo "→ Migrando"
pnpm exec drizzle-kit migrate

cat <<FIN

Base lista. Copia estas tres lineas a tu .env:

  DATABASE_URL="${DATABASE_URL}"
  MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL}"
  SUPER_ADMIN_DATABASE_URL="${SUPER_ADMIN_DATABASE_URL}"

Y despues sembra un municipio de prueba con:

  pnpm seed:dev

FIN
