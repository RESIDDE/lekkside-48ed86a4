import { memo, useState } from 'react';
import { Check, Undo2, User, Mail, Phone, Ticket, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Guest = Tables<'guests'>;

interface GuestCardProps {
  guest: Guest;
  onCheckIn: (guestId: string) => void;
  onUndoCheckIn: (guestId: string) => void;
  isLoading?: boolean;
}

export const GuestCard = memo(function GuestCard({ guest, onCheckIn, onUndoCheckIn, isLoading }: GuestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullName = [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest';
  
  const customFields = guest.custom_fields as Record<string, unknown> | null;
  const hasCustomFields = customFields && Object.keys(customFields).length > 0;
  const hasNotes = Boolean(guest.notes);
  const hasExpandableContent = hasCustomFields || hasNotes;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl border-2 p-3 sm:p-4 transition-all',
        guest.checked_in
          ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5'
          : 'border-border hover:border-primary/30 hover:shadow-md'
      )}
    >
      {/* Main row - always visible */}
      <div className="flex items-center gap-3">
        {/* Compact Avatar */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            guest.checked_in 
              ? 'bg-[hsl(var(--success))]' 
              : 'bg-gradient-to-br from-primary to-primary/80'
          )}
        >
          {guest.checked_in ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <User className="w-5 h-5 text-primary-foreground" />
          )}
        </div>

        {/* Core Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{fullName}</h3>
            {guest.ticket_type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex">
                {guest.ticket_type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {guest.email && (
              <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-[200px]">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{guest.email}</span>
              </span>
            )}
            {guest.phone && (
              <span className="flex items-center gap-1 hidden sm:flex">
                <Phone className="w-3 h-3" />
                {guest.phone}
              </span>
            )}
          </div>
          {guest.checked_in && guest.checked_in_at && (
            <p className="text-[10px] text-[hsl(var(--success))] mt-0.5 font-medium">
              ✓ {format(new Date(guest.checked_in_at), 'h:mm a')}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {guest.checked_in ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUndoCheckIn(guest.id)}
              disabled={isLoading}
              className="h-9 px-3 text-xs"
            >
              <Undo2 className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Undo</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onCheckIn(guest.id)}
              disabled={isLoading}
              className="h-9 px-3 text-xs bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
            >
              <Check className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Check In</span>
            </Button>
          )}
          
          {/* Expand toggle */}
          {hasExpandableContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 w-9 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile ticket type badge */}
      {guest.ticket_type && (
        <Badge variant="secondary" className="text-[10px] mt-2 sm:hidden">
          {guest.ticket_type}
        </Badge>
      )}

      {/* Expandable Section */}
      {isExpanded && hasExpandableContent && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          {/* Extra contact info on mobile */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:hidden">
            {guest.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {guest.phone}
              </span>
            )}
            {guest.ticket_number && (
              <span className="flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                {guest.ticket_number}
              </span>
            )}
          </div>

          {/* Notes */}
          {hasNotes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-2 italic">
              {guest.notes}
            </p>
          )}

          {/* Custom Fields - compact grid */}
          {hasCustomFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(customFields).map(([key, value]) => {
                if (!value) return null;
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                if (!displayValue) return null;
                return (
                  <div key={key} className="flex items-baseline gap-1.5 text-xs">
                    <span className="text-muted-foreground capitalize whitespace-nowrap">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-foreground truncate">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
