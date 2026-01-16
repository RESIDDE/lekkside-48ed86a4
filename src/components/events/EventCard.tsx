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
      className="block bg-card rounded-2xl border border-border p-5 sm:p-6 hover:border-primary/50 hover:shadow-lg transition-all group active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          
          <div className="mt-3 space-y-2">
            {event.date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0 text-primary/70" />
                <span>{format(new Date(event.date), 'PPP p')}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-primary/70" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-2 flex-shrink-0 text-primary/70" />
              <span>{checkedIn} / {total} checked in</span>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-foreground">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )}
        </div>

        <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}
