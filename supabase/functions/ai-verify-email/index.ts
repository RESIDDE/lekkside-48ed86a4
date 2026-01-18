import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyEmailRequest {
  email: string;
}

interface EmailValidationResult {
  isValid: boolean;
  issues: string[];
  suggestion?: string;
  confidence: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as VerifyEmailRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying email: ${email}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an email validation assistant. Analyze the provided email address and return a JSON object with your assessment.

Check for:
1. Format validity (proper email format with @ and domain)
2. Common typos in popular domains (e.g., gmial.com → gmail.com, hotmial.com → hotmail.com, outlok.com → outlook.com, yaho.com → yahoo.com)
3. Disposable/temporary email domains (e.g., tempmail.com, 10minutemail.com, guerrillamail.com, throwaway.email, mailinator.com, temp-mail.org)
4. Suspicious patterns (e.g., test@test.com, fake@fake.com, asdf@asdf.com, 123456@, aaaaaa@)
5. Obviously fake usernames (e.g., noreply@, admin@ with consumer domains, root@, test@)

Return ONLY a valid JSON object with this exact structure:
{
  "isValid": boolean,
  "issues": ["array of issue descriptions"],
  "suggestion": "corrected email if typo detected, otherwise null",
  "confidence": number between 0-100
}

Be strict but fair. Real-looking emails from major providers (gmail, outlook, yahoo, icloud, etc.) with normal usernames should pass with high confidence.`
          },
          {
            role: "user",
            content: `Analyze this email address: ${email}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fallback to basic validation if AI fails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidFormat = emailRegex.test(email);
      return new Response(
        JSON.stringify({
          isValid: isValidFormat,
          issues: isValidFormat ? [] : ['Invalid email format'],
          suggestion: null,
          confidence: isValidFormat ? 70 : 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse));

    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response');
      // Fallback to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidFormat = emailRegex.test(email);
      return new Response(
        JSON.stringify({
          isValid: isValidFormat,
          issues: isValidFormat ? [] : ['Invalid email format'],
          suggestion: null,
          confidence: isValidFormat ? 70 : 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the AI response
    let result: EmailValidationResult;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidFormat = emailRegex.test(email);
      result = {
        isValid: isValidFormat,
        issues: isValidFormat ? [] : ['Invalid email format'],
        suggestion: undefined,
        confidence: isValidFormat ? 70 : 0
      };
    }

    console.log('Validation result:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error verifying email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
