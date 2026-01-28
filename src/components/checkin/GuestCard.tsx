import { memo } from 'react';
import { Check, Undo2, User, Mail, Phone, Ticket } from 'lucide-react';
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
  const fullName = [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest';

  return (
    <div
      className={cn(
        'bg-card rounded-2xl border-2 p-4 sm:p-5 transition-all',
        guest.checked_in
          ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5'
          : 'border-border hover:border-primary/30 hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div
          className={cn(
            'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm',
            guest.checked_in 
              ? 'bg-[hsl(var(--success))]' 
              : 'bg-gradient-to-br from-primary to-primary/80'
          )}
        >
          {guest.checked_in ? (
            <Check className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          ) : (
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-base sm:text-lg truncate">{fullName}</h3>
              {guest.ticket_type && (
                <Badge 
                  variant="secondary" 
                  className="mt-1.5 text-xs font-medium"
                >
                  {guest.ticket_type}
                </Badge>
              )}
            </div>

            {/* Desktop action button */}
            <div className="hidden sm:block flex-shrink-0">
              {guest.checked_in ? (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => onUndoCheckIn(guest.id)}
                  disabled={isLoading}
                  className="h-11"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </Button>
              ) : (
                <Button
                  size="default"
                  onClick={() => onCheckIn(guest.id)}
                  disabled={isLoading}
                  className="h-11 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white shadow-md shadow-[hsl(var(--success))]/25"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {guest.email && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-none">{guest.email}</span>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>{guest.phone}</span>
              </div>
            )}
            {guest.ticket_number && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Ticket className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>{guest.ticket_number}</span>
              </div>
            )}
          </div>

          {guest.checked_in && guest.checked_in_at && (
            <p className="text-xs text-[hsl(var(--success))] mt-2 font-medium">
              ✓ Checked in at {format(new Date(guest.checked_in_at), 'h:mm a')}
            </p>
          )}

          {guest.notes && (
            <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg px-3 py-2 italic">
              {guest.notes}
            </p>
          )}

          {/* Custom Fields */}
          {guest.custom_fields && Object.keys(guest.custom_fields as Record<string, unknown>).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(guest.custom_fields as Record<string, unknown>).map(([key, value]) => {
                if (!value) return null;
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                if (!displayValue) return null;
                return (
                  <div key={key} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground font-medium capitalize min-w-0">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-foreground break-words">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile action button - full width */}
      <div className="sm:hidden mt-4">
        {guest.checked_in ? (
          <Button
            variant="outline"
            onClick={() => onUndoCheckIn(guest.id)}
            disabled={isLoading}
            className="w-full h-12 text-base"
          >
            <Undo2 className="w-5 h-5 mr-2" />
            Undo Check-In
          </Button>
        ) : (
          <Button
            onClick={() => onCheckIn(guest.id)}
            disabled={isLoading}
            className="w-full h-12 text-base bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white shadow-md shadow-[hsl(var(--success))]/25"
          >
            <Check className="w-5 h-5 mr-2" />
            Check In
          </Button>
        )}
      </div>
    </div>
  );
});
