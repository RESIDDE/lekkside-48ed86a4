-- Create checkin_stations table
CREATE TABLE public.checkin_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add checked_in_by_station column to guests table
ALTER TABLE public.guests 
ADD COLUMN checked_in_by_station UUID REFERENCES public.checkin_stations(id) ON DELETE SET NULL;

-- Enable RLS on checkin_stations
ALTER TABLE public.checkin_stations ENABLE ROW LEVEL SECURITY;

-- RLS policies for checkin_stations
CREATE POLICY "Authenticated users can view all stations"
ON public.checkin_stations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view active stations"
ON public.checkin_stations
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can create stations"
ON public.checkin_stations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stations"
ON public.checkin_stations
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stations"
ON public.checkin_stations
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_checkin_stations_updated_at
BEFORE UPDATE ON public.checkin_stations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();