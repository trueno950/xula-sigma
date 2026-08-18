ALTER POLICY "cuentas_restablece_admin" ON "cuentas" TO xula_super_admin USING (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND EXISTS (
  SELECT 1 FROM usuarios u
   WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'
)) WITH CHECK (ayuntamiento_id = NULLIF(current_setting('app.tenant', true), '')::uuid AND EXISTS (
  SELECT 1 FROM usuarios u
   WHERE u.id = cuentas.user_id AND u.rol = 'ADMIN_MUNICIPAL'
));