-- Add custom_fields column to event_forms table for storing field definitions
ALTER TABLE public.event_forms ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;