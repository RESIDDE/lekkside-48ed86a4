import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;
  customFields?: Record<string, string | boolean>;
  eventName: string;
  eventDate?: string;
  eventVenue?: string;
  confirmationNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: TicketEmailRequest = await req.json();
    const {
      firstName, lastName, email, phone, notes, customFields,
      eventName, eventDate, eventVenue, confirmationNumber,
    } = data;

    console.log(`Sending confirmation ticket to ${email} for ${eventName}`);

    if (!email || !firstName || !eventName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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
          JSON.stringify({ error: "This email domain cannot receive emails." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch (dnsError: any) {
      console.error(`MX lookup failed for ${domain}:`, dnsError.message);
      return new Response(
        JSON.stringify({ error: "This email domain does not exist or cannot receive emails." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format event date
    let formattedDate = "";
    let formattedTime = "";
    if (eventDate) {
      const date = new Date(eventDate);
      formattedDate = date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }

    // Build custom fields HTML
    let customFieldsHtml = "";
    if (customFields && Object.keys(customFields).length > 0) {
      customFieldsHtml = Object.entries(customFields)
        .map(([label, value]) => {
          const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
          return `<tr><td style="padding: 8px 0; color: #666; font-size: 14px;">${label}</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${displayValue}</td></tr>`;
        })
        .join("");
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 480px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0 0 8px 0; font-size: 24px;">${eventName}</h1>
              <div style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px;">✓ Registration Confirmed</div>
            </div>
            <div style="padding: 24px; text-align: center; border-bottom: 2px dashed #e5e5e5;">
              <p style="margin: 0 0 4px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Attendee</p>
              <h2 style="margin: 0; font-size: 28px; color: #1a1a1a;">${firstName} ${lastName}</h2>
            </div>
            <div style="padding: 24px;">
              ${eventDate ? `<div style="margin-bottom: 16px;"><p style="margin: 0; color: #666; font-size: 12px;">📅 Date & Time</p><p style="margin: 2px 0 0 0; font-weight: 600; color: #1a1a1a;">${formattedDate}</p><p style="margin: 2px 0 0 0; color: #666; font-size: 14px;">${formattedTime}</p></div>` : ""}
              ${eventVenue ? `<div style="margin-bottom: 16px;"><p style="margin: 0; color: #666; font-size: 12px;">📍 Venue</p><p style="margin: 2px 0 0 0; font-weight: 600; color: #1a1a1a;">${eventVenue}</p></div>` : ""}
            </div>
            <div style="padding: 0 24px 24px 24px;">
              <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-top: 2px dashed #e5e5e5; padding-top: 20px;">Registration Details</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${email}</td></tr>
                ${phone ? `<tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Phone</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${phone}</td></tr>` : ""}
                ${notes ? `<tr><td style="padding: 8px 0; color: #666; font-size: 14px;">Notes</td><td style="padding: 8px 0; font-size: 14px; text-align: right;">${notes}</td></tr>` : ""}
                ${customFieldsHtml}
              </table>
            </div>
            <div style="padding: 24px; background: #f9f9f9; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Confirmation Number</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #6366f1; font-family: monospace; letter-spacing: 3px;">${confirmationNumber}</p>
              <p style="margin: 12px 0 0 0; color: #999; font-size: 12px;">Please save this number for check-in</p>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">We look forward to seeing you there!</p>
            <p style="margin: 8px 0 0 0;">Lekkside Check-in Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `REGISTRATION CONFIRMED\n\nThank you, ${firstName}!\n\nYou're registered for: ${eventName}\n${eventDate ? `Date: ${formattedDate} at ${formattedTime}` : ""}\n${eventVenue ? `Venue: ${eventVenue}` : ""}\n\nName: ${firstName} ${lastName}\nEmail: ${email}\n${phone ? `Phone: ${phone}` : ""}\n\nConfirmation Number: ${confirmationNumber}\n\nPlease save this number for check-in.\n\nLekkside Check-in Portal`;

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
        subject: `🎟️ Your Registration for ${eventName} is Confirmed!`,
        html: htmlContent,
        text: plainText,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send confirmation email. Please try again.", details: errorData }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`Confirmation ticket sent via Resend, ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation ticket sent", messageId: resendData.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-ticket function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
