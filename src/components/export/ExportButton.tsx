import { Download, ChevronDown, Check, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Guest = Tables<'guests'>;

type ExportFilter = 'all' | 'checked-in' | 'pending';

interface ExportButtonProps {
  guests: Guest[];
  eventName: string;
}

export function ExportButton({ guests, eventName }: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = (filter: ExportFilter) => {
    if (!guests || guests.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no guests to export.',
        variant: 'destructive',
      });
      return;
    }

    // Filter guests based on selection
    let filteredGuests = guests;
    let filterSuffix = '';
    
    switch (filter) {
      case 'checked-in':
        filteredGuests = guests.filter(g => g.checked_in);
        filterSuffix = '_checked_in';
        break;
      case 'pending':
        filteredGuests = guests.filter(g => !g.checked_in);
        filterSuffix = '_pending';
        break;
      default:
        filterSuffix = '_all';
    }

    if (filteredGuests.length === 0) {
      toast({
        title: 'No data to export',
        description: `There are no ${filter === 'checked-in' ? 'checked-in' : 'pending'} guests to export.`,
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
    const rows = filteredGuests.map(guest => [
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
    
    link.download = `${sanitizedName}${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const filterLabel = filter === 'all' ? '' : filter === 'checked-in' ? ' checked-in' : ' pending';
    toast({
      title: 'Export successful',
      description: `${filteredGuests.length}${filterLabel} guests exported to CSV.`,
    });
  };

  const checkedInCount = guests.filter(g => g.checked_in).length;
  const pendingCount = guests.filter(g => !g.checked_in).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Download className="w-4 h-4 mr-2" />
          Export
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('all')}>
          <Users className="w-4 h-4 mr-2" />
          All Guests ({guests.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('checked-in')}>
          <Check className="w-4 h-4 mr-2" />
          Checked In ({checkedInCount})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pending')}>
          <Clock className="w-4 h-4 mr-2" />
          Pending ({pendingCount})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}