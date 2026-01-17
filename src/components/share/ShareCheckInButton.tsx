import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ShareCheckInButtonProps {
  eventId: string;
}

export function ShareCheckInButton({ eventId }: ShareCheckInButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const checkInUrl = `${window.location.origin}/checkin/${eventId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Check-in link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share Check-in Link</span>
          <span className="sm:hidden">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Check-in Link</DialogTitle>
          <DialogDescription>
            Share this link with your check-in team or volunteers. They can check guests in but cannot import, export, or delete data.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={checkInUrl}
            className="flex-1 text-sm"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
