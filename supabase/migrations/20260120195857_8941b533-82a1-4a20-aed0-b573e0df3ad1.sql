-- Add purpose column to email_verifications table
ALTER TABLE public.email_verifications 
ADD COLUMN purpose text NOT NULL DEFAULT 'registration';

-- Add index for faster lookups
CREATE INDEX idx_email_verifications_purpose ON public.email_verifications(purpose);

-- Update RLS policy to allow auth purpose verifications
-- (existing policies already allow public access for insert/select/update)