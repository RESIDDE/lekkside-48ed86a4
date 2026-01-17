-- Fix security issue: Events can be modified/deleted by any authenticated user
-- Replace with ownership-based policies

-- Drop existing permissive policies for events
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;

-- Create ownership-based UPDATE policy for events
CREATE POLICY "Event owners can update events" 
  ON public.events FOR UPDATE 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create ownership-based DELETE policy for events
CREATE POLICY "Event owners can delete events" 
  ON public.events FOR DELETE 
  USING (created_by = auth.uid());

-- Fix security issue: Guest data exposed to all authenticated users
-- Restrict guest CRUD to event owners only

-- Drop existing permissive policies for guests
DROP POLICY IF EXISTS "Authenticated users can view guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can update guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can delete guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can create guests" ON public.guests;

-- Create ownership-based SELECT policy for guests (event owners only)
CREATE POLICY "Event owners can view guests" 
  ON public.guests FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Create ownership-based INSERT policy for guests (event owners or public registration)
CREATE POLICY "Event owners can create guests" 
  ON public.guests FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.created_by = auth.uid()
    ) 
    OR registered_via IS NOT NULL
  );

-- Create ownership-based UPDATE policy for guests (event owners only)
-- Note: Public check-in policy remains separate
CREATE POLICY "Event owners can update guests" 
  ON public.guests FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Create ownership-based DELETE policy for guests
CREATE POLICY "Event owners can delete guests" 
  ON public.guests FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.created_by = auth.uid()
    )
  );