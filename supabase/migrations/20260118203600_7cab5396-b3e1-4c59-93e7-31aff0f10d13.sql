-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public can register via forms" ON public.guests;

-- Create a new PERMISSIVE policy for public form registration
CREATE POLICY "Public can register via forms"
ON public.guests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  registered_via IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM event_forms 
    WHERE event_forms.id = registered_via 
    AND event_forms.is_active = true
  )
);