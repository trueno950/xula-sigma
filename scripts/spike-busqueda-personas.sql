-- Spike de busqueda tolerante a variantes de escritura (Fase 1a).
--
-- Sostiene los numeros del ADR 0002. Se corre entero contra un Postgres
-- desechable y vuelve a imprimir las tablas:
--
--   docker exec -i xula-pg psql -U postgres -d postgres \
--     -c "DROP DATABASE IF EXISTS spike_padron WITH (FORCE)" \
--     -c "CREATE DATABASE spike_padron"
--   docker exec -i xula-pg psql -U postgres -d spike_padron \
--     < scripts/spike-busqueda-personas.sql
--
-- No toca xula_test ni ninguna tabla del producto: vive en su propia base.
-- Es deliberadamente deterministico —sin random()— para que dos corridas
-- den el mismo numero y una diferencia signifique algo.

\set ON_ERROR_STOP on

-- Todo el spike corre en una transaccion. Dos motivos:
--
-- 1. `SET LOCAL` y nunca `SET` suelto. La regla y su razon viven en
--    AGENTS.md regla 3; no se repiten aca. Que el pooler no exista en un
--    psql de una corrida no la habilita: el primer `SET` suelto del repo
--    es el que le abre la puerta al segundo.
-- 2. Una corrida que falla a la mitad no deja medio corpus en pie, que
--    despues se mide como si estuviera entero.
BEGIN;

CREATE SCHEMA IF NOT EXISTS spike;
SET LOCAL search_path = spike, public;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ---------------------------------------------------------------------
-- 1. Corpus
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS personas CASCADE;
CREATE TABLE personas (id int PRIMARY KEY, nombre text NOT NULL);

-- Nombres de pila frecuentes en el padron yucateco cruzados con apellidos
-- mayas y castellanos. La mezcla no es decorativa: los apellidos mayas son
-- donde se rompen los algoritmos foneticos pensados para el ingles.
WITH pila AS (
  SELECT * FROM unnest(ARRAY[
    'Maria Guadalupe','Jose Manuel','Juan Carlos','Maria Concepcion',
    'Jesus Alberto','Francisco Javier','Rosa Maria','Candelaria del Socorro',
    'Wilberth Alejandro','Jorge Luis','Maria del Carmen','Silvia Beatriz',
    'Elsy Noemi','Landy Guadalupe','Nery Aracely','Fanny Esther',
    'Mariela Concepcion','Adrian Ivan','Angel Gabriel','Gaspar Antonio',
    'Feliciano de Jesus','Santos Emilio','Genny Marisol','Addy Rubi',
    'Mildred Yazmin','Roger Ivan','Maria Antonia','Jose Guadalupe',
    'Manuel Jesus','Carmen Beatriz'
  ]) WITH ORDINALITY AS t(nombre, i)
), paterno AS (
  SELECT * FROM unnest(ARRAY[
    'Pech','Canul','Chi','Uc','Dzul','Ek','Poot','Cauich','Tzec','Ucan',
    'Balam','Cocom','Xool','Nahuat','May','Kumul','Chan','Puc','Ciau','Tuz',
    'Batun','Couoh','Moo','Yam','Noh','Che','Kuyoc','Tec','Bacab','Itza',
    'Garcia','Perez','Lopez','Hernandez','Martinez'
  ]) WITH ORDINALITY AS t(ap, i)
), materno AS (
  SELECT * FROM unnest(ARRAY[
    'Sanchez','Rodriguez','Gomez','Castillo','Vazquez','Interian','Sosa',
    'Aguilar','Mena','Peraza','Basto','Cetina','Novelo','Ancona','Loria'
  ]) WITH ORDINALITY AS t(am, i)
)
INSERT INTO personas (id, nombre)
SELECT n, pila.nombre || ' ' || paterno.ap || ' ' || materno.am
FROM generate_series(1, 200) AS n
JOIN pila    ON pila.i    = ((n * 7)  % 30) + 1
JOIN paterno ON paterno.i = ((n * 11) % 35) + 1
JOIN materno ON materno.i = ((n * 13) % 15) + 1;

-- ---------------------------------------------------------------------
-- 2. Normalizacion
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION norm(t text) RETURNS text AS $$
  SELECT unaccent(lower(regexp_replace(t, '[.]', '', 'g')));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toks(t text) RETURNS text[] AS $$
  SELECT array_remove(string_to_array(norm(t), ' '), '');
$$ LANGUAGE sql;

DROP TABLE IF EXISTS abreviaturas;
CREATE TABLE abreviaturas (corta text PRIMARY KEY, larga text NOT NULL);
INSERT INTO abreviaturas VALUES
  ('ma','maria'),('mma','maria'),('gpe','guadalupe'),('gpa','guadalupe'),
  ('fco','francisco'),('fca','francisca'),('j','jose'),('jo','jose'),
  ('jsus','jesus'),('ant','antonio'),('mig','miguel'),('mgl','miguel'),
  ('crmn','carmen'),('conc','concepcion'),('cnc','concepcion'),
  ('rmn','ramon'),('flcn','feliciano'),('alej','alejandro');

