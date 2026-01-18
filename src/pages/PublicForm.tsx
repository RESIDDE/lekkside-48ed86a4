import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicForm, type CustomField } from "@/hooks/useForms";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, MapPin, CheckCircle, Loader2, CheckCircle2, Mail } from "lucide-react";
import { format } from "date-fns";
import lekkLogo from "@/assets/lekkside-logo.png";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

const PublicForm = () => {
  const { formId } = useParams<{ formId: string }>();
  const { form, isLoading, error } = usePublicForm(formId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean>>({});

  // OTP Email verification state
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'verified' | 'error'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const customFields = ((form?.custom_fields as unknown) as CustomField[]) || [];
  const event = form?.events as any;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(r => r - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleChange = (field: keyof FormData, value: string) => {
    // Reset email verification if email changes
    if (field === "email") {
      setEmailStatus('idle');
      setOtpCode('');
      setOtpError('');
      setResendCountdown(0);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string | boolean) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const sendOtp = async () => {
    const email = formData.email.trim();
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setEmailStatus('sending');
    setOtpError('');
    setOtpCode('');

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, formId, eventName: event?.name }
      });

      if (error) {
        console.error('Send OTP error:', error);
        setEmailStatus('error');
        setOtpError('Failed to send verification code');
        return;
      }

      if (data?.error) {
        setEmailStatus('error');
        setOtpError(data.error);
        return;
      }

      setEmailStatus('sent');
      setResendCountdown(60);
      
      // DEBUG MODE: Auto-fill OTP if returned (for testing while DNS is being configured)
      if (data?.debugCode) {
        console.log('Debug mode: Auto-filling OTP code');
        setOtpCode(data.debugCode);
        // Auto-verify after a short delay to show the UI
        setTimeout(() => {
          verifyOtp(data.debugCode);
        }, 500);
        toast.success("Debug mode: Code auto-filled for testing");
      } else {
        toast.success("Verification code sent to your email");
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setEmailStatus('error');
      setOtpError('Failed to send verification code');
    }
  };

  const verifyOtp = async (code: string) => {
    if (code.length !== 6) return;

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email: formData.email.trim(), code, formId }
      });

      if (error) {
        console.error('Verify OTP error:', error);
        setOtpError('Failed to verify code');
        setIsVerifyingOtp(false);
        return;
      }

      if (data?.error) {
        setOtpError(data.error);
        setIsVerifyingOtp(false);
        return;
      }

      setEmailStatus('verified');
      setIsVerifyingOtp(false);
      toast.success("Email verified successfully!");
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setOtpError('Failed to verify code');
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    setOtpError('');
    if (value.length === 6) {
      verifyOtp(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("Please enter your first and last name");
      return;
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      toast.error("Please enter either an email or phone number");
      return;
    }

    // Block submission if email is provided but not verified
    if (formData.email.trim() && emailStatus !== 'verified') {
      toast.error("Please verify your email address before submitting");
      return;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.required) {
        const value = customFieldValues[field.id];
        if (value === undefined || value === "" || value === false) {
          toast.error(`Please fill in the required field: ${field.label}`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare custom fields data with labels as keys for better readability
      const customFieldsData: Record<string, string | boolean> = {};
      for (const field of customFields) {
        const value = customFieldValues[field.id];
        if (value !== undefined && value !== "") {
          customFieldsData[field.label] = value;
        }
      }

      const { error } = await supabase.from("guests").insert({
        event_id: form.event_id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null,
        registered_via: formId,
        custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Registration successful!");
    } catch (err: any) {
      toast.error("Registration failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md rounded-2xl">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Form Not Available</h2>
            <p className="text-muted-foreground">
              This registration form is no longer active or doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-center">
            <img src={lekkLogo} alt="Lekkside" className="h-8" />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-2xl">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold">You're Registered!</h2>
              <p className="text-muted-foreground">
                Thank you, <strong>{formData.first_name}</strong>! You've successfully registered for <strong>{event?.name}</strong>. 
                We look forward to seeing you there!
              </p>
              {event?.date && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(event.date), "PPP 'at' p")}</span>
                </div>
              )}
              {event?.venue && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.venue}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Can submit if: has name AND (email is verified OR has phone without email)
  const canSubmit = 
    formData.first_name.trim() && 
    formData.last_name.trim() && 
    (
      (formData.email.trim() && emailStatus === 'verified') ||
      (!formData.email.trim() && formData.phone.trim().length > 0)
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-center">
          <img src={lekkLogo} alt="Lekkside" className="h-8" />
        </div>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Event Info */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">{event?.name}</h1>
          {event?.description && (
            <p className="text-muted-foreground mb-3">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {event?.date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.date), "PPP 'at' p")}</span>
              </div>
            )}
            {event?.venue && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Registration Form */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{form.name}</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    placeholder="John"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    placeholder="Doe"
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Email Field with OTP Verification */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john@example.com"
                    className={`rounded-xl flex-1 ${
                      emailStatus === 'verified' ? 'border-green-500' :
                      emailStatus === 'error' ? 'border-destructive' :
                      ''
                    }`}
                    disabled={emailStatus === 'verified'}
                  />
                  {emailStatus !== 'verified' && formData.email.includes('@') && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendOtp}
                      disabled={emailStatus === 'sending' || resendCountdown > 0}
                      className="shrink-0"
                    >
                      {emailStatus === 'sending' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : resendCountdown > 0 ? (
                        `${resendCountdown}s`
                      ) : emailStatus === 'sent' ? (
                        'Resend'
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  )}
                  {emailStatus === 'verified' && (
                    <div className="flex items-center px-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>

                {/* OTP Input - shown after code is sent */}
                {emailStatus === 'sent' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>Enter the 6-digit code sent to {formData.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      💡 Check your spam/junk folder if you don't see it within 2 minutes
                    </p>
                    <div className="flex justify-center">
                      <InputOTP 
                        maxLength={6} 
                        value={otpCode} 
                        onChange={handleOtpChange}
                        disabled={isVerifyingOtp}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {isVerifyingOtp && (
                      <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                      </p>
                    )}
                    {otpError && (
                      <p className="text-sm text-destructive text-center">{otpError}</p>
                    )}
                  </div>
                )}

                {/* Error state */}
                {emailStatus === 'error' && (
                  <p className="text-sm text-destructive">{otpError}</p>
                )}

                {/* Verified state */}
                {emailStatus === 'verified' && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Email verified
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Any special requirements or notes..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              {/* Custom Fields */}
              {customFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label} {field.required && "*"}
                  </Label>
                  {field.type === "text" && (
                    <Input
                      id={field.id}
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="rounded-xl"
                      required={field.required}
                    />
                  )}
                  {field.type === "textarea" && (
                    <Textarea
                      id={field.id}
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="rounded-xl resize-none"
                      rows={3}
                      required={field.required}
                    />
                  )}
                  {field.type === "select" && (
                    <Select
                      value={(customFieldValues[field.id] as string) || ""}
                      onValueChange={(value) => handleCustomFieldChange(field.id, value)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === "checkbox" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={field.id}
                        checked={(customFieldValues[field.id] as boolean) || false}
                        onCheckedChange={(checked) => handleCustomFieldChange(field.id, !!checked)}
                      />
                      <Label htmlFor={field.id} className="font-normal cursor-pointer">
                        {field.placeholder || field.label}
                      </Label>
                    </div>
                  )}
                </div>
              ))}

              <p className="text-xs text-muted-foreground">
                * Email or phone number is required
              </p>

              <Button
                type="submit"
                className="w-full rounded-xl min-h-[44px]"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicForm;
