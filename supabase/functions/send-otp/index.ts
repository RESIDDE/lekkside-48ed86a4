import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  email: string;
  formId: string;
  eventName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, formId, eventName }: SendOtpRequest = await req.json();

    console.log(`Sending OTP to ${email} for form ${formId}`);

    if (!email || !formId) {
      return new Response(
        JSON.stringify({ error: "Email and formId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify MX records
    const domain = email.split("@")[1];
    try {
      const mxRecords = await Deno.resolveDns(domain, "MX");
      if (!mxRecords || mxRecords.length === 0) {
        return new Response(
          JSON.stringify({ error: "This email domain cannot receive emails. Please use a valid email address." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch (dnsError: any) {
      console.error(`MX lookup failed for ${domain}:`, dnsError.message);
      return new Response(
        JSON.stringify({ error: "This email domain does not exist or cannot receive emails. Please check your email address." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting
    const { data: recentCode } = await supabase
      .from("email_verifications")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .eq("form_id", formId)
      .gte("created_at", new Date(Date.now() - 60000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentCode) {
      const waitTime = Math.ceil((60000 - (Date.now() - new Date(recentCode.created_at).getTime())) / 1000);
      return new Response(
        JSON.stringify({ error: `Please wait ${waitTime} seconds before requesting a new code` }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up old codes
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("form_id", formId)
      .eq("verified", false);

    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email: email.toLowerCase(),
        code,
        form_id: formId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert verification record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lekkside Check-in Portal <onboarding@resend.dev>",
        to: [email],
        subject: `Your verification code for ${eventName || "event registration"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Verify your email</h1>
            <p style="color: #666; font-size: 16px; margin-bottom: 24px;">
              Use the following code to verify your email address for ${eventName || "event registration"}:
            </p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
            </div>
            <p style="color: #999; font-size: 14px;">
              This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.`,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);

      // Clean up verification record since email failed
      await supabase
        .from("email_verifications")
        .delete()
        .eq("email", email.toLowerCase())
        .eq("form_id", formId)
        .eq("code", code);

      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`Email sent successfully via Resend, ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        debugCode: code
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
