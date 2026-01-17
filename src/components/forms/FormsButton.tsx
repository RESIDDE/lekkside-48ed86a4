import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormsDialog } from "./FormsDialog";

interface FormsButtonProps {
  eventId: string;
}

export const FormsButton = ({ eventId }: FormsButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="min-h-[44px] rounded-2xl"
        onClick={() => setOpen(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Forms
      </Button>
      <FormsDialog eventId={eventId} open={open} onOpenChange={setOpen} />
    </>
  );
};
