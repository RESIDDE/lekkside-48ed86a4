-- Create email_verifications table for OTP storage
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  form_id uuid REFERENCES event_forms(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for anonymous access (public form submissions)
CREATE POLICY "Anyone can create verification" 
  ON public.email_verifications FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can view verification" 
  ON public.email_verifications FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can update verification" 
  ON public.email_verifications FOR UPDATE TO anon 
  USING (true) WITH CHECK (true);

-- Index for efficient lookups
CREATE INDEX idx_email_verifications_lookup 
  ON public.email_verifications(email, code, form_id);