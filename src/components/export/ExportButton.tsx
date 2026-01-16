import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Guest = Tables<'guests'>;

interface ExportButtonProps {
  guests: Guest[];
  eventName: string;
}

export function ExportButton({ guests, eventName }: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (!guests || guests.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no guests to export.',
        variant: 'destructive',
      });
      return;
    }

    // Define CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Ticket Type',
      'Ticket Number',
      'Notes',
      'Checked In',
      'Checked In At',
    ];

    // Convert guests to CSV rows
    const rows = guests.map(guest => [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      guest.ticket_type || '',
      guest.ticket_number || '',
      guest.notes || '',
      guest.checked_in ? 'Yes' : 'No',
      guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString() : '',
    ]);

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Sanitize event name for filename
    const sanitizedName = eventName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    link.download = `${sanitizedName}_guests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `${guests.length} guests exported to CSV.`,
    });
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export
    </Button>
  );
}