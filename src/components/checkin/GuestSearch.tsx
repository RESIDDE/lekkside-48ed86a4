import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GuestSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function GuestSearch({ value, onChange }: GuestSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search by name, email, phone, or any field..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-12 text-lg"
      />
    </div>
  );
}
