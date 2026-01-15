import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

interface ColumnMapperProps {
  headers: string[];
  rows: string[][];
  onImport: (guests: any[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

const FIELD_OPTIONS = [
  { value: 'skip', label: "Don't import" },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'ticket_type', label: 'Ticket Type' },
  { value: 'ticket_number', label: 'Ticket Number' },
  { value: 'notes', label: 'Notes' },
];

const AUTO_MAP_RULES: Record<string, string[]> = {
  first_name: ['first name', 'firstname', 'first', 'given name', 'forename'],
  last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'tel'],
  ticket_type: ['ticket type', 'type', 'ticket', 'category', 'admission'],
  ticket_number: ['ticket number', 'ticket id', 'ticket #', 'order number', 'order id', 'confirmation'],
  notes: ['notes', 'note', 'comments', 'comment', 'remarks'],
};

export function ColumnMapper({ headers, rows, onImport, onBack, isLoading }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim();
      
      for (const [field, keywords] of Object.entries(AUTO_MAP_RULES)) {
        if (keywords.some(k => headerLower.includes(k) || k.includes(headerLower))) {
          initial[index] = field;
          break;
        }
      }
      
      if (!initial[index]) {
        initial[index] = 'skip';
      }
    });
    
    return initial;
  });

  const handleImport = () => {
    const guests = rows.map(row => {
      const guest: any = {};
      const customFields: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        const field = mapping[index];
        const value = row[index]?.trim();
        
        if (!value) return;
        
        if (field === 'skip') {
          customFields[header] = value;
        } else {
          guest[field] = value;
        }
      });

      if (Object.keys(customFields).length > 0) {
        guest.custom_fields = customFields;
      }
      
      return guest;
    });
    
    onImport(guests);
  };

  const previewData = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Map each column to the appropriate field. Unmapped columns will be stored as custom fields.
        </p>
        
        <div className="space-y-3">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-1/3 text-sm font-medium truncate" title={header}>
                {header}
              </div>
              <div className="w-1/3">
                <Select
                  value={mapping[index]}
                  onValueChange={(value) => setMapping(prev => ({ ...prev, [index]: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-1/3 text-sm text-muted-foreground truncate" title={previewData[0]?.[index]}>
                {previewData[0]?.[index] || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-2">Preview ({rows.length} rows)</h4>
        <div className="text-sm text-muted-foreground">
          {previewData.map((row, i) => (
            <div key={i} className="truncate">
              {Object.entries(mapping)
                .filter(([, field]) => field !== 'skip')
                .map(([index, field]) => `${FIELD_OPTIONS.find(f => f.value === field)?.label}: ${row[parseInt(index)] || '—'}`)
                .join(' | ')}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading ? 'Importing...' : `Import ${rows.length} Guests`}
        </Button>
      </div>
    </div>
  );
}
