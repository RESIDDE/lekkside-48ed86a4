import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GuestSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function GuestSearch({ value, onChange }: GuestSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync from parent
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce changes to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search guests..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-12 pr-12 h-14 text-base sm:text-lg rounded-2xl bg-card border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
