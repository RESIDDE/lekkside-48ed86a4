import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface EventForm {
  id: string;
  event_id: string;
  name: string;
  is_active: boolean;
  custom_fields: CustomField[];
  created_at: string;
  updated_at: string;
}

export const useForms = (eventId: string) => {
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["forms", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to properly type custom_fields
      return (data || []).map((form) => ({
        ...form,
        custom_fields: (form.custom_fields as unknown as CustomField[]) || [],
      })) as EventForm[];
    },
    enabled: !!eventId,
  });

  const createForm = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("event_forms")
        .insert({ event_id: eventId, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", eventId] });
      toast.success("Form created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create form: " + error.message);
    },
  });

  const toggleFormActive = useMutation({
    mutationFn: async ({ formId, isActive }: { formId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("event_forms")
        .update({ is_active: isActive })
        .eq("id", formId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", eventId] });
      toast.success("Form updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update form: " + error.message);
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from("event_forms")
        .delete()
        .eq("id", formId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", eventId] });
      toast.success("Form deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete form: " + error.message);
    },
  });

  const updateFormFields = useMutation({
    mutationFn: async ({ formId, customFields }: { formId: string; customFields: CustomField[] }) => {
      const { error } = await supabase
        .from("event_forms")
        .update({ custom_fields: customFields as unknown as null })
        .eq("id", formId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", eventId] });
      toast.success("Form fields updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update form fields: " + error.message);
    },
  });

  return {
    forms,
    isLoading,
    createForm,
    toggleFormActive,
    deleteForm,
    updateFormFields,
  };
};

// Hook for public form page (no auth required)
export const usePublicForm = (formId: string) => {
  const { data: form, isLoading, error } = useQuery({
    queryKey: ["public-form", formId],
    queryFn: async () => {
      // First fetch the form
      const { data: formData, error: formError } = await supabase
        .from("event_forms")
        .select("*")
        .eq("id", formId)
        .eq("is_active", true)
        .single();

      if (formError) throw formError;
      if (!formData) return null;

      // Then fetch the event separately (works better with RLS for anon users)
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", formData.event_id)
        .single();

      // Return form with nested events object for compatibility with existing code
      return {
        ...formData,
        events: eventData,
      };
    },
    enabled: !!formId,
  });

  return { form, isLoading, error };
};

// Get count of registrations via a specific form
export const useFormRegistrationCount = (formId: string) => {
  const { data: count = 0 } = useQuery({
    queryKey: ["form-registrations", formId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("registered_via", formId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!formId,
  });

  return count;
};
