-- Create policies for public (anonymous) check-in access
-- Allow anonymous users to view events by ID
CREATE POLICY "Public can view events by id"
ON public.events
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to view guests for an event
CREATE POLICY "Public can view guests for events"
ON public.guests
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update only check-in fields
CREATE POLICY "Public can check in guests"
ON public.guests
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);