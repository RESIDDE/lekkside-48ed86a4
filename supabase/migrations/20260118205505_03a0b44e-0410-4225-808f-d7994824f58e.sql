-- Create security definer function to check if a form is active
-- This bypasses RLS context issues when called from policies
CREATE OR REPLACE FUNCTION public.is_form_active(form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_forms
    WHERE id = form_id AND is_active = true
  )
$$;

-- Drop the problematic policy that uses inline EXISTS subquery
DROP POLICY IF EXISTS "Public can register via forms" ON public.guests;

-- Recreate the policy using the security definer function
CREATE POLICY "Public can register via forms"
ON public.guests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  registered_via IS NOT NULL 
  AND public.is_form_active(registered_via)
);