CREATE OR REPLACE FUNCTION expandir(t text) RETURNS text AS $$
  SELECT string_agg(COALESCE(a.larga, tok), ' ' ORDER BY o)
  FROM unnest(toks(t)) WITH ORDINALITY AS u(tok, o)
  LEFT JOIN abreviaturas a ON a.corta = u.tok;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION tokens_and(q text, n text) RETURNS float AS $$
  SELECT CASE WHEN bool_and(EXISTS (
           SELECT 1 FROM unnest(toks(n)) tn WHERE tn LIKE tq || '%'
         )) THEN 1.0 ELSE 0.0 END
  FROM unnest(toks(q)) tq;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION dmeta(q text, n text) RETURNS float AS $$
  SELECT avg(CASE WHEN EXISTS (
           SELECT 1 FROM unnest(toks(n)) tn
            WHERE dmetaphone(tn) = dmetaphone(tq) AND dmetaphone(tq) <> ''
         ) THEN 1.0 ELSE 0.0 END)
  FROM unnest(toks(q)) tq;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION lev_norm(q text, n text) RETURNS float AS $$
  SELECT 1.0 - levenshtein(norm(q), norm(n))::float
              / greatest(length(norm(q)), length(norm(n)), 1);
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------
-- 3. Consultas: como se captura el mismo nombre la segunda vez
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS consultas;
CREATE TABLE consultas (
  qid      serial PRIMARY KEY,
  consulta text NOT NULL,
  esperado int  NOT NULL REFERENCES personas(id),
  clase    text NOT NULL
);

INSERT INTO consultas (consulta, esperado, clase)
SELECT replace(replace(replace(replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(replace(replace(replace(nombre,
  'Maria','María'),'Jose','José'),'Concepcion','Concepción'),
  'Jesus','Jesús'),'Angel','Ángel'),'Adrian','Adrián'),
  'Garcia','García'),'Perez','Pérez'),'Lopez','López'),
  'Hernandez','Hernández'),'Martinez','Martínez'),'Sanchez','Sánchez'),
  'Rodriguez','Rodríguez'),'Gomez','Gómez'),'Vazquez','Vázquez'),
  'Ucan','Ucán'),
  id, 'acento'
FROM personas WHERE id % 3 = 0;

INSERT INTO consultas (consulta, esperado, clase)
SELECT replace(replace(replace(replace(nombre,
  'Maria','Ma.'),'Guadalupe','Gpe.'),'Francisco','Fco.'),'Jose','J.'),
  id, 'abreviatura'
FROM personas WHERE nombre ~ '(Maria|Guadalupe|Francisco|Jose)';

INSERT INTO consultas (consulta, esperado, clase)
SELECT replace(nombre, m.de, m.a), id, 'maya'
FROM personas,
  (VALUES ('Canul','Kanul'),('Ek','Ec'),('Dzul','Tzul'),('Uc','Uk'),
          ('Cauich','Kauich'),('Poot','Pot'),('Ucan','Ukan'),
          ('Tzec','Dzec'),('Couoh','Cuoh'),('Kumul','Cumul'),
          ('Xool','Shool'),('Ciau','Siau')) AS m(de, a)
WHERE nombre LIKE '% ' || m.de || ' %';

INSERT INTO consultas (consulta, esperado, clase)
SELECT split_part(nombre,' ',1) || ' ' || split_part(nombre,' ',2) || ' ' ||
       regexp_replace(split_part(nombre,' ',3), '^(.)(.)(.)', '\1\3\2') ||
       ' ' || split_part(nombre,' ',4),
  id, 'tipeo'
FROM personas
WHERE array_length(string_to_array(nombre,' '),1) = 4
  AND length(split_part(nombre,' ',3)) >= 4 AND id % 2 = 0;

INSERT INTO consultas (consulta, esperado, clase)
SELECT split_part(nombre,' ',1) || ' ' || split_part(nombre,' ',3), id, 'parcial'
FROM personas
WHERE array_length(string_to_array(nombre,' '),1) = 4 AND id % 5 = 0;

INSERT INTO consultas (consulta, esperado, clase)
SELECT split_part(nombre,' ',1) || ' ' || split_part(nombre,' ',2) || ' ' ||
       split_part(nombre,' ',4) || ' ' || split_part(nombre,' ',3),
  id, 'orden'
FROM personas
WHERE array_length(string_to_array(nombre,' '),1) = 4 AND id % 4 = 0;

