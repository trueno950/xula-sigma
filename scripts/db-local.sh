#!/usr/bin/env bash
# Postgres local para los tests de integracion y aislamiento.
#
#   pnpm db:local
#
# Levanta el contenedor, provisiona los dos roles y aplica las migraciones.
# Es idempotente: correrlo de nuevo recrea la base desde cero.
#
# El puerto es 55432 y no 5432 a proposito, para no chocar con un Postgres
# que ya este instalado en la maquina.

set -euo pipefail

CONTENEDOR="xula-pg"
PUERTO="55432"
BASE="xula_test"
CLAVE="postgres"

export MIGRATION_DATABASE_URL="postgresql://xula_migrator:${CLAVE}@localhost:${PUERTO}/${BASE}"
export DATABASE_URL="postgresql://xula_app:${CLAVE}@localhost:${PUERTO}/${BASE}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker no esta corriendo." >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTENEDOR"; then
  echo "→ Creando contenedor $CONTENEDOR"
  docker run -d --name "$CONTENEDOR" \
    -e POSTGRES_PASSWORD="$CLAVE" \
    -e POSTGRES_DB="$BASE" \
    -p "${PUERTO}:5432" \
    postgres:18 >/dev/null
else
  docker start "$CONTENEDOR" >/dev/null
fi

echo "→ Esperando a que acepte conexiones"
until docker exec "$CONTENEDOR" pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done

# Base desde cero en cada corrida: un test de aislamiento contra una base
# con restos de la corrida anterior no prueba lo que dice probar.
echo "→ Recreando $BASE"
docker exec "$CONTENEDOR" psql -U postgres -d postgres -q \
  -c "DROP DATABASE IF EXISTS ${BASE} WITH (FORCE)"
docker exec "$CONTENEDOR" psql -U postgres -d postgres -q \
  -c "CREATE DATABASE ${BASE}"

echo "→ Provisionando roles"
docker cp scripts/bootstrap.sql "${CONTENEDOR}:/tmp/bootstrap.sql"
docker exec "$CONTENEDOR" psql -U postgres -d "$BASE" -q \
  -v clave_migrator="$CLAVE" -v clave_app="$CLAVE" \
  -f /tmp/bootstrap.sql

echo "→ Migrando"
pnpm exec drizzle-kit migrate

cat <<FIN

Base lista. Para correr los tests de aislamiento:

  export DATABASE_URL="${DATABASE_URL}"
  export MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL}"
  pnpm test:integration

FIN
