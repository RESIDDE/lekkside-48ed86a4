import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormFieldsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: CustomField[];
  onSave: (fields: CustomField[]) => Promise<void>;
  isSaving: boolean;
}

export const FormFieldsEditor = ({
  open,
  onOpenChange,
  fields: initialFields,
  onSave,
  isSaving,
}: FormFieldsEditorProps) => {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    label: "",
    type: "text",
    required: false,
    options: [],
    placeholder: "",
  });
  const [optionsInput, setOptionsInput] = useState("");

  const handleAddField = () => {
    if (!newField.label?.trim()) {
      toast.error("Please enter a field label");
      return;
    }

    if (newField.type === "select" && (!newField.options || newField.options.length < 2)) {
      toast.error("Please add at least 2 options for dropdown fields");
      return;
    }

    const field: CustomField = {
      id: crypto.randomUUID(),
      label: newField.label.trim(),
      type: newField.type as CustomField["type"],
      required: newField.required || false,
      placeholder: newField.placeholder?.trim(),
      options: newField.type === "select" ? newField.options : undefined,
    };

    setFields([...fields, field]);
    setNewField({
      label: "",
      type: "text",
      required: false,
      options: [],
      placeholder: "",
    });
    setOptionsInput("");
    setIsAddingField(false);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleOptionsChange = (value: string) => {
    setOptionsInput(value);
    const options = value.split(",").map((o) => o.trim()).filter(Boolean);
    setNewField((prev) => ({ ...prev, options }));
  };

  const handleSave = async () => {
    await onSave(fields);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Custom Fields</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Info about default fields */}
          <div className="p-3 bg-muted/50 rounded-xl text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Default Fields (always included):</p>
            <p>First Name, Last Name, Email, Phone, Notes</p>
          </div>

          {/* Current custom fields */}
          {fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Fields</Label>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-3 border rounded-xl bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{field.label}</span>
                        {field.required && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{field.type}</span>
                        {field.type === "select" && field.options && (
                          <span>• {field.options.length} options</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new field */}
          {isAddingField ? (
            <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="field-label">Field Label</Label>
                <Input
                  id="field-label"
                  value={newField.label || ""}
                  onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Company Name"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value) => setNewField((prev) => ({ ...prev, type: value as CustomField["type"] }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newField.type === "select" && (
                <div className="space-y-2">
                  <Label htmlFor="field-options">Options (comma-separated)</Label>
                  <Input
                    id="field-options"
                    value={optionsInput}
                    onChange={(e) => handleOptionsChange(e.target.value)}
                    placeholder="e.g., Option 1, Option 2, Option 3"
                    className="rounded-xl"
                  />
                </div>
              )}

              {(newField.type === "text" || newField.type === "textarea") && (
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
                  <Input
                    id="field-placeholder"
                    value={newField.placeholder || ""}
                    onChange={(e) => setNewField((prev) => ({ ...prev, placeholder: e.target.value }))}
                    placeholder="e.g., Enter your company name"
                    className="rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="field-required">Required</Label>
                <Switch
                  id="field-required"
                  checked={newField.required || false}
                  onCheckedChange={(checked) => setNewField((prev) => ({ ...prev, required: checked }))}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddField} className="flex-1 rounded-xl">
                  Add Field
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingField(false);
                    setNewField({
                      label: "",
                      type: "text",
                      required: false,
                      options: [],
                      placeholder: "",
                    });
                    setOptionsInput("");
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full min-h-[44px] rounded-xl"
              onClick={() => setIsAddingField(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
