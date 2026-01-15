import { useState } from 'react';
import { Upload, FileSpreadsheet, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useImportGuests } from '@/hooks/useGuests';
import { useToast } from '@/hooks/use-toast';
import { ColumnMapper } from './ColumnMapper';

interface ImportDialogProps {
  eventId: string;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
}

export function ImportDialog({ eventId }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [pasteData, setPasteData] = useState('');
  const importGuests = useImportGuests();
  const { toast } = useToast();

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(/[,\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(/[,\t]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
      return values;
    }).filter(row => row.some(cell => cell.length > 0));
    
    return { headers, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    if (!pasteData.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste some data first.',
        variant: 'destructive',
      });
      return;
    }
    const data = parseCSV(pasteData);
    setParsedData(data);
  };

  const handleImport = async (mappedGuests: any[]) => {
    try {
      await importGuests.mutateAsync({
        eventId,
        guests: mappedGuests,
      });
      
      toast({
        title: 'Import successful',
        description: `${mappedGuests.length} guests have been imported.`,
      });
      
      setOpen(false);
      setParsedData(null);
      setPasteData('');
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'There was an error importing the guests. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => {
    setParsedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Guests
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parsedData ? 'Map Columns' : 'Import Guest List'}
          </DialogTitle>
        </DialogHeader>

        {parsedData ? (
          <ColumnMapper
            headers={parsedData.headers}
            rows={parsedData.rows}
            onImport={handleImport}
            onBack={handleBack}
            isLoading={importGuests.isPending}
          />
        ) : (
          <Tabs defaultValue="file" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="paste">
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Paste Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a CSV or Excel file with your guest list
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose File
                  </label>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paste-data">
                  Paste your data (CSV format or tab-separated from spreadsheet)
                </Label>
                <Textarea
                  id="paste-data"
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Name,Email,Phone,Ticket Type&#10;John Doe,john@example.com,555-1234,VIP&#10;Jane Smith,jane@example.com,555-5678,General"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handlePaste} className="w-full">
                Parse Data
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
