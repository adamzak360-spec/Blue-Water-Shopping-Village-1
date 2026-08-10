-- Allow the admin dashboard to remove seller stores while keeping deletion
-- unavailable to ordinary sellers and customers.
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;

CREATE POLICY "Admins can delete businesses" ON public.businesses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
