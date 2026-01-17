import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CustomField } from "./FormFieldsEditor";

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  customFields: CustomField[];
}

export const FormPreviewDialog = ({
  open,
  onOpenChange,
  formName,
  customFields,
}: FormPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Preview</DialogTitle>
        </DialogHeader>

        <div className="border-2 border-dashed border-muted rounded-2xl p-4 bg-muted/20">
          <Card className="rounded-2xl pointer-events-none">
            <CardHeader>
              <CardTitle>{formName}</CardTitle>
              <CardDescription>Fill in your details to register</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input placeholder="John" className="rounded-xl" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input placeholder="Doe" className="rounded-xl" disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="john@example.com" className="rounded-xl" disabled />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input placeholder="+1 234 567 8900" className="rounded-xl" disabled />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any special requirements or notes..."
                  className="rounded-xl resize-none"
                  rows={3}
                  disabled
                />
              </div>

              {/* Custom Fields */}
              {customFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label} {field.required && "*"}
                  </Label>
                  {field.type === "text" && (
                    <Input
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      className="rounded-xl"
                      disabled
                    />
                  )}
                  {field.type === "textarea" && (
                    <Textarea
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      className="rounded-xl resize-none"
                      rows={3}
                      disabled
                    />
                  )}
                  {field.type === "select" && (
                    <Select disabled>
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
                      <Checkbox disabled />
                      <span className="text-sm text-muted-foreground">Yes</span>
                    </div>
                  )}
                </div>
              ))}

              <Button className="w-full min-h-[44px] rounded-2xl" disabled>
                Register
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                * Required fields. Please provide either an email or phone number.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
