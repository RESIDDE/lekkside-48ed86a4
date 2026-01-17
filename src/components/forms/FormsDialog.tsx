import { useState } from "react";
import { Plus, Link2, Trash2, ToggleLeft, ToggleRight, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForms, useFormRegistrationCount } from "@/hooks/useForms";
import { toast } from "sonner";

interface FormsDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FormsDialog = ({ eventId, open, onOpenChange }: FormsDialogProps) => {
  const { forms, isLoading, createForm, toggleFormActive, deleteForm } = useForms(eventId);
  const [newFormName, setNewFormName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateForm = async () => {
    if (!newFormName.trim()) {
      toast.error("Please enter a form name");
      return;
    }
    await createForm.mutateAsync(newFormName.trim());
    setNewFormName("");
    setIsCreating(false);
  };

  const copyFormLink = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(url);
    toast.success("Form link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registration Forms</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new form section */}
          {isCreating ? (
            <div className="space-y-3 p-4 border rounded-2xl bg-muted/50">
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="e.g., VIP Registration"
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && handleCreateForm()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateForm}
                  disabled={createForm.isPending}
                  className="rounded-xl flex-1"
                >
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFormName("");
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
              className="w-full min-h-[44px] rounded-2xl"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Form
            </Button>
          )}

          {/* Forms list */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading forms...</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No forms created yet</p>
              <p className="text-sm">Create a form to start collecting registrations</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {forms.map((form) => (
                <FormItem
                  key={form.id}
                  form={form}
                  onCopyLink={() => copyFormLink(form.id)}
                  onToggle={() => toggleFormActive.mutate({ formId: form.id, isActive: !form.is_active })}
                  onDelete={() => deleteForm.mutate(form.id)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FormItemProps {
  form: {
    id: string;
    name: string;
    is_active: boolean;
  };
  onCopyLink: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const FormItem = ({ form, onCopyLink, onToggle, onDelete }: FormItemProps) => {
  const registrationCount = useFormRegistrationCount(form.id);

  return (
    <div className="p-4 border rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{form.name}</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{registrationCount} registrations</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              form.is_active 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl"
          onClick={onCopyLink}
          disabled={!form.is_active}
        >
          <Link2 className="h-3 w-3 mr-1" />
          Copy Link
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl"
          onClick={onToggle}
        >
          {form.is_active ? (
            <ToggleRight className="h-4 w-4 text-green-600" />
          ) : (
            <ToggleLeft className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Need to import FileText for the empty state
import { FileText } from "lucide-react";
