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
import { Calendar, MapPin, CheckCircle, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import lekkLogo from "@/assets/lekkside-logo.png";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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

  // OTP verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const customFields = ((form?.custom_fields as unknown) as CustomField[]) || [];

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset OTP state when email changes
  useEffect(() => {
    if (emailVerified || otpSent) {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpCode("");
      setOtpError("");
    }
  }, [formData.email]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string | boolean) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSendOtp = async () => {
    if (!formData.email.trim()) {
      toast.error("Please enter an email address first");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");

    try {
      const event = form?.events as any;
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: {
          email: formData.email,
          formId: formId,
          eventName: event?.name || "Event Registration",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOtpSent(true);
      setResendCooldown(60);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setOtpError(err.message || "Failed to send verification code");
      toast.error(err.message || "Failed to send verification code");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError("");

    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: {
          email: formData.email,
          code: otpCode,
          formId: formId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEmailVerified(true);
      toast.success("Email verified successfully!");
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setOtpError(err.message || "Invalid verification code");
    } finally {
      setIsVerifyingOtp(false);
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

    // Check if email is provided but not verified
    if (formData.email.trim() && !emailVerified) {
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

  const event = form.events as any;

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
                Thank you for registering for <strong>{event?.name}</strong>. 
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

  const canSubmit = formData.email.trim() ? emailVerified : formData.phone.trim().length > 0;

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
                  <div className="relative flex-1">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="john@example.com"
                      className="rounded-xl pr-10"
                      disabled={emailVerified}
                    />
                    {emailVerified && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                    )}
                  </div>
                  {!emailVerified && formData.email.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || resendCooldown > 0}
                      className="rounded-xl whitespace-nowrap"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : resendCooldown > 0 ? (
                        `${resendCooldown}s`
                      ) : otpSent ? (
                        "Resend"
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-1" />
                          Verify
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {emailVerified && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Email verified
                  </p>
                )}
              </div>

              {/* OTP Input Section */}
              {otpSent && !emailVerified && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                  <Label>Enter verification code</Label>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to {formData.email}
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={(value) => {
                        setOtpCode(value);
                        setOtpError("");
                      }}
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
                    {otpError && (
                      <p className="text-sm text-destructive">{otpError}</p>
                    )}
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otpCode.length !== 6}
                      className="rounded-xl"
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </div>
                </div>
              )}

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
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      className="rounded-xl"
                      required={field.required}
                    />
                  )}
                  {field.type === "textarea" && (
                    <Textarea
                      id={field.id}
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      className="rounded-xl resize-none"
                      rows={3}
                      required={field.required}
                    />
                  )}
                  {field.type === "select" && (
                    <Select
                      value={(customFieldValues[field.id] as string) || ""}
                      onValueChange={(value) => handleCustomFieldChange(field.id, value)}
                      required={field.required}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
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
                      <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                        Yes
                      </Label>
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="submit"
                className="w-full min-h-[44px] rounded-2xl"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                * Required fields. {formData.email.trim() ? "Please verify your email to continue." : "Please provide either an email or phone number."}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicForm;
