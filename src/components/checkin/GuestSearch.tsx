import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GuestSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function GuestSearch({ value, onChange }: GuestSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search guests..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 pr-12 h-14 text-base sm:text-lg rounded-2xl bg-card border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
