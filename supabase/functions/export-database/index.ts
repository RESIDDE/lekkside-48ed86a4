import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let sql = `-- Lekkside Check-in Portal - Full Database Backup
-- Generated: ${new Date().toISOString()}
-- =============================================

`;

    // Schema creation
    sql += `-- =============================================
-- SCHEMA: Tables
-- =============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  role text DEFAULT 'member'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  date timestamptz,
  venue text,
  capacity integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event forms table
CREATE TABLE IF NOT EXISTS public.event_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  name text NOT NULL DEFAULT 'Registration Form'::text,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checkin stations table
CREATE TABLE IF NOT EXISTS public.checkin_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  first_name text,
  last_name text,
  email text,
  phone text,
  ticket_type text,
  ticket_number text,
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  checked_in_by uuid,
  checked_in_by_station uuid REFERENCES public.checkin_stations(id),
  registered_via uuid REFERENCES public.event_forms(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Email verifications table
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  form_id uuid REFERENCES public.event_forms(id),
  purpose text NOT NULL DEFAULT 'registration'::text,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

`;

    // Functions
    sql += `-- =============================================
-- FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_form_active(form_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_forms WHERE id = form_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

`;

    // RLS policies
    sql += `-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Event owners can update events" ON public.events FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Event owners can delete events" ON public.events FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Event owners can view events" ON public.events FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Public can view events via stations or forms" ON public.events FOR SELECT TO anon USING ((EXISTS (SELECT 1 FROM checkin_stations WHERE checkin_stations.event_id = events.id AND checkin_stations.is_active = true)) OR (EXISTS (SELECT 1 FROM event_forms WHERE event_forms.event_id = events.id AND event_forms.is_active = true)));
CREATE POLICY "Public can view active events" ON public.events FOR SELECT TO anon USING (true);

-- Event forms policies
CREATE POLICY "Authenticated users can view forms" ON public.event_forms FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create forms" ON public.event_forms FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update forms" ON public.event_forms FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete forms" ON public.event_forms FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public can view active forms" ON public.event_forms FOR SELECT TO anon USING (is_active = true);

-- Checkin stations policies
CREATE POLICY "Authenticated users can view all stations" ON public.checkin_stations FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Public can view active stations" ON public.checkin_stations FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated users can create stations" ON public.checkin_stations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update stations" ON public.checkin_stations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete stations" ON public.checkin_stations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Guests policies
CREATE POLICY "Event owners can view guests" ON public.guests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.created_by = auth.uid()));
CREATE POLICY "Event owners can create guests" ON public.guests FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.created_by = auth.uid())) OR (registered_via IS NOT NULL));
CREATE POLICY "Event owners can update guests" ON public.guests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.created_by = auth.uid()));
CREATE POLICY "Event owners can delete guests" ON public.guests FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = guests.event_id AND events.created_by = auth.uid()));
CREATE POLICY "Public can view guests via stations" ON public.guests FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM checkin_stations WHERE checkin_stations.event_id = guests.event_id AND checkin_stations.is_active = true));
CREATE POLICY "Public can check in guests via stations" ON public.guests FOR UPDATE TO anon USING (EXISTS (SELECT 1 FROM checkin_stations WHERE checkin_stations.event_id = guests.event_id AND checkin_stations.is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM checkin_stations WHERE checkin_stations.event_id = guests.event_id AND checkin_stations.is_active = true));
CREATE POLICY "Public can register via forms" ON public.guests FOR INSERT TO anon WITH CHECK ((registered_via IS NOT NULL) AND is_form_active(registered_via));

-- Email verifications policies
CREATE POLICY "Anyone can create verification" ON public.email_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view verification" ON public.email_verifications FOR SELECT USING (true);
CREATE POLICY "Anyone can update verification" ON public.email_verifications FOR UPDATE USING (true) WITH CHECK (true);

`;

    // Data export - profiles
    sql += `-- =============================================
-- DATA
-- =============================================

`;

    // Profiles
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles && profiles.length > 0) {
      sql += `-- Profiles\n`;
      for (const p of profiles) {
        sql += `INSERT INTO public.profiles (id, user_id, full_name, role, created_at, updated_at) VALUES (${escapeSQL(p.id)}, ${escapeSQL(p.user_id)}, ${escapeSQL(p.full_name)}, ${escapeSQL(p.role)}, ${escapeSQL(p.created_at)}, ${escapeSQL(p.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sql += '\n';
    }

    // Events
    const { data: events } = await supabase.from('events').select('*');
    if (events && events.length > 0) {
      sql += `-- Events\n`;
      for (const e of events) {
        sql += `INSERT INTO public.events (id, name, description, date, venue, capacity, created_by, created_at, updated_at) VALUES (${escapeSQL(e.id)}, ${escapeSQL(e.name)}, ${escapeSQL(e.description)}, ${escapeSQL(e.date)}, ${escapeSQL(e.venue)}, ${escapeSQL(e.capacity)}, ${escapeSQL(e.created_by)}, ${escapeSQL(e.created_at)}, ${escapeSQL(e.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sql += '\n';
    }

    // Event forms
    const { data: forms } = await supabase.from('event_forms').select('*');
    if (forms && forms.length > 0) {
      sql += `-- Event Forms\n`;
      for (const f of forms) {
        sql += `INSERT INTO public.event_forms (id, event_id, name, custom_fields, is_active, created_at, updated_at) VALUES (${escapeSQL(f.id)}, ${escapeSQL(f.event_id)}, ${escapeSQL(f.name)}, ${escapeSQL(f.custom_fields)}, ${escapeSQL(f.is_active)}, ${escapeSQL(f.created_at)}, ${escapeSQL(f.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sql += '\n';
    }

    // Checkin stations
    const { data: stations } = await supabase.from('checkin_stations').select('*');
    if (stations && stations.length > 0) {
      sql += `-- Check-in Stations\n`;
      for (const s of stations) {
        sql += `INSERT INTO public.checkin_stations (id, event_id, name, is_active, created_at, updated_at) VALUES (${escapeSQL(s.id)}, ${escapeSQL(s.event_id)}, ${escapeSQL(s.name)}, ${escapeSQL(s.is_active)}, ${escapeSQL(s.created_at)}, ${escapeSQL(s.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sql += '\n';
    }

    // Guests - paginated (1000 at a time)
    sql += `-- Guests\n`;
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .range(offset, offset + batchSize - 1)
        .order('created_at', { ascending: true });
      
      if (!guests || guests.length === 0) break;
      
      for (const g of guests) {
        sql += `INSERT INTO public.guests (id, event_id, first_name, last_name, email, phone, ticket_type, ticket_number, notes, custom_fields, checked_in, checked_in_at, checked_in_by, checked_in_by_station, registered_via, created_at, updated_at) VALUES (${escapeSQL(g.id)}, ${escapeSQL(g.event_id)}, ${escapeSQL(g.first_name)}, ${escapeSQL(g.last_name)}, ${escapeSQL(g.email)}, ${escapeSQL(g.phone)}, ${escapeSQL(g.ticket_type)}, ${escapeSQL(g.ticket_number)}, ${escapeSQL(g.notes)}, ${escapeSQL(g.custom_fields)}, ${escapeSQL(g.checked_in)}, ${escapeSQL(g.checked_in_at)}, ${escapeSQL(g.checked_in_by)}, ${escapeSQL(g.checked_in_by_station)}, ${escapeSQL(g.registered_via)}, ${escapeSQL(g.created_at)}, ${escapeSQL(g.updated_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      
      offset += batchSize;
      if (guests.length < batchSize) break;
    }
    sql += '\n';

    // Email verifications
    const { data: verifications } = await supabase.from('email_verifications').select('*');
    if (verifications && verifications.length > 0) {
      sql += `-- Email Verifications\n`;
      for (const v of verifications) {
        sql += `INSERT INTO public.email_verifications (id, email, code, form_id, purpose, verified, expires_at, created_at) VALUES (${escapeSQL(v.id)}, ${escapeSQL(v.email)}, ${escapeSQL(v.code)}, ${escapeSQL(v.form_id)}, ${escapeSQL(v.purpose)}, ${escapeSQL(v.verified)}, ${escapeSQL(v.expires_at)}, ${escapeSQL(v.created_at)}) ON CONFLICT (id) DO NOTHING;\n`;
      }
    }

    sql += `\n-- End of backup\n`;

    return new Response(sql, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="lekkside_backup_${new Date().toISOString().split('T')[0]}.sql"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
