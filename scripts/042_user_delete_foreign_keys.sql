-- 042: Permite eliminar usuarios de auth sin bloquear el borrado por columnas
-- de auditoria opcionales (creado_por, usado_por, etc.).
-- Las columnas NOT NULL con ON DELETE RESTRICT (p. ej. bioremediation_cases.author_id)
-- se dejan intactas: el admin vera el error y debera reasignar esos registros.

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT
      c.conname,
      c.conrelid::regclass AS table_name,
      string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS column_list
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND n.nspname = 'public'
      AND c.confdeltype IN ('a', 'r')
      AND NOT a.attnotnull
    GROUP BY c.conname, c.conrelid
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES auth.users(id) ON DELETE SET NULL',
      fk.table_name,
      fk.conname,
      fk.column_list
    );
  END LOOP;
END $$;
