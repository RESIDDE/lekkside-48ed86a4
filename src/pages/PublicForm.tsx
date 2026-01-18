import { useState } from "react";
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
import { Calendar, MapPin, CheckCircle, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import lekkLogo from "@/assets/lekkside-logo.png";

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

interface EmailFeedback {
  issues: string[];
  suggestion?: string;
  confidence: number;
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

  // AI Email verification state
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'valid' | 'warning' | 'invalid'>('idle');
  const [emailFeedback, setEmailFeedback] = useState<EmailFeedback | null>(null);

  const customFields = ((form?.custom_fields as unknown) as CustomField[]) || [];

  const handleChange = (field: keyof FormData, value: string) => {
    // Reset email verification if email changes
    if (field === "email") {
      setEmailStatus('idle');
      setEmailFeedback(null);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string | boolean) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const verifyEmailWithAI = async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-verify-email', {
        body: { email: trimmedEmail }
      });

      if (error) {
        console.error('AI verification error:', error);
        // Fallback: allow submission but show warning
        setEmailStatus('warning');
        setEmailFeedback({
          issues: ['Could not verify email automatically'],
          confidence: 50
        });
        return;
      }

      const { isValid, issues, suggestion, confidence } = data;
      setEmailFeedback({ issues: issues || [], suggestion, confidence: confidence || 0 });

      if (!isValid) {
        setEmailStatus('invalid');
      } else if ((issues && issues.length > 0) || confidence < 80) {
        setEmailStatus('warning');
      } else {
        setEmailStatus('valid');
      }
    } catch (err) {
      console.error('Error calling AI verification:', err);
      setEmailStatus('warning');
      setEmailFeedback({
        issues: ['Could not verify email automatically'],
        confidence: 50
      });
    }
  };

  const acceptSuggestion = () => {
    if (emailFeedback?.suggestion) {
      setFormData(prev => ({ ...prev, email: emailFeedback.suggestion! }));
      setEmailStatus('idle');
      setEmailFeedback(null);
      // Re-verify with the new email
      setTimeout(() => verifyEmailWithAI(emailFeedback.suggestion!), 100);
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

    // Block submission if email is being verified or is invalid
    if (formData.email.trim() && (emailStatus === 'checking' || emailStatus === 'invalid')) {
      if (emailStatus === 'checking') {
        toast.error("Please wait for email verification to complete");
      } else {
        toast.error("Please fix the email address issues before submitting");
      }
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

  // Can submit if: has name AND (email is valid/warning/idle OR has phone)
  const canSubmit = 
    formData.first_name.trim() && 
    formData.last_name.trim() && 
    (
      (formData.email.trim() && emailStatus !== 'invalid' && emailStatus !== 'checking') ||
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

              {/* Email Field with AI Verification */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => verifyEmailWithAI(formData.email)}
                    placeholder="john@example.com"
                    className={`rounded-xl pr-10 ${
                      emailStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' :
                      emailStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' :
                      emailStatus === 'warning' ? 'border-amber-500 focus-visible:ring-amber-500' :
                      ''
                    }`}
                  />
                  {emailStatus === 'checking' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {emailStatus === 'valid' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                  )}
                  {emailStatus === 'warning' && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                  )}
                  {emailStatus === 'invalid' && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  )}
                </div>
                
                {/* AI Verification Feedback */}
                {emailStatus === 'checking' && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> AI is verifying...
                  </p>
                )}
                {emailStatus === 'valid' && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Email looks valid
                  </p>
                )}
                {emailStatus === 'warning' && emailFeedback && (
                  <div className="text-sm text-amber-600 space-y-1">
                    <p className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Potential issues:
                    </p>
                    {emailFeedback.issues.length > 0 && (
                      <ul className="text-xs ml-4 space-y-0.5">
                        {emailFeedback.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                    {emailFeedback.suggestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={acceptSuggestion}
                        className="text-xs h-7 mt-1"
                      >
                        Did you mean: {emailFeedback.suggestion}?
                      </Button>
                    )}
                  </div>
                )}
                {emailStatus === 'invalid' && emailFeedback && (
                  <div className="text-sm text-red-600 space-y-1">
                    <p className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Invalid email:
                    </p>
                    {emailFeedback.issues.length > 0 && (
                      <ul className="text-xs ml-4 space-y-0.5">
                        {emailFeedback.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                    {emailFeedback.suggestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={acceptSuggestion}
                        className="text-xs h-7 mt-1"
                      >
                        Did you mean: {emailFeedback.suggestion}?
                      </Button>
                    )}
                  </div>
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
                * Required fields. Please provide either an email or phone number.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicForm;
