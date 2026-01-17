-- Fix security issue: Users can see other users' events
-- Replace permissive SELECT policy with ownership-based access

-- Drop the overly permissive SELECT policy for events
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;

-- Create ownership-based SELECT policy for events
CREATE POLICY "Event owners can view events" 
  ON public.events FOR SELECT 
  USING (created_by = auth.uid());

-- Fix public event access - restrict to only valid check-in stations or forms
DROP POLICY IF EXISTS "Public can view events by id" ON public.events;

CREATE POLICY "Public can view events via stations or forms" 
  ON public.events FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM checkin_stations 
      WHERE checkin_stations.event_id = events.id 
      AND checkin_stations.is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM event_forms 
      WHERE event_forms.event_id = events.id 
      AND event_forms.is_active = true
    )
  );

-- Fix public guest access - restrict to only valid check-in stations
DROP POLICY IF EXISTS "Public can view guests for events" ON public.guests;

CREATE POLICY "Public can view guests via stations" 
  ON public.guests FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM checkin_stations 
      WHERE checkin_stations.event_id = guests.event_id 
      AND checkin_stations.is_active = true
    )
  );

-- Fix public check-in policy - restrict to only valid stations
DROP POLICY IF EXISTS "Public can check in guests" ON public.guests;

CREATE POLICY "Public can check in guests via stations" 
  ON public.guests FOR UPDATE TO anon
  USING (
    EXISTS (
      SELECT 1 FROM checkin_stations 
      WHERE checkin_stations.event_id = guests.event_id 
      AND checkin_stations.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checkin_stations 
      WHERE checkin_stations.event_id = guests.event_id 
      AND checkin_stations.is_active = true
    )
  );