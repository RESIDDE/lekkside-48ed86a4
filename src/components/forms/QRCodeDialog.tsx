import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  formName: string;
}

export const QRCodeDialog = ({ open, onOpenChange, formUrl, formName }: QRCodeDialogProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Add padding for better scanning
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      
      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, padding, padding);
      
      // Download
      const link = document.createElement("a");
      link.download = `${formName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_qrcode.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{formName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div 
            ref={qrRef}
            className="bg-white p-4 rounded-xl shadow-sm"
          >
            <QRCodeSVG 
              value={formUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-center break-all px-4 max-w-full">
            {formUrl}
          </p>

          <Button 
            onClick={handleDownload}
            className="w-full rounded-xl min-h-[44px]"
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
