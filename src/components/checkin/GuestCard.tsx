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

export function GuestCard({ guest, onCheckIn, onUndoCheckIn, isLoading }: GuestCardProps) {
  const fullName = [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest';

  return (
    <div
      className={cn(
        'bg-card rounded-xl border p-4 sm:p-6 transition-all',
        guest.checked_in
          ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
          : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                guest.checked_in ? 'bg-green-500' : 'bg-primary'
              )}
            >
              {guest.checked_in ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
              {guest.ticket_type && (
                <Badge variant="secondary" className="mt-1">
                  {guest.ticket_type}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {guest.email && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{guest.email}</span>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{guest.phone}</span>
              </div>
            )}
            {guest.ticket_number && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Ticket className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{guest.ticket_number}</span>
              </div>
            )}
          </div>

          {guest.checked_in && guest.checked_in_at && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Checked in at {format(new Date(guest.checked_in_at), 'PPp')}
            </p>
          )}

          {guest.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              Note: {guest.notes}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          {guest.checked_in ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => onUndoCheckIn(guest.id)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Undo
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => onCheckIn(guest.id)}
              disabled={isLoading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Check In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
