import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, newPassword }: ResetPasswordRequest = await req.json();

    console.log(`Verifying password reset OTP for ${email}`);

    if (!email || !code || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email, code, and new password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid verification record
    const { data: verification, error: verifyError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("purpose", "password_reset")
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (verifyError || !verification) {
      console.log(`Invalid or expired OTP for ${email}`);
      return new Response(
        JSON.stringify({ error: "Invalid or expired code. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark verification as used
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    // Find user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "An error occurred. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      console.log(`No user found with email ${email}`);
      return new Response(
        JSON.stringify({ error: "No account found with this email." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password reset successful for ${email}`);

    // Clean up old verification records for this email
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("purpose", "password_reset");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password has been reset successfully. You can now sign in with your new password."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