-- El caso del mostrador: abreviatura + solo apellido paterno. Es la
-- combinacion que separa las estrategias, y ninguna clase anterior la tenia.
INSERT INTO consultas (consulta, esperado, clase)
SELECT replace(replace(replace(
         split_part(nombre,' ',1) || ' ' || split_part(nombre,' ',2) || ' ' ||
         split_part(nombre,' ',3),
       'Maria','Ma.'),'Guadalupe','Gpe.'),'Francisco','Fco.'),
       id, 'parcial_abrev'
FROM personas
WHERE array_length(string_to_array(nombre,' '),1) = 4
  AND nombre ~ '(Maria|Guadalupe|Francisco)';

-- Una consulta identica al canonico no mide nada y sube el promedio.
DELETE FROM consultas c USING personas p
 WHERE p.id = c.esperado AND c.consulta = p.nombre;

-- ---------------------------------------------------------------------
-- 4. Puntajes
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS puntajes;
CREATE TABLE puntajes AS
SELECT e.estrategia, c.qid, p.id AS persona, e.score
FROM consultas c
CROSS JOIN personas p
CROSS JOIN LATERAL (VALUES
  ('exacto',      (norm(c.consulta) = norm(p.nombre))::int::float),
  ('tokens_and',  tokens_and(c.consulta, p.nombre)),
  ('trgm',        similarity(norm(c.consulta), norm(p.nombre))::float),
  ('trgm_word',   word_similarity(norm(c.consulta), norm(p.nombre))::float),
  ('dmetaphone',  dmeta(c.consulta, p.nombre)),
  ('levenshtein', lev_norm(c.consulta, p.nombre)),
  ('trgm_dicc',   similarity(expandir(c.consulta), expandir(p.nombre))::float)
) AS e(estrategia, score)
WHERE e.score > 0;

CREATE INDEX ON puntajes (estrategia, qid);

-- Posicion pesimista: cuantas personas empatan o superan a la correcta.
-- Sin score, la persona no vuelve de la consulta y no tiene posicion.
CREATE OR REPLACE VIEW resultados AS
SELECT e.estrategia, c.qid, c.clase, pu.score,
  CASE WHEN pu.score IS NULL THEN 9999 ELSE (
    SELECT count(*) FROM puntajes p2
     WHERE p2.estrategia = e.estrategia AND p2.qid = c.qid
       AND p2.score >= pu.score) END AS pos
FROM consultas c
CROSS JOIN (SELECT DISTINCT estrategia FROM puntajes) e
LEFT JOIN puntajes pu
  ON pu.estrategia = e.estrategia AND pu.qid = c.qid AND pu.persona = c.esperado;

-- ---------------------------------------------------------------------
-- 5. Tablas del ADR
-- ---------------------------------------------------------------------

\echo ''
\echo '== Estrategias, todas las clases =='
SELECT estrategia,
  round(100.0*avg((pos = 1)::int), 1)  AS top1_pct,
  round(100.0*avg((pos <= 5)::int), 1) AS top5_pct
FROM resultados GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '== Top-1 por clase de variante =='
SELECT clase,
  round(100.0*avg((pos=1)::int) FILTER (WHERE estrategia='trgm_dicc'),0)   AS trgm_dicc,
  round(100.0*avg((pos=1)::int) FILTER (WHERE estrategia='trgm'),0)        AS trgm,
  round(100.0*avg((pos=1)::int) FILTER (WHERE estrategia='dmetaphone'),0)  AS dmeta,
  round(100.0*avg((pos=1)::int) FILTER (WHERE estrategia='levenshtein'),0) AS lev,
  round(100.0*avg((pos=1)::int) FILTER (WHERE estrategia='tokens_and'),0)  AS tok_and
FROM resultados GROUP BY 1 ORDER BY 1;

\echo ''
\echo '== La consulta del mostrador: quien queda bajo el umbral 0.3 =='
SELECT estrategia, count(*) AS n,
  round(100.0*avg((score >= 0.3)::int), 0) AS sobre_umbral_pct,
  round(min(score)::numeric, 3)            AS score_min
FROM resultados WHERE clase = 'parcial_abrev'
  AND estrategia IN ('trgm','trgm_dicc')
GROUP BY 1 ORDER BY 1;

\echo ''
\echo '== Umbral: recuperacion contra ruido (trgm_dicc) =='
WITH u AS (SELECT unnest(ARRAY[0.15,0.20,0.25,0.30,0.35,0.40]) AS umbral)
SELECT u.umbral,
  round(100.0*avg((r.score >= u.umbral)::int), 1) AS lo_devuelve_pct,
  round(avg((SELECT count(*) FROM puntajes p
              WHERE p.estrategia='trgm_dicc' AND p.qid=r.qid
                AND p.score >= u.umbral)), 1)     AS candidatos_prom
FROM resultados r CROSS JOIN u
WHERE r.estrategia = 'trgm_dicc'
GROUP BY 1 ORDER BY 1;

COMMIT;
