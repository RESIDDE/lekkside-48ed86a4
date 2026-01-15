import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { useGuestStats } from '@/hooks/useGuests';
import { Progress } from '@/components/ui/progress';

type Event = Tables<'events'>;

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const { total, checkedIn, percentage } = useGuestStats(event.id);

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-card rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          
          <div className="mt-3 space-y-2">
            {event.date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{format(new Date(event.date), 'PPP p')}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{checkedIn} / {total} guests checked in</span>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Check-in progress</span>
                <span className="font-medium text-foreground">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
      </div>
    </Link>
  );
}
