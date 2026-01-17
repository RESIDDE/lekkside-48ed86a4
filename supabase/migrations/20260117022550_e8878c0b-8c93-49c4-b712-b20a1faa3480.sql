-- Create event_forms table to store form configurations
CREATE TABLE public.event_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Registration Form',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage forms
CREATE POLICY "Authenticated users can view forms"
ON public.event_forms FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create forms"
ON public.event_forms FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update forms"
ON public.event_forms FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete forms"
ON public.event_forms FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Public can view active forms (for form submission page)
CREATE POLICY "Public can view active forms"
ON public.event_forms FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_event_forms_updated_at
BEFORE UPDATE ON public.event_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add registered_via column to guests to track form registrations
ALTER TABLE public.guests ADD COLUMN registered_via UUID REFERENCES public.event_forms(id) ON DELETE SET NULL;

-- Public can insert guests via form (for form submissions)
CREATE POLICY "Public can register via forms"
ON public.guests FOR INSERT
WITH CHECK (registered_via IS NOT NULL